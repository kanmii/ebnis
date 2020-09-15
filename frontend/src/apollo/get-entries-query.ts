import { GET_ENTRIES_QUERY } from "../graphql/experience.gql";
import {
  GetEntries,
  GetEntriesVariables,
} from "../graphql/apollo-types/GetEntries";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { emptyPageInfo } from "../graphql/utils.gql";
import {
  GetEntriesUnionFragment,
  GetEntriesUnionFragment_GetEntriesSuccess_entries,
} from "../graphql/apollo-types/GetEntriesUnionFragment";

export function getEntriesQuery(experienceId: string) {
  const { cache } = window.____ebnis;

  return cache.readQuery<GetEntries, GetEntriesVariables>({
    query: GET_ENTRIES_QUERY,
    variables: {
      experienceId,
      pagination: {
        first: 10,
      },
    },
  });
}

export function getEntriesQuerySuccess(experienceId: string) {
  const x = getEntriesQuery(experienceId);
  const y = x && x.getEntries;

  if (y && y.__typename === "GetEntriesSuccess") {
    return y.entries;
  }

  return {
    edges: [] as EntryConnectionFragment_edges[],
    pageInfo: emptyPageInfo,
  } as EntryConnectionFragment;
}

export function writeGetEntriesQuery(
  experienceId: string,
  entriesUnionFragment: GetEntriesUnionFragment,
) {
  const { cache } = window.____ebnis;

  return cache.writeQuery<GetEntries, GetEntriesVariables>({
    query: GET_ENTRIES_QUERY,
    data: {
      getEntries: entriesUnionFragment,
    },
    variables: {
      experienceId,
      pagination: {
        first: 10,
      },
    },
  });
}

export function toGetEntriesSuccessQuery(
  entries: GetEntriesUnionFragment_GetEntriesSuccess_entries,
) {
  return {
    entries,
    __typename: "GetEntriesSuccess" as "GetEntriesSuccess",
  };
}
