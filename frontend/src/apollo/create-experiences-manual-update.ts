import { DataProxy } from "@apollo/client";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import {
  ExperienceFragment,
  ExperienceFragment_entries_edges,
} from "../graphql/apollo-types/ExperienceFragment";
import { readExperienceFragment } from "./read-experience-fragment";
import { writeGetCompleteExperienceQueryToCache } from "./write-get-complete-experience-query";
import { insertReplaceRemoveExperiencesInGetExperiencesMiniQuery } from "./update-get-experiences-mini-query";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import { writeExperienceFragmentToCache } from "./write-experience-fragment";

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
        const { experience: newlyCreatedExperience, entriesErrors } = response;

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

        if (!entriesErrors) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

        // experience created offline now synced

        const beforeSyncEntriesEdges = offlineExperience.entries.edges;

        if (!beforeSyncEntriesEdges) {
          toBeInsertedOrReplacedAcc.push([
            newlyCreatedExperience.id,
            newlyCreatedExperience,
          ]);

          return toBeInsertedOrReplacedAcc;
        }

        const entriesErrorsIndices = entriesErrors.reduce((acc, e) => {
          const {
            meta: { index },
          } = e;
          if ("number" === typeof index) {
            acc.push(index);
          }

          return acc;
        }, [] as number[]);

        const syncedAndUnsyncedEntriesEdges: ExperienceFragment_entries_edges[] = Array.from(
          {
            length: beforeSyncEntriesEdges.length,
          },
        );

        const syncedEdges = [
          ...(newlyCreatedExperience.entries.edges || []),
        ] as ExperienceFragment_entries_edges[];

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
        const noErrorOnSyncOfflineEntryEdges: ExperienceFragment_entries_edges[] = [];

        beforeSyncEntriesEdges.forEach((e, index) => {
          const edge = e as ExperienceFragment_entries_edges;

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
            syncedAndUnsyncedEntriesEdges[index] = syncedEdges[syncedIndex++];
            noErrorOnSyncOfflineEntryEdges.push(edge);
          }
        });

        const updatedEntries = {
          ...newlyCreatedExperience.entries,
          edges: syncedAndUnsyncedEntriesEdges,
        };

        const updatedNewlyCreatedExperience = {
          ...newlyCreatedExperience,
          entries: updatedEntries,
        };

        const updatedOfflineExperience = {
          ...offlineExperience,
          entries: {
            ...offlineExperience.entries,
            edges: noErrorOnSyncOfflineEntryEdges,
          },
        };

        toBeInsertedOrReplacedAcc.push([
          clientId,
          updatedNewlyCreatedExperience,
        ]);

        writeGetCompleteExperienceQueryToCache(updatedNewlyCreatedExperience);

        writeExperienceFragmentToCache(updatedOfflineExperience);
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
