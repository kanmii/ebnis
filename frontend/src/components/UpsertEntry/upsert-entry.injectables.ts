/* eslint-disable react-hooks/rules-of-hooks */
import immer from "immer";
import {
  EntryConnectionFragment_edges_node,
  EntryConnectionFragment_edges,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { entryToEdge } from "./entry-to-edge";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../../apollo/update-get-experiences-mini-query";
import {
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
} from "../../apollo/get-detailed-experience-query";
import { GetEntriesUnionFragment } from "../../graphql/apollo-types/GetEntriesUnionFragment";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "../../graphql/apollo-types/GetEntries";

/**
 * Upsert the entry into the experience and updates the Get full experience
 * query
 */
export function upsertNewEntry(
  experience: ExperienceFragment,
  entry: EntryFragment,
  onDone?: () => void,
): UpsertNewEntryReturnVal | undefined {
  const erfahrungId = experience.id;
  const entriesQuery = getEntriesQuerySuccess(erfahrungId);

  const [updatedGetEntriesQuery, updatedExperience] = immer(
    [entriesQuery, experience],
    ([proxy, _]) => {
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

  writeGetEntriesQuery(erfahrungId, entriesUnionFragment);

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
  experience: ExperienceFragment;
  updatedGetEntriesQuery: GetEntries_getEntries_GetEntriesSuccess_entries;
};
