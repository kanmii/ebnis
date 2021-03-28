import { DataProxy } from "@apollo/client";
import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { DataDefinitionFragment } from "@eb/cm/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { GetEntriesUnionFragment_GetEntriesSuccess_entries } from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { UpdateExperienceFragment } from "@eb/cm/src/graphql/apollo-types/UpdateExperienceFragment";
import {
  UpdateExperienceSomeSuccessFragment_comments,
  UpdateExperienceSomeSuccessFragment_entries,
} from "@eb/cm/src/graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  entryToEdge,
  toGetEntriesSuccessQuery,
} from "@eb/cm/src/graphql/utils.gql";
import {
  IdToDefinitionUpdateSyncErrorMap,
  IdToUpdateDataObjectSyncErrorMap,
  IdToUpdateEntrySyncErrorMap,
  OfflineIdToCreateEntrySyncErrorMap,
  OfflineIdToOnlineEntryMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnlineExperienceUpdatedMap,
  SyncError,
  SyncErrors,
} from "@eb/cm/src/utils/types";
import immer, { Draft } from "immer";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import { UnsyncedModifiedExperience } from "../utils/unsynced-ledger.types";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceCompleteFragment,
  writeCachedEntriesDetailView,
  writeCachedExperienceCompleteFragment,
} from "./get-detailed-experience-query";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";

export function updateExperiencesManualCacheUpdate(
  _dataProxy: DataProxy,
  result: UpdateExperiencesOnlineMutationResult,
  maybeSyncErrors?: SyncErrors,
) {
  const updateExperiences =
    result && result.data && result.data.updateExperiences;

  if (!updateExperiences) {
    return;
  }

  const updatedIds: {
    [experienceId: string]: 1;
  } = {};

  const onlineExperienceToOfflineEntriesMap: OnlineExperienceIdToOfflineEntriesMap = {};
  const syncErrors = maybeSyncErrors ? maybeSyncErrors : ({} as SyncErrors);
  const onlineExperienceUpdatedMap: OnlineExperienceUpdatedMap = {};

  // istanbul ignore else
  if (updateExperiences.__typename === "UpdateExperiencesSomeSuccess") {
    for (const updateResult of updateExperiences.experiences) {
      // istanbul ignore else
      if (updateResult.__typename === "UpdateExperienceSomeSuccess") {
        const {
          experience: experienceResult,
          entries: entriesResult,
          comments: commentsResult,
        } = updateResult;
        const { experienceId } = experienceResult;
        let cachedExperience = readExperienceCompleteFragment(experienceId);

        // TODO: what if experience missing from cache
        // istanbul ignore next
        if (!cachedExperience) {
          continue;
        }

        cachedExperience = {
          ...cachedExperience,
        };

        onlineExperienceUpdatedMap[experienceId] = true;

        const getEntriesQuery: GetEntriesUnionFragment_GetEntriesSuccess_entries = getCachedEntriesDetailViewSuccess(
          experienceId,
        );

        let unsynced = (getUnsyncedExperience(experienceId) ||
          {}) as UnsyncedModifiedExperience;

        unsynced = {
          ...unsynced,
        };

        const syncError = {} as SyncError;

        const toBeModified: ToBeModified = [
          cachedExperience,
          unsynced,
          getEntriesQuery,
        ];

        const fromImmer = immer<ToBeModified>(
          toBeModified,
          (immerModifications) => {
            const [
              immerCachedExperience,
              immerUnsyncedLedger,
              immerGetEntriesQuery,
            ] = immerModifications;

            applyAndCleanUpOwnFields(
              immerCachedExperience,
              immerUnsyncedLedger,
              experienceResult,
              syncError,
            );

            applyAndCleanUpDefinitions(
              immerCachedExperience,
              immerUnsyncedLedger,
              experienceResult,
              syncError,
            );

            applyAndCleanUpEntryUpdates(
              immerGetEntriesQuery,
              immerUnsyncedLedger,
              entriesResult,
              syncError,
            );

            const offlineIdToOnlineEntryMap: OfflineIdToOnlineEntryMap = {};

            applyAndCleanUpEntryInserts(
              immerGetEntriesQuery,
              immerUnsyncedLedger,
              entriesResult,
              syncError,
              offlineIdToOnlineEntryMap,
            );

            applyAndCleanUpEntryDeletes(
              immerGetEntriesQuery,
              immerUnsyncedLedger,
              entriesResult,
            );

            applyAndCleanUpCommentInserts(
              immerCachedExperience,
              commentsResult,
            );

            if (Object.keys(offlineIdToOnlineEntryMap).length) {
              onlineExperienceToOfflineEntriesMap[
                experienceId
              ] = offlineIdToOnlineEntryMap;
            }

            if (Object.keys(syncError).length) {
              syncErrors[experienceId] = syncError;
            }
          },
        );

        const [
          updatedExperience,
          updatedUnsyncedExperience,
          updatedGetEntriesQuery,
        ] = fromImmer;

        updatedIds[updatedExperience.id] = 1;
        writeCachedExperienceCompleteFragment(updatedExperience);

        writeCachedEntriesDetailView(
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

  return [
    onlineExperienceToOfflineEntriesMap,
    syncErrors,
    onlineExperienceUpdatedMap,
  ];
}

function applyAndCleanUpOwnFields(
  cachedExperience: ExperienceDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  { ownFields }: UpdateExperienceFragment,
  syncError: Draft<SyncError>,
) {
  if (!ownFields) {
    return;
  }

  if (ownFields.__typename === "ExperienceOwnFieldsSuccess") {
    const { title, description } = ownFields.data;
    cachedExperience.title = title;
    cachedExperience.description = description;
    delete unsynced.ownFields;
    delete syncError.ownFields;
  } else {
    syncError.ownFields = ownFields.errors;
  }
}

function applyAndCleanUpDefinitions(
  cachedExperience: ExperienceDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  { updatedDefinitions }: UpdateExperienceFragment,
  syncError: Draft<SyncError>,
) {
  if (!updatedDefinitions) {
    return;
  }
  const unsyncedDefinitions = unsynced.definitions || {};
  let hasSuccess = false;
  const errorsMap: IdToDefinitionUpdateSyncErrorMap = {};

  const updates = updatedDefinitions.reduce((acc, update) => {
    if (update.__typename === "DefinitionSuccess") {
      hasSuccess = true;
      const { definition } = update;
      const { id } = definition;
      acc[id] = definition;
      delete unsyncedDefinitions[id];
    } else {
      const errors = update.errors;
      errorsMap[errors.id] = errors;
    }

    return acc;
  }, {} as IdToDataDefinition);

  if (hasSuccess) {
    // istanbul ignore else
    if (!Object.keys(unsyncedDefinitions).length) {
      delete unsynced.definitions;
    }

    cachedExperience.dataDefinitions = cachedExperience.dataDefinitions.map(
      (definition) => {
        const { id } = definition;
        const update = updates[id];
        return update ? update : definition;
      },
    );
  }

  if (Object.keys(errorsMap).length) {
    syncError.definitions = errorsMap;
  }
}

function applyAndCleanUpEntryUpdates(
  proxy: GetEntriesQueryDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  result: UpdateExperienceSomeSuccessFragment_entries | null,
  syncError: Draft<SyncError>,
) {
  const updatedEntries = result && result.updatedEntries;

  if (!updatedEntries) {
    return;
  }

  const unsyncedModifiedEntriesLedger =
    unsynced.modifiedEntries ||
    // istanbul ignore next:
    {};

  const errorsMap: IdToUpdateEntrySyncErrorMap = {};

  const updatesMap = updatedEntries.reduce(
    (entryIdToDataObjectMapAcc, update) => {
      if (update.__typename === "UpdateEntrySomeSuccess") {
        const { entryId, dataObjects } = update.entry;
        const modifiedEntryLedger =
          unsyncedModifiedEntriesLedger[entryId] ||
          // istanbul ignore next:
          {};

        const dataObjectErrorsMap: IdToUpdateDataObjectSyncErrorMap = {};

        const dataObjectUpdates = dataObjects.reduce((dataObjectsAcc, data) => {
          if (data.__typename === "DataObjectSuccess") {
            const { dataObject } = data;
            const { id } = dataObject;
            dataObjectsAcc[id] = dataObject;
            delete modifiedEntryLedger[id];
          } else {
            const errors = data.errors;
            dataObjectErrorsMap[errors.meta.id as string] = errors;
          }

          return dataObjectsAcc;
        }, {} as IdToDataObjectMap);

        // has updates
        // istanbul ignore else
        if (Object.keys(dataObjectUpdates).length) {
          entryIdToDataObjectMapAcc[entryId] = dataObjectUpdates;
        }

        // has errors
        if (Object.keys(dataObjectErrorsMap).length) {
          errorsMap[entryId] = dataObjectErrorsMap;
        } else {
          // no errors
          delete unsyncedModifiedEntriesLedger[entryId];
        }
      } else {
        const errors = update.errors;
        errorsMap[errors.entryId] = errors.error;
      }

      return entryIdToDataObjectMapAcc;
    },
    {} as EntryIdToDataObjectMap,
  );

  // has updates
  if (Object.keys(updatesMap).length) {
    // no errors
    if (!Object.keys(unsyncedModifiedEntriesLedger).length) {
      delete unsynced.modifiedEntries;
    } else {
      // has errors
      syncError.updateEntries = errorsMap;
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

function applyAndCleanUpEntryInserts(
  proxy: GetEntriesQueryDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  result: UpdateExperienceSomeSuccessFragment_entries | null,
  syncError: Draft<SyncError>,
  offlineIdToEntryMap: OfflineIdToOnlineEntryMap,
) {
  const newEntries = result && result.newEntries;

  if (!newEntries) {
    return;
  }

  const errorsMap: OfflineIdToCreateEntrySyncErrorMap = {};

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
      } else {
        // brand new entry
        brandNewEntries.push(entry);
      }
    } else {
      const errors = update.errors;
      const clientId = errors.meta.clientId;

      // istanbul ignore else
      if (clientId) {
        errorsMap[clientId] = errors;
      }
    }
  });

  if (Object.keys(errorsMap).length) {
    syncError.createEntries = errorsMap;
  } else {
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

function applyAndCleanUpEntryDeletes(
  proxy: GetEntriesQueryDraft,
  unsynced: DraftUnsyncedModifiedExperience,
  result: UpdateExperienceSomeSuccessFragment_entries | null,
) {
  const deletedEntries = result && result.deletedEntries;

  if (!deletedEntries) {
    return;
  }

  const unsyncedDeletedEntries = (
    unsynced.deletedEntries || ([] as string[])
  ).reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {} as { [key: string]: true });

  let hasDeletes = false;
  const idToEntryDeleted = {} as {
    [entryId: string]: true;
  };

  deletedEntries.forEach((update) => {
    if (update.__typename === "DeleteEntrySuccess") {
      const { entry } = update;
      const { id } = entry;
      hasDeletes = true;
      idToEntryDeleted[id] = true;
      delete unsyncedDeletedEntries[id];
    } else {
      // TODO: handle errors
      // const {error, id} = update.errors
    }
  });

  if (hasDeletes) {
    proxy.edges = (proxy.edges as EntryConnectionFragment_edges[]).filter(
      (edge) => {
        return !idToEntryDeleted[(edge.node as EntryFragment).id];
      },
    );

    if (Object.keys(unsyncedDeletedEntries)) {
      unsynced.deletedEntries = Object.keys(unsyncedDeletedEntries);
    } else {
      delete unsynced.deletedEntries;
    }
  }
}

function applyAndCleanUpCommentInserts(
  cachedExperience: ExperienceDraft,
  result: UpdateExperienceSomeSuccessFragment_comments | null,
) {
  const inserts = result && result.inserts;

  // istanbul ignore next:
  if (!inserts) {
    return;
  }

  const successfulComments: CommentFragment[] = [];

  inserts.forEach((insert) => {
    switch (insert.__typename) {
      case "CommentSuccess":
        successfulComments.push(insert.comment);
        break;
    }
  });

  const cachedComments = (cachedExperience.comments ||
    // istanbul ignore next:
    []) as CommentFragment[];

  cachedExperience.comments = successfulComments.concat(cachedComments);
}

type ExperienceDraft = Draft<ExperienceCompleteFragment>;
type GetEntriesQueryDraft = Draft<GetEntriesUnionFragment_GetEntriesSuccess_entries>;
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

type ToBeModified = [
  ExperienceCompleteFragment,
  UnsyncedModifiedExperience,
  GetEntriesUnionFragment_GetEntriesSuccess_entries,
];
