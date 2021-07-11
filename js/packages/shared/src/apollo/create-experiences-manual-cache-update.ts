import { DataProxy } from "@apollo/client";
import { CreateEntryErrorFragment } from "@eb/shared/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import {
  entryToEdge,
  toGetEntriesSuccessQuery,
} from "@eb/shared/src/graphql/utils.gql";
import {
  OfflineIdToOnlineExperienceMap,
  SyncError,
  SyncErrors,
} from "@eb/shared/src/utils/types";
import { CreateExperiencesMutationResult } from "./create-experience-online-mutation-fn";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceDCFragment,
  writeCachedEntriesDetailView,
  writeGetExperienceDetailViewQueryToCache,
} from "./experience-detail-cache-utils";
import { upsertExperiencesInGetExperiencesListView } from "./experiences-list-cache-utils";
import {
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";

export function createExperiencesManualCacheUpdate(
  _dataProxy: DataProxy,
  result: CreateExperiencesMutationResult,
  maybeSyncErrors?: SyncErrors,
): CreateExperiencesManualCacheUpdateReturnType {
  let returnValue: CreateExperiencesManualCacheUpdateReturnType = undefined;

  const validResponses = result && result.data && result.data.createExperiences;

  // istanbul ignore next: satisfy typescript
  if (!validResponses) {
    return returnValue;
  }

  const offlineIdToOnlineExperienceMap: OfflineIdToOnlineExperienceMap = {};
  const syncErrors = maybeSyncErrors ? maybeSyncErrors : ({} as SyncErrors);

  // A fresh experience created online will be inserted
  // An offline experience synced will be replaced

  const toBeInsertedOrReplaced = validResponses.reduce(
    (toBeInsertedAcc, response) => {
      // istanbul ignore next: satisfy typescript
      if (!response) {
        return toBeInsertedAcc;
      }

      const syncError: SyncError = {};

      if (response.__typename === "ExperienceSuccess") {
        const { experience: newlyCreatedExperience, entries: entriesResult } =
          response;

        const offlineErfahrungId = newlyCreatedExperience.clientId || "";
        const offlineExperience = readExperienceDCFragment(offlineErfahrungId);
        const onlineExperienceId = newlyCreatedExperience.id;

        toBeInsertedAcc.push([onlineExperienceId, newlyCreatedExperience]);

        // fresh experience created directly online

        if (!offlineExperience) {
          return toBeInsertedAcc;
        }

        // following exists because of experience created offline now synced

        offlineIdToOnlineExperienceMap[offlineErfahrungId] =
          newlyCreatedExperience;

        // kein Eintrag erstelltet mit Offline Erfahrung

        if (!entriesResult) {
          removeUnsyncedExperiences([offlineErfahrungId]);

          return toBeInsertedAcc;
        }

        const getEntries =
          getCachedEntriesDetailViewSuccess(offlineErfahrungId);

        const beforeSyncEntriesEdges =
          getEntries.edges as EntryConnectionFragment_edges[];

        const [newlyCreatedEntriesEdges, clientIdToEntryErrorsMap] =
          entriesResult.reduce(
            ([edges, errors], result) => {
              if (result.__typename === "CreateEntrySuccess") {
                edges.push(entryToEdge(result.entry));
              } else {
                errors[result.errors.meta.clientId as string] = result.errors;
              }

              return [edges, errors];
            },
            [[], {}] as [
              EntryConnectionFragment_edges[],
              { [key: string]: CreateEntryErrorFragment },
            ],
          );

        const neueErstellteErfahrungEinträgeKanten: EntryConnectionFragment_edges[] =
          Array.from({
            length: beforeSyncEntriesEdges.length,
          });

        const entriesLeftOverForOfflineExperience: EntryConnectionFragment_edges[] =
          [];

        let syncedIndex = 0;

        const definitionClientIdToIdMap =
          newlyCreatedExperience.dataDefinitions.reduce((definitionsAcc, d) => {
            const { id, clientId } = d;
            definitionsAcc[clientId as string] = id;

            return definitionsAcc;
          }, {} as { [key: string]: string });

        beforeSyncEntriesEdges.forEach((edge, index) => {
          const beforeSyncEntryNode = edge.node as EntryFragment;

          if (clientIdToEntryErrorsMap[beforeSyncEntryNode.id]) {
            const dataObjects = (
              beforeSyncEntryNode.dataObjects as DataObjectFragment[]
            ).map((dataObject) => {
              return {
                ...dataObject,
                definitionId:
                  definitionClientIdToIdMap[dataObject.definitionId],
              };
            });

            const entryEdge = {
              ...edge,
              node: {
                ...beforeSyncEntryNode,
                experienceId: onlineExperienceId,
                dataObjects,
              },
            };

            neueErstellteErfahrungEinträgeKanten[index] = entryEdge;
          } else {
            neueErstellteErfahrungEinträgeKanten[index] =
              newlyCreatedEntriesEdges[syncedIndex++];

            entriesLeftOverForOfflineExperience.push(edge);
          }
        });

        writeGetExperienceDetailViewQueryToCache(newlyCreatedExperience);

        writeCachedEntriesDetailView(
          onlineExperienceId,
          toGetEntriesSuccessQuery({
            ...getEntries,
            edges: neueErstellteErfahrungEinträgeKanten,
          }),
          { replaceAll: true },
        );

        writeCachedEntriesDetailView(
          offlineErfahrungId,
          toGetEntriesSuccessQuery({
            ...getEntries,
            edges: entriesLeftOverForOfflineExperience,
          }),
          { replaceAll: true },
        );

        // Has entries errors
        if (Object.keys(clientIdToEntryErrorsMap).length) {
          syncError.createEntries = clientIdToEntryErrorsMap;
          syncErrors[onlineExperienceId] = syncError;

          writeUnsyncedExperience(onlineExperienceId, {
            newEntries: true,
          });
        }

        removeUnsyncedExperiences([offlineErfahrungId]);
      } else {
        const errors = response.errors;
        syncError.createExperience = errors;
        syncErrors[errors.meta.clientId as string] = syncError;
      }

      return toBeInsertedAcc;
    },
    [] as ToBeInsertedOrReplaced[],
  );

  if (toBeInsertedOrReplaced.length) {
    upsertExperiencesInGetExperiencesListView(toBeInsertedOrReplaced);

    returnValue = [syncErrors, offlineIdToOnlineExperienceMap];
  }

  return returnValue;
}

type NonEmptyReturn = [SyncErrors, OfflineIdToOnlineExperienceMap];
type CreateExperiencesManualCacheUpdateReturnType = NonEmptyReturn | undefined;

// [offlineId, OnlineExperience]
type ToBeInsertedOrReplaced = [string, ExperienceDCFragment];
