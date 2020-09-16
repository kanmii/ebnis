/* eslint-disable react-hooks/rules-of-hooks */
import { ApolloClient } from "@apollo/client";
import { newEntryResolvers } from "./new-entry.resolvers";
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
  readExperienceFragment,
} from "../../apollo/get-detailed-experience-query";
import { GetEntriesUnionFragment } from "../../graphql/apollo-types/GetEntriesUnionFragment";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "../../graphql/apollo-types/GetEntries";

// istanbul ignore next:
export function addResolvers(client: ApolloClient<{}>) {
  if (window.____ebnis.newEntryResolversAdded) {
    return;
  }

  client.addResolvers(newEntryResolvers);
  window.____ebnis.newEntryResolversAdded = true;
}

/**
 * Upsert the entry into the experience and updates the Get full experience
 * query
 */
export function upsertNewEntry(
  experienceId: string,
  entry: EntryFragment,
  onDone?: () => void,
): UpsertNewEntryReturnVal | undefined {
  const experience = readExperienceFragment(experienceId);

  if (!experience) {
    return;
  }

  const entriesQuery = getEntriesQuerySuccess(experienceId);

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
        edges.unshift(entryToEdge(entry as EntryConnectionFragment_edges_node));
      }
    },
  );

  const entriesUnionFragment: GetEntriesUnionFragment = {
    entries: updatedGetEntriesQuery,
    __typename: "GetEntriesSuccess",
  };

  writeGetEntriesQuery(experienceId, entriesUnionFragment);

  floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);

  if (onDone) {
    onDone();
  }

  return {
    experience: updatedExperience,
    updatedGetEntriesQuery,
  };
}

export type UpsertExperienceInCacheMode = "online" | "offline";

export type UpsertNewEntryReturnVal = {
  experience: ExperienceFragment;
  updatedGetEntriesQuery: GetEntries_getEntries_GetEntriesSuccess_entries;
};
