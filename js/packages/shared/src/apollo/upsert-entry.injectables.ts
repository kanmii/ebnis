import {
  getCachedEntriesDetailViewSuccess,
  writeCachedEntriesDetailView,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import { floatExperienceToTopInGetExperiencesListViewQuery } from "@eb/shared/src/apollo/experiences-list-cache-utils";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
  EntryConnectionFragment_edges_node,
} from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { GetEntriesUnionFragment } from "@eb/shared/src/graphql/apollo-types/GetEntriesUnionFragment";
import { entryToEdge } from "@eb/shared/src/graphql/utils.gql";

/**
 * Upsert the entry into the experience and updates the Get full experience
 * query
 */
export function upsertNewEntry(
  experience: ExperienceDCFragment,
  entry: EntryFragment,
  onDone?: () => void,
): UpsertNewEntryReturnVal | undefined {
  const erfahrungId = experience.id;

  let entriesQuery = getCachedEntriesDetailViewSuccess(erfahrungId);

  entriesQuery = {
    ...entriesQuery,
  };

  const updatedExperience = {
    ...experience,
  };

  let edges = entriesQuery.edges as EntryConnectionFragment_edges[];
  edges = [...edges];

  let existingEdge = edges.find((e) => {
    const { id } = (e as EntryConnectionFragment_edges).node as EntryFragment;

    return id === entry.id || id === entry.clientId;
  });

  if (existingEdge) {
    existingEdge = { ...existingEdge };
    // update
    existingEdge.node = entry;
  } else {
    // insert
    const newEdge = entryToEdge(entry as EntryConnectionFragment_edges_node);

    edges.unshift(newEdge);
  }

  const entriesUnionFragment: GetEntriesUnionFragment = {
    entries: entriesQuery,
    __typename: "GetEntriesSuccess",
  };

  writeCachedEntriesDetailView(erfahrungId, entriesUnionFragment, {
    replaceAll: true,
  });

  floatExperienceToTopInGetExperiencesListViewQuery(updatedExperience);

  if (onDone) {
    onDone();
  }

  return {
    experience: updatedExperience,
    updatedGetEntriesQuery: entriesQuery,
  };
}

export type UpsertNewEntryReturnVal = {
  experience: ExperienceDCFragment;
  updatedGetEntriesQuery: EntryConnectionFragment;
};
