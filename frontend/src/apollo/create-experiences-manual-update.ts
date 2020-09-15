import { DataProxy } from "@apollo/client";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { readExperienceFragment } from "./read-experience-fragment";
import { writeGetExperienceQueryToCache } from "./write-get-complete-experience-query";
import { insertReplaceRemoveExperiencesInGetExperiencesMiniQuery } from "./update-get-experiences-mini-query";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "../graphql/apollo-types/EntryConnectionFragment";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";
import { getEntriesQuerySuccess } from "./get-entries-query";

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

        const clientId = newlyCreatedExperience.clientId || "";
        const offlineExperience = readExperienceFragment(clientId);

        // fresh experience created directly online
        if (!offlineExperience) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

        if (!entriesResult) {
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

        const beforeSyncEntriesEdges = getEntriesQuerySuccess(clientId)
          .edges as EntryConnectionFragment_edges[];

        if (!beforeSyncEntriesEdges.length) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

        const syncedAndUnsyncedEntriesEdges: EntryConnectionFragment_edges[] = Array.from(
          {
            length: beforeSyncEntriesEdges.length,
          },
        );

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

            syncedAndUnsyncedEntriesEdges[index] = entryEdge;
          } else {
            syncedAndUnsyncedEntriesEdges[index] =
              newlyCreatedEntriesEdges[syncedIndex++];
          }
        });

        toBeInsertedOrReplacedAcc.push([clientId, newlyCreatedExperience]);

        writeGetExperienceQueryToCache(newlyCreatedExperience);
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
