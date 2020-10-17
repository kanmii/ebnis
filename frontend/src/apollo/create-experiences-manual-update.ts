import { DataProxy } from "@apollo/client";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { insertReplaceRemoveExperiencesInGetExperiencesMiniQuery } from "./update-get-experiences-mini-query";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "../graphql/apollo-types/EntryConnectionFragment";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";
import {
  getEntriesQuerySuccess,
  readExperienceFragment,
  writeGetEntriesQuery,
  writeGetExperienceQueryToCache,
} from "./get-detailed-experience-query";
import { toGetEntriesSuccessQuery } from "../graphql/utils.gql";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import {
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";
import {
  OfflineIdToOnlineExperienceMap,
  SyncErrors,
  SyncError,
} from "../utils/sync-to-server.types";

export function createExperiencesManualUpdate(
  dataProxy: DataProxy,
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
    (toBeInsertedOrReplacedAcc, response) => {
      // satisfy typescript
      // istanbul ignore next:
      if (!response) {
        return toBeInsertedOrReplacedAcc;
      }

      const syncError: SyncError = {};
      let syncErrorId = "";

      if (response.__typename === "ExperienceSuccess") {
        const {
          experience: newlyCreatedExperience,
          entries: entriesResult,
        } = response;

        const offlineErfahrungId = newlyCreatedExperience.clientId || "";
        const offlineExperience = readExperienceFragment(offlineErfahrungId);
        const onlineExperienceId = newlyCreatedExperience.id;

        toBeInsertedOrReplacedAcc.push([
          newlyCreatedExperience.id,
          newlyCreatedExperience,
        ]);

        // fresh experience created directly online
        if (!offlineExperience) {
          return toBeInsertedOrReplacedAcc;
        }

        // following exist bcos of experience created offline now synced

        syncError.offlineExperienceId = offlineErfahrungId;

        offlineIdToOnlineExperienceMap[
          offlineErfahrungId
        ] = newlyCreatedExperience;

        // kein Eintrag erstelltet mit Offline Erfahrung
        if (!entriesResult) {
          removeUnsyncedExperiences([offlineErfahrungId]);
          return toBeInsertedOrReplacedAcc;
        }

        syncErrorId = onlineExperienceId;

        const getEntries = getEntriesQuerySuccess(offlineErfahrungId);

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
              (dataObject, dataObjectIndex) => {
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

        toBeInsertedOrReplacedAcc.push([
          offlineErfahrungId,
          newlyCreatedExperience,
        ]);

        writeGetExperienceQueryToCache(newlyCreatedExperience);

        writeGetEntriesQuery(
          onlineExperienceId,
          toGetEntriesSuccessQuery({
            ...getEntries,
            edges: neueErstellteErfahrungEinträgeKanten,
          }),
        );

        writeGetEntriesQuery(
          offlineErfahrungId,
          toGetEntriesSuccessQuery({
            ...getEntries,
            edges: entriesLeftOverForOfflineExperience,
          }),
        );

        // Has entries errors
        if (Object.keys(clientIdToEntryErrorsMap).length) {
          syncError.createEntries = clientIdToEntryErrorsMap;

          writeUnsyncedExperience(onlineExperienceId, {
            newEntries: true,
          });
        }

        removeUnsyncedExperiences([offlineErfahrungId]);
      } else {
        const errors = response.errors;
        syncError.createExperience = errors;
        syncErrorId = errors.meta.clientId as string;
      }

      if (Object.keys(syncError).length) {
        syncErrors[syncErrorId] = syncError;
      }

      return toBeInsertedOrReplacedAcc;
    },
    [] as ToBeInsertedOrReplaced[],
  );

  if (toBeInsertedOrReplaced.length) {
    insertReplaceRemoveExperiencesInGetExperiencesMiniQuery(
      toBeInsertedOrReplaced,
    );

    return [syncErrors, offlineIdToOnlineExperienceMap];
  }

  return undefined;
}

// [offlineId, OnlineExperience]
type ToBeInsertedOrReplaced = [string, ExperienceFragment];
