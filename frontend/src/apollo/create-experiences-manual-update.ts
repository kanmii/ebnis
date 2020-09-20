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
  toGetEntriesSuccessQuery,
  writeGetExperienceQueryToCache,
} from "./get-detailed-experience-query";

export function createExperiencesManualUpdate(
  dataProxy: DataProxy,
  result: CreateExperiencesMutationResult,
) {
  const validResponses = result && result.data && result.data.createExperiences;

  if (!validResponses) {
    return;
  }

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

        // fresh experience created directly online
        // bzw kein Eintrag erstelltet mit Erfahrung
        if (!offlineExperience || !entriesResult) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

        // experience created offline now synced

        const [
          newlyCreatedEntriesEdges,
          entriesErrorsIndices,
        ] = entriesResult.reduce(
          ([edges, indices], result) => {
            if (result.__typename === "CreateEntrySuccess") {
              edges.push(entryToEdge(result.entry));
            } else {
              const {
                meta: { index },
              } = result.errors;

              indices.push(index);
            }

            return [edges, indices];
          },
          [[], []] as [EntryConnectionFragment_edges[], number[]],
        );

        const getEntries = getEntriesQuerySuccess(offlineErfahrungId);

        const beforeSyncEntriesEdges = getEntries.edges as EntryConnectionFragment_edges[];

        if (!beforeSyncEntriesEdges.length) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

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

        const experienceId = newlyCreatedExperience.id;

        beforeSyncEntriesEdges.forEach((edge, index) => {
          if (entriesErrorsIndices.includes(index)) {
            const beforeSyncEntryNode = edge.node as EntryFragment;

            const dataObjects = (beforeSyncEntryNode.dataObjects as DataObjectFragment[]).map(
              (dataObject, index) => {
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
      }

      return toBeInsertedOrReplacedAcc;
    },
    [] as [string, ExperienceFragment][],
  );

  if (toBeInsertedOrReplaced.length) {
    insertReplaceRemoveExperiencesInGetExperiencesMiniQuery(
      toBeInsertedOrReplaced,
    );
  }
}
