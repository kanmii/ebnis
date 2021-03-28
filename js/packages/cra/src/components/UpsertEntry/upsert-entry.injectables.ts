import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
  EntryConnectionFragment_edges_node,
} from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { GetEntriesUnionFragment } from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { entryToEdge } from "@eb/cm/src/graphql/utils.gql";
import immer from "immer";
import {
  getCachedEntriesDetailViewSuccess,
  writeCachedEntriesDetailView,
} from "../../apollo/get-detailed-experience-query";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../../apollo/update-get-experiences-list-view-query";

/**
 * Upsert the entry into the experience and updates the Get full experience
 * query
 */
export function upsertNewEntry(
  experience: ExperienceCompleteFragment,
  entry: EntryFragment,
  onDone?: () => void,
): UpsertNewEntryReturnVal | undefined {
  const erfahrungId = experience.id;
  const entriesQuery = getCachedEntriesDetailViewSuccess(erfahrungId);

  const [updatedGetEntriesQuery, updatedExperience] = immer(
    [entriesQuery, experience],
    ([proxy]) => {
      const edges = proxy.edges as EntryConnectionFragment_edges[];

      const existingEntry = edges.find((e) => {
        const { id } = (e as EntryConnectionFragment_edges)
          .node as EntryFragment;

        return id === entry.id || id === entry.clientId;
      });

      if (existingEntry) {
        // update
        existingEntry.node = entry;
      } else {
        // insert
        const newEdge = entryToEdge(
          entry as EntryConnectionFragment_edges_node,
        );

        edges.unshift(newEdge);
      }
    },
  );

  const entriesUnionFragment: GetEntriesUnionFragment = {
    entries: updatedGetEntriesQuery,
    __typename: "GetEntriesSuccess",
  };

  writeCachedEntriesDetailView(erfahrungId, entriesUnionFragment);

  floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);

  if (onDone) {
    onDone();
  }

  return {
    experience: updatedExperience,
    updatedGetEntriesQuery,
  };
}

export type UpsertNewEntryReturnVal = {
  experience: ExperienceCompleteFragment;
  updatedGetEntriesQuery: EntryConnectionFragment;
};
