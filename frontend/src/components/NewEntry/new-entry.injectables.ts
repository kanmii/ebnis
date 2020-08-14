/* eslint-disable react-hooks/rules-of-hooks */
import { ApolloClient } from "@apollo/client";
import { newEntryResolvers } from "./new-entry.resolvers";
import immer from "immer";
import {
  ExperienceFragment,
  ExperienceFragment_entries,
  ExperienceFragment_entries_edges_node,
  ExperienceFragment_entries_edges,
} from "../../graphql/apollo-types/ExperienceFragment";
import { readExperienceFragment } from "../../apollo/read-experience-fragment";
import { entryToEdge } from "./entry-to-edge";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { writeExperienceFragmentToCache } from "../../apollo/write-experience-fragment";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../../apollo/update-get-experiences-mini-query";

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
export function upsertExperienceWithEntry(
  entry: EntryFragment,
  experienceOrId: string | ExperienceFragment,
  onDone?: () => void,
) {
  let experience = experienceOrId as ExperienceFragment | null;

  if (typeof experienceOrId === "string") {
    experience = readExperienceFragment(experienceOrId);

    // istanbul ignore next:
    if (!experience) {
      return;
    }
  }

  const updatedExperience = immer(experience as ExperienceFragment, (proxy) => {
    const entries = proxy.entries as ExperienceFragment_entries;
    const edges = entries.edges || [];

    const existingEntry = edges.find((e) => {
      const { id } = (e as ExperienceFragment_entries_edges)
        .node as EntryFragment;

      return id === entry.id || id === entry.clientId;
    });

    if (existingEntry) {
      // update
      existingEntry.node = entry;
    } else {
      // insert
      edges.unshift(
        entryToEdge(entry as ExperienceFragment_entries_edges_node),
      );
    }

    entries.edges = edges;
    proxy.entries = entries;
  });

  writeExperienceFragmentToCache(updatedExperience);

  floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);

  if (onDone) {
    onDone();
  }

  return updatedExperience;
}

export type UpsertExperienceInCacheMode = "online" | "offline";
