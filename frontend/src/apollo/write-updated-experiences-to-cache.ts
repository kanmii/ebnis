import { DataProxy } from "apollo-cache";
import immer, { Draft } from "immer";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import { readExperienceFragment } from "./read-experience-fragment";
import { UpdateExperienceFragment } from "../graphql/apollo-types/UpdateExperienceFragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { writeExperienceFragmentToCache } from "./write-experience-fragment";
import { UnsyncedModifiedExperience } from "../utils/unsynced-ledger.types";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import { DataDefinitionFragment } from "../graphql/apollo-types/DataDefinitionFragment";
import {
  getUnsyncedExperience,
  removeUnsyncedExperience,
  writeUnsyncedExperience,
} from "./unsynced-ledger";
import { EntryConnectionFragment_edges } from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";

const StateValue = {
  ownFieldsCleanUp: "clean-up-own-fields" as OwnFieldsCleanUp,
  ownFieldsNoCleanUp: "no-clean-up-own-fields" as OwnFieldsNoCleanUp,
  newEntriesCleanUp: "clean-up-new-entries" as NewEntriesCleanUp,
  newEntriesNoCleanUp: "no-clean-up-new-entries" as NewEntriesNoCleanUp,
} as const;

export function writeUpdatedExperienceToCache(onDone?: () => void) {
  return function updateExperiencesInCacheInner(
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

    // istanbul ignore else
    if (updateExperiences.__typename === "UpdateExperiencesSomeSuccess") {
      for (const updateResult of updateExperiences.experiences) {
        // istanbul ignore else
        if (updateResult.__typename === "UpdateExperienceSomeSuccess") {
          const result = updateResult.experience;
          const { experienceId } = updateResult.experience;
          const experience = readExperienceFragment(experienceId);

          // istanbul ignore next
          if (!experience) {
            continue;
          }

          const updatedExperience = immer(experience, (proxy) => {
            const ownFieldsCleanUp = ownFieldsApplyUpdatesAndGetCleanUpData(
              proxy,
              result,
            );

            const dataDefinitionsCleanUp = definitionsApplyUpdatesAndGetCleanUpData(
              proxy,
              result,
            );

            const newEntriesCleanUp = newEntriesApplyUpdatesAndGetCleanUpData(
              proxy,
              result,
            );

            const updatedEntriesCleanUp = updatedEntriesApplyUpdatesAndGetCleanUpData(
              proxy,
              result,
            );

            const unsynced = getUnsyncedExperience(
              experienceId,
            ) as UnsyncedModifiedExperience;

            if (unsynced) {
              const updatedUnsynced = updateUnSyncedLedger(unsynced, [
                ownFieldsCleanUp,
                dataDefinitionsCleanUp,
                newEntriesCleanUp,
                updatedEntriesCleanUp,
              ]);

              if (!Object.keys(updatedUnsynced).length) {
                removeUnsyncedExperience(experienceId);
              } else {
                writeUnsyncedExperience(experienceId, updatedUnsynced);
              }
            }
          });

          updatedIds[updatedExperience.id] = 1;
          writeExperienceFragmentToCache(updatedExperience);
        }
      }
    }
  };
}

function ownFieldsApplyUpdatesAndGetCleanUpData(
  proxy: DraftState,
  { ownFields }: UpdateExperienceFragment,
): ShouldCleanUpOwnFields {
  if (!ownFields) {
    return StateValue.ownFieldsNoCleanUp;
  }

  // istanbul ignore else
  if (ownFields.__typename === "ExperienceOwnFieldsSuccess") {
    const { title, description } = ownFields.data;
    proxy.title = title;
    proxy.description = description;
    return StateValue.ownFieldsCleanUp;
  } else {
    return StateValue.ownFieldsNoCleanUp;
  }
}

function definitionsApplyUpdatesAndGetCleanUpData(
  proxy: DraftState,
  { updatedDefinitions }: UpdateExperienceFragment,
): string[] {
  if (!updatedDefinitions) {
    return [];
  }

  let hasSuccess = false;
  const definitionsIdsToCleanUp: string[] = [];

  const updates = updatedDefinitions.reduce((acc, update) => {
    if (update.__typename === "DefinitionSuccess") {
      hasSuccess = true;
      const { definition } = update;
      const { id } = definition;
      acc[id] = definition;
      definitionsIdsToCleanUp.push(id);
    }
    return acc;
  }, {} as IdToDataDefinition);

  if (hasSuccess) {
    proxy.dataDefinitions = proxy.dataDefinitions.map((definition) => {
      const { id } = definition;
      const update = updates[id];
      return update ? update : definition;
    });
  }

  return definitionsIdsToCleanUp;
}

function updatedEntriesApplyUpdatesAndGetCleanUpData(
  proxy: DraftState,
  { updatedEntries }: UpdateExperienceFragment,
): UpdatedEntriesCleanUp {
  const idsToCleanUp: UpdatedEntriesCleanUp = [];

  if (!updatedEntries) {
    return idsToCleanUp;
  }

  const updatesMap = updatedEntries.reduce((entriesIdsAcc, update) => {
    if (update.__typename === "UpdateEntrySomeSuccess") {
      const { entryId, dataObjects } = update.entry;

      const [dataObjectsIdsToCleanUp, dataObjectUpdates] = dataObjects.reduce(
        (dataObjectsAcc, data) => {
          const [dataObjectsIdsToCleanUp, dataObjectUpdates] = dataObjectsAcc;

          // istanbul ignore else
          if (data.__typename === "DataObjectSuccess") {
            const { dataObject } = data;
            const { id } = dataObject;
            dataObjectUpdates[id] = dataObject;
            dataObjectsIdsToCleanUp.push(id);
          }

          return dataObjectsAcc;
        },
        [[], {}] as [string[], IdToDataObjectMap],
      );

      // istanbul ignore else
      if (dataObjectsIdsToCleanUp.length) {
        entriesIdsAcc[entryId] = dataObjectUpdates;
        idsToCleanUp.push([entryId, ...dataObjectsIdsToCleanUp]);
      }
    }

    return entriesIdsAcc;
  }, {} as EntryIdToDataObjectMap);

  if (idsToCleanUp.length) {
    (proxy.entries.edges as EntryConnectionFragment_edges[]).forEach((e) => {
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

  return idsToCleanUp;
}

function newEntriesApplyUpdatesAndGetCleanUpData(
  proxy: DraftState,
  { newEntries }: UpdateExperienceFragment,
): ShouldCleanUpNewEntries {
  if (!newEntries) {
    return StateValue.newEntriesNoCleanUp;
  }

  let hasOfflineSyncedEntryError = false;
  let hasUpdates = false;
  const brandNewEntries: EntryFragment[] = [];
  const offlineSyncedEntries: IdToOfflineEntrySynced = {};

  newEntries.forEach((update) => {
    if (update.__typename === "CreateEntrySuccess") {
      const { entry } = update;
      const { clientId } = entry;
      hasUpdates = true;

      if (clientId) {
        // offline synced
        offlineSyncedEntries[clientId] = entry;
      } else {
        // brand new entry
        brandNewEntries.push(entry);
      }
    } else {
      const clientId =
        update.errors && update.errors.meta && update.errors.meta.clientId;

      // istanbul ignore else
      if (clientId) {
        // offline synced
        hasOfflineSyncedEntryError = true;
      }
    }
  });

  const isOfflineEntrySynced = Object.keys(offlineSyncedEntries).length !== 0;

  if (hasUpdates) {
    const edges = proxy.entries.edges as EntryConnectionFragment_edges[];

    if (isOfflineEntrySynced) {
      edges.forEach((edge) => {
        const node = edge.node as EntryFragment;
        const newEntry = offlineSyncedEntries[node.id];
        // istanbul ignore else
        if (newEntry) {
          edge.node = newEntry;
        }
      });
    }

    proxy.entries.edges = brandNewEntries
      .map((entry) => entryToEdge(entry))
      .concat(edges);
  }

  const shouldCleanUp = hasOfflineSyncedEntryError
    ? StateValue.newEntriesNoCleanUp // errors! we can't clean up
    : isOfflineEntrySynced
    ? StateValue.newEntriesCleanUp // all synced, we *must* clean up
    : StateValue.newEntriesNoCleanUp; // nothing synced, no errors

  return shouldCleanUp;
}

function updateUnSyncedLedger(
  unsynced: UnsyncedModifiedExperience,
  [
    shouldCleanUpOwnFields,
    definitionsIdsToCleanUp,
    shouldCleanUpNewEntries,
    entryIdDataObjectsIdsToCleanUp,
  ]: CleanUpData,
) {
  if (shouldCleanUpOwnFields === StateValue.ownFieldsCleanUp) {
    delete unsynced.ownFields;
  }

  if (definitionsIdsToCleanUp.length) {
    const unsyncedDefinitions = unsynced.definitions;
    // istanbul ignore else
    if (unsyncedDefinitions) {
      definitionsIdsToCleanUp.forEach((id) => {
        delete unsyncedDefinitions[id];
      });

      // istanbul ignore else
      if (!Object.keys(unsyncedDefinitions).length) {
        delete unsynced.definitions;
      }
    }
  }

  if (shouldCleanUpNewEntries === StateValue.newEntriesCleanUp) {
    delete unsynced.newEntries;
  }

  if (entryIdDataObjectsIdsToCleanUp.length) {
    const { modifiedEntries: unsyncedEntries } = unsynced;

    // istanbul ignore else
    if (unsyncedEntries) {
      entryIdDataObjectsIdsToCleanUp.forEach(
        ([entryId, ...dataObjectsIdsToCleanUp]) => {
          const unsyncedEntry = unsyncedEntries[entryId];

          // istanbul ignore else
          if (unsyncedEntry) {
            dataObjectsIdsToCleanUp.forEach((dataId) => {
              delete unsyncedEntry[dataId];
            });

            // istanbul ignore else
            if (!Object.keys(unsyncedEntry).length) {
              delete unsyncedEntries[entryId];
            }
          }
        },
      );

      // istanbul ignore else
      if (!Object.keys(unsyncedEntries).length) {
        delete unsynced.modifiedEntries;
      }
    }
  }

  return unsynced;
}

type DraftState = Draft<ExperienceFragment>;
type ShouldCleanUpOwnFields = OwnFieldsCleanUp | OwnFieldsNoCleanUp;
type ShouldCleanUpNewEntries = NewEntriesCleanUp | NewEntriesNoCleanUp;
type UpdatedEntriesCleanUp = string[][];

type OwnFieldsCleanUp = "clean-up-own-fields";
type OwnFieldsNoCleanUp = "no-clean-up-own-fields";
type NewEntriesCleanUp = "clean-up-new-entries";
type NewEntriesNoCleanUp = "no-clean-up=new-entries";
type DataDefinitionsIdsToCleanUp = string[];
type DefinitionsUpdatesAndCleanUp = [IdToDataDefinition | null, string[]];

export type CleanUpData = [
  ShouldCleanUpOwnFields,
  DataDefinitionsIdsToCleanUp,
  ShouldCleanUpNewEntries,
  UpdatedEntriesCleanUp,
];

interface IdToDataObjectMap {
  [dataObjectId: string]: DataObjectFragment;
}

interface IdToDataDefinition {
  [definitionId: string]: DataDefinitionFragment;
}

interface EntryIdToDataObjectMap {
  [entryId: string]: IdToDataObjectMap;
}

interface IdToOfflineEntrySynced {
  [clientId: string]: EntryFragment;
}
