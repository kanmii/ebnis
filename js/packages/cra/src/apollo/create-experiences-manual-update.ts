import { DataProxy } from "@apollo/client";
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { toGetEntriesSuccessQuery } from "@eb/cm/src/graphql/utils.gql";
import { entryToEdge } from "../components/UpsertEntry/entry-to-edge";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import {
  OfflineIdToOnlineExperienceMap,
  SyncError,
  SyncErrors,
} from "../utils/sync-to-server.types";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceCompleteFragment,
  writeCachedEntriesDetailView,
  writeGetExperienceDetailViewQueryToCache,
} from "./get-detailed-experience-query";
import {
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";
import { upsertExperiencesInGetExperiencesMiniQuery } from "./update-get-experiences-list-view-query";

export function createExperiencesManualUpdate(
  _dataProxy: DataProxy,
  result: CreateExperiencesMutationResult,
  maybeSyncErrors?: SyncErrors,
) {
  const validResponses = result && result.data && result.data.createExperiences;

  if (!validResponses) {
    return undefined;
  }

  const offlineIdToOnlineExperienceMap: OfflineIdToOnlineExperienceMap = {};
  const syncErrors = maybeSyncErrors ? maybeSyncErrors : ({} as SyncErrors);

  const toBeInsertedOrReplaced = validResponses.reduce(
    (toBeInsertedAcc, response) => {
      // satisfy typescript
      // istanbul ignore next:
      if (!response) {
        return toBeInsertedAcc;
      }

      const syncError: SyncError = {};

      if (response.__typename === "ExperienceSuccess") {
        const {
          experience: newlyCreatedExperience,
          entries: entriesResult,
        } = response;

        const offlineErfahrungId = newlyCreatedExperience.clientId || "";
        const offlineExperience = readExperienceCompleteFragment(
          offlineErfahrungId,
        );
        const onlineExperienceId = newlyCreatedExperience.id;

        toBeInsertedAcc.push([onlineExperienceId, newlyCreatedExperience]);

        // fresh experience created directly online
        if (!offlineExperience) {
          return toBeInsertedAcc;
        }

        // following exist because of experience created offline now synced

        offlineIdToOnlineExperienceMap[
          offlineErfahrungId
        ] = newlyCreatedExperience;

        // kein Eintrag erstelltet mit Offline Erfahrung
        if (!entriesResult) {
          removeUnsyncedExperiences([offlineErfahrungId]);

          return toBeInsertedAcc;
        }

        const getEntries = getCachedEntriesDetailViewSuccess(
          offlineErfahrungId,
        );

        const beforeSyncEntriesEdges = getEntries.edges as EntryConnectionFragment_edges[];

        const [
          newlyCreatedEntriesEdges,
          clientIdToEntryErrorsMap,
        ] = entriesResult.reduce(
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

        const neueErstellteErfahrungEinträgeKanten: EntryConnectionFragment_edges[] = Array.from(
          {
            length: beforeSyncEntriesEdges.length,
          },
        );

        const entriesLeftOverForOfflineExperience: EntryConnectionFragment_edges[] = [];

        let syncedIndex = 0;

        const definitionClientIdToIdMap = newlyCreatedExperience.dataDefinitions.reduce(
          (definitionsAcc, d) => {
            const { id, clientId } = d;
            definitionsAcc[clientId as string] = id;

            return definitionsAcc;
          },
          {} as { [key: string]: string },
        );

        beforeSyncEntriesEdges.forEach((edge, index) => {
          const beforeSyncEntryNode = edge.node as EntryFragment;

          if (clientIdToEntryErrorsMap[beforeSyncEntryNode.id]) {
            const dataObjects = (beforeSyncEntryNode.dataObjects as DataObjectFragment[]).map(
              (dataObject) => {
                return {
                  ...dataObject,
                  definitionId:
                    definitionClientIdToIdMap[dataObject.definitionId],
                };
              },
            );

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
        );

        writeCachedEntriesDetailView(
          offlineErfahrungId,
          toGetEntriesSuccessQuery({
            ...getEntries,
            edges: entriesLeftOverForOfflineExperience,
          }),
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
    upsertExperiencesInGetExperiencesMiniQuery(toBeInsertedOrReplaced);

    return [syncErrors, offlineIdToOnlineExperienceMap];
  }

  return undefined;
}

// [offlineId, OnlineExperience]
type ToBeInsertedOrReplaced = [string, ExperienceCompleteFragment];
