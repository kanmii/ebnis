import { DataProxy } from "apollo-cache";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import {
  ExperienceFragment,
  ExperienceFragment_entries_edges,
} from "../graphql/apollo-types/ExperienceFragment";
import { readExperienceFragment } from "./read-experience-fragment";
import { writeExperienceFragmentToCache } from "./write-experience-fragment";
import { insertExperiencesInGetExperiencesMiniQuery } from "./update-get-experiences-mini-query";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";

export function createExperiencesManualUpdate(
  dataProxy: DataProxy,
  result: CreateExperiencesMutationResult,
) {
  const validResponses = result && result.data && result.data.createExperiences;

  if (!validResponses) {
    return;
  }

  const toBeInserted = validResponses.reduce((experiencesAcc, response) => {
    // istanbul ignore next:
    if (!response) {
      return experiencesAcc;
    }

    if (response.__typename === "ExperienceSuccess") {
      const { experience, entriesErrors } = response;

      if (!entriesErrors) {
        experiencesAcc.push(experience);
        return experiencesAcc;
      }

      const offlineExperience = readExperienceFragment(
        experience.clientId as string,
      );

      // fresh experience created directly online
      if (!offlineExperience) {
        experiencesAcc.push(experience);
        return experiencesAcc;
      }

      // experience created offline now synced

      const offlineEntriesEdges = offlineExperience.entries.edges;

      if (!offlineEntriesEdges) {
        experiencesAcc.push(experience);
        return experiencesAcc;
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
          length: offlineEntriesEdges.length,
        },
      );

      const syncedEdges = [
        ...(experience.entries.edges || []),
      ] as ExperienceFragment_entries_edges[];

      let syncedIndex = 0;

      const definitionsMap = experience.dataDefinitions.reduce(
        (definitionsAcc, d) => {
          const { id, clientId } = d;
          definitionsAcc[clientId as string] = id;

          return definitionsAcc;
        },
        {} as { [key: string]: string },
      );

      offlineEntriesEdges.forEach((e, index) => {
        const edge = e as ExperienceFragment_entries_edges;

        if (entriesErrorsIndices.includes(index)) {
          const node = edge.node as EntryFragment;
          const experienceId = experience.id;

          const dataObjects = (node.dataObjects as DataObjectFragment[]).map(
            (dataObject, index) => {
              return {
                ...dataObject,
                definitionId: definitionsMap[dataObject.definitionId],
              };
            },
          );

          const entryEdge = {
            ...edge,
            node: {
              ...node,
              experienceId,
              dataObjects,
            },
          };

          syncedAndUnsyncedEntriesEdges[index] = entryEdge;
        } else {
          syncedAndUnsyncedEntriesEdges[index] = syncedEdges[syncedIndex++];
        }
      });

      const updatedEntries = {
        ...experience.entries,
        edges: syncedAndUnsyncedEntriesEdges,
      };

      const updatedExperience = { ...experience, entries: updatedEntries };
      experiencesAcc.push(updatedExperience);
      writeExperienceFragmentToCache(updatedExperience);
    }

    return experiencesAcc;
  }, [] as ExperienceFragment[]);

  if (toBeInserted.length) {
    insertExperiencesInGetExperiencesMiniQuery(dataProxy, toBeInserted);
  }
}
