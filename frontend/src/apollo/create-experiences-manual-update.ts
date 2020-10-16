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
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "./unsynced-ledger";

export function createExperiencesManualUpdate(
  dataProxy: DataProxy,
  result: CreateExperiencesMutationResult,
) {
  const validResponses = result && result.data && result.data.createExperiences;

  if (!validResponses) {
    return undefined;
  }

  const offlineExperienceIdToOnlineExperienceIdMap: [string, string][] = [];

  const toBeInsertedOrReplaced = validResponses.reduce(
    (toBeInsertedOrReplacedAcc, response) => {
      // istanbul ignore next:
      if (!response) {
        return toBeInsertedOrReplacedAcc;
      }

      if (response.__typename === "ExperienceSuccess") {
        const {
          experience: newlyCreatedExperience,
          entries: entriesResult,
        } = response;

        const offlineErfahrungId = newlyCreatedExperience.clientId || "";
        const offlineExperience = readExperienceFragment(offlineErfahrungId);

        toBeInsertedOrReplacedAcc.push([
          newlyCreatedExperience.id,
          newlyCreatedExperience,
        ]);

        // fresh experience created directly online
        if (!offlineExperience) {
          return toBeInsertedOrReplacedAcc;
        }

        // kein Eintrag erstelltet mit Offline Erfahrung
        if (!entriesResult) {
          removeUnsyncedExperiences([offlineErfahrungId]);
          return toBeInsertedOrReplacedAcc;
        }

        // experience created offline now synced

        const experienceId = newlyCreatedExperience.id;

        offlineExperienceIdToOnlineExperienceIdMap.push([
          offlineErfahrungId,
          experienceId,
        ]);

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
                experienceId,
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
          experienceId,
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

        if (Object.keys(clientIdToEntryErrorsMap).length) {
          const ledger = getUnsyncedExperience(offlineErfahrungId);

          if (ledger) {
            writeUnsyncedExperience(experienceId, {
              entriesErrors: clientIdToEntryErrorsMap,
            });
          }
        }

        removeUnsyncedExperiences([offlineErfahrungId]);
      }

      return toBeInsertedOrReplacedAcc;
    },
    [] as [string, ExperienceFragment][],
  );

  if (toBeInsertedOrReplaced.length) {
    insertReplaceRemoveExperiencesInGetExperiencesMiniQuery(
      toBeInsertedOrReplaced,
    );

    return offlineExperienceIdToOnlineExperienceIdMap;
  }

  return undefined;
}
