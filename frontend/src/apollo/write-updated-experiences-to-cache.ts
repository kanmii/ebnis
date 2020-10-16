import { DataProxy } from "@apollo/client";
import immer, { Draft } from "immer";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import { UpdateExperienceFragment } from "../graphql/apollo-types/UpdateExperienceFragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { UnsyncedModifiedExperience } from "../utils/unsynced-ledger.types";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import { DataDefinitionFragment } from "../graphql/apollo-types/DataDefinitionFragment";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";
import { EntryConnectionFragment_edges } from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";
import { UpdateExperienceSomeSuccessFragment_entries } from "../graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
  writeExperienceFragmentToCache,
  readExperienceFragment,
} from "./get-detailed-experience-query";
import { GetEntriesUnionFragment_GetEntriesSuccess_entries } from "../graphql/apollo-types/GetEntriesUnionFragment";
import { toGetEntriesSuccessQuery } from "../graphql/utils.gql";

export function writeUpdatedExperienceToCache(
  dataProxy: DataProxy,
  result: UpdateExperiencesOnlineMutationResult,
) {
  const updateExperiences =
    result && result.data && result.data.updateExperiences;

  if (!updateExperiences) {
    return;
  }

  const updatedIds: {
    [experienceId: string]: 1;
  } = {};

  const offlineIdToEntryMap: OfflineIdToEntryMap = {};

  // istanbul ignore else
  if (updateExperiences.__typename === "UpdateExperiencesSomeSuccess") {
    for (const updateResult of updateExperiences.experiences) {
      // istanbul ignore else
      if (updateResult.__typename === "UpdateExperienceSomeSuccess") {
        const {
          experience: experienceResult,
          entries: entriesResult,
        } = updateResult;
        const { experienceId } = experienceResult;
        const experience = readExperienceFragment(experienceId);

        // istanbul ignore next
        if (!experience) {
          continue;
        }

        const getEntriesQuery: GetEntriesUnionFragment_GetEntriesSuccess_entries = getEntriesQuerySuccess(
          experienceId,
        );

        const unsynced = (getUnsyncedExperience(experienceId) ||
          {}) as UnsyncedModifiedExperience;

        const toBeModified: ToBeModified = [
          experience,
          unsynced,
          getEntriesQuery,
        ];

        const modified = immer<ToBeModified>(toBeModified, (modifications) => {
          const [
            experienceProxy,
            unsyncedExperienceProxy,
            getEntriesQueryProxy,
          ] = modifications;

          ownFieldsApplyUpdatesAndCleanUpUnsyncedData(
            experienceProxy,
            unsyncedExperienceProxy,
            experienceResult,
          );

          definitionsApplyUpdatesAndCleanUpUnsyncedData(
            experienceProxy,
            unsyncedExperienceProxy,
            experienceResult,
          );

          applyNewEntriesUpdateAndCleanUpUnsyncedData(
            getEntriesQueryProxy,
            unsyncedExperienceProxy,
            entriesResult,
            offlineIdToEntryMap,
          );

          applyUpdatedEntriesAndCleanUpUnsyncedData(
            getEntriesQueryProxy,
            unsyncedExperienceProxy,
            entriesResult,
          );

          const entriesErrors = unsyncedExperienceProxy.entriesErrors;

          if (entriesErrors && !Object.keys(entriesErrors).length) {
            delete unsyncedExperienceProxy.entriesErrors;
          }
        });

        const [
          updatedExperience,
          updatedUnsyncedExperience,
          updatedGetEntriesQuery,
        ] = modified;

        updatedIds[updatedExperience.id] = 1;
        writeExperienceFragmentToCache(updatedExperience);

        writeGetEntriesQuery(
          experienceId,
          toGetEntriesSuccessQuery(updatedGetEntriesQuery),
        );

        if (!Object.keys(updatedUnsyncedExperience).length) {
          removeUnsyncedExperiences([experienceId]);
        } else {
          writeUnsyncedExperience(experienceId, updatedUnsyncedExperience);
        }
      }
    }
  }

  return offlineIdToEntryMap;
}

function ownFieldsApplyUpdatesAndCleanUpUnsyncedData(
  proxy: ExperienceDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  { ownFields }: UpdateExperienceFragment,
) {
  if (!ownFields) {
    return;
  }

  // istanbul ignore else
  if (ownFields.__typename === "ExperienceOwnFieldsSuccess") {
    const { title, description } = ownFields.data;
    proxy.title = title;
    proxy.description = description;
    delete unsynced.ownFields;
  }
}

function definitionsApplyUpdatesAndCleanUpUnsyncedData(
  proxy: ExperienceDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  { updatedDefinitions }: UpdateExperienceFragment,
) {
  if (!updatedDefinitions) {
    return;
  }

  const unsyncedDefinitions = unsynced.definitions || {};
  let hasSuccess = false;

  const updates = updatedDefinitions.reduce((acc, update) => {
    if (update.__typename === "DefinitionSuccess") {
      hasSuccess = true;
      const { definition } = update;
      const { id } = definition;
      acc[id] = definition;
      delete unsyncedDefinitions[id];
    }
    return acc;
  }, {} as IdToDataDefinition);

  if (hasSuccess) {
    // istanbul ignore else
    if (!Object.keys(unsyncedDefinitions).length) {
      delete unsynced.definitions;
    }

    proxy.dataDefinitions = proxy.dataDefinitions.map((definition) => {
      const { id } = definition;
      const update = updates[id];
      return update ? update : definition;
    });
  }
}

function applyUpdatedEntriesAndCleanUpUnsyncedData(
  proxy: GetEntriesQueryDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  result: UpdateExperienceSomeSuccessFragment_entries | null,
) {
  const updatedEntries = result && result.updatedEntries;

  if (!updatedEntries) {
    return;
  }

  let hasAllUpdates = false;
  const modifiedEntries = unsynced.modifiedEntries || {};

  const updatesMap = updatedEntries.reduce(
    (entryIdToDataObjectMapAcc, update) => {
      if (update.__typename === "UpdateEntrySomeSuccess") {
        const { entryId, dataObjects } = update.entry;
        const modifiedEntry = modifiedEntries[entryId] || {};
        let hasSingleUpdate = false;

        const dataObjectUpdates = dataObjects.reduce((dataObjectsAcc, data) => {
          // istanbul ignore else
          if (data.__typename === "DataObjectSuccess") {
            const { dataObject } = data;
            const { id } = dataObject;
            dataObjectsAcc[id] = dataObject;
            hasAllUpdates = true;
            hasSingleUpdate = true;
            delete modifiedEntry[id];
          }

          return dataObjectsAcc;
        }, {} as IdToDataObjectMap);

        // istanbul ignore else
        if (hasSingleUpdate) {
          entryIdToDataObjectMapAcc[entryId] = dataObjectUpdates;

          if (!Object.keys(modifiedEntry).length) {
            delete modifiedEntries[entryId];
          }
        }
      } else {
        // we have got an update entry error - so we write it to cache. The
        // challenge is that we'd like to use a singe error schema for both
        // new and modifiedEntry errors
        // const x = update.errors;
      }

      return entryIdToDataObjectMapAcc;
    },
    {} as EntryIdToDataObjectMap,
  );

  if (hasAllUpdates) {
    if (!Object.keys(modifiedEntries).length) {
      delete unsynced.modifiedEntries;
    }

    (proxy.edges as EntryConnectionFragment_edges[]).forEach((e) => {
      const edge = e as EntryConnectionFragment_edges;
      const node = edge.node as EntryFragment;
      const { id: entryId } = node;
      const idToUpdatedDataObjectMap = updatesMap[entryId];

      if (idToUpdatedDataObjectMap) {
        node.dataObjects = node.dataObjects.map((d) => {
          const dataObject = d as DataObjectFragment;
          const { id } = dataObject;
          const updatedDataObject = idToUpdatedDataObjectMap[id];
          return updatedDataObject || dataObject;
        });
      }
    });
  }
}

function applyNewEntriesUpdateAndCleanUpUnsyncedData(
  proxy: GetEntriesQueryDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  result: UpdateExperienceSomeSuccessFragment_entries | null,
  offlineIdToEntryMap: OfflineIdToEntryMap,
) {
  const newEntries = result && result.newEntries;

  if (!newEntries) {
    return;
  }

  const entriesErrors = unsynced.entriesErrors || {};
  let hasOfflineSyncedEntryError = false;
  let hasUpdates = false;
  const brandNewEntries: EntryFragment[] = [];

  newEntries.forEach((update) => {
    if (update.__typename === "CreateEntrySuccess") {
      const { entry } = update;
      const { clientId } = entry;
      hasUpdates = true;

      if (clientId) {
        // offline synced
        offlineIdToEntryMap[clientId] = entry;
        delete entriesErrors[clientId];
      } else {
        // brand new entry
        brandNewEntries.push(entry);
      }
    } else {
      const clientIdErrorIndicator =
        update.errors && update.errors.meta && update.errors.meta.clientId;

      // istanbul ignore else
      if (clientIdErrorIndicator) {
        // offline synced
        hasOfflineSyncedEntryError = true;
      }
    }
  });

  if (!hasOfflineSyncedEntryError) {
    delete unsynced.newEntries;
  }

  const isOfflineEntrySynced = Object.keys(offlineIdToEntryMap).length !== 0;

  if (hasUpdates) {
    const edges = proxy.edges as EntryConnectionFragment_edges[];

    if (isOfflineEntrySynced) {
      edges.forEach((edge) => {
        const node = edge.node as EntryFragment;
        const newEntry = offlineIdToEntryMap[node.id];
        // istanbul ignore else
        if (newEntry) {
          edge.node = newEntry;
        }
      });
    }

    proxy.edges = brandNewEntries
      .map((entry) => entryToEdge(entry))
      .concat(edges);
  }

  return offlineIdToEntryMap;
}

type ExperienceDraft = Draft<ExperienceFragment>;
type GetEntriesQueryDraft = Draft<
  GetEntriesUnionFragment_GetEntriesSuccess_entries
>;
type DraftUnsyncedModifiedExperience = Draft<UnsyncedModifiedExperience>;

interface IdToDataObjectMap {
  [dataObjectId: string]: DataObjectFragment;
}

interface IdToDataDefinition {
  [definitionId: string]: DataDefinitionFragment;
}

interface EntryIdToDataObjectMap {
  [entryId: string]: IdToDataObjectMap;
}

export interface OfflineIdToEntryMap {
  [clientId: string]: EntryFragment;
}

type ToBeModified = [
  ExperienceFragment,
  UnsyncedModifiedExperience,
  GetEntriesUnionFragment_GetEntriesSuccess_entries,
];
