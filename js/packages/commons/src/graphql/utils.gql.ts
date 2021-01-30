import gql from "graphql-tag";
import { PageInfoFragment } from "./apollo-types/PageInfoFragment";
import {
  GetEntriesUnionFragment_GetEntriesSuccess,
  GetEntriesUnionFragment_GetEntriesSuccess_entries,
} from "./apollo-types/GetEntriesUnionFragment";
import { EntryConnectionFragment_edges } from "./apollo-types/EntryConnectionFragment";

export const emptyPageInfo: PageInfoFragment = {
  __typename: "PageInfo",
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: "",
  endCursor: "",
};

export const emptyGetEntries = {
  __typename: "GetEntriesSuccess",
  entries: {
    __typename: "EntryConnection",
    edges: [] as EntryConnectionFragment_edges[],
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
    },
  },
} as GetEntriesUnionFragment_GetEntriesSuccess;

export const PAGE_INFO_FRAGMENT = gql`
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export function toGetEntriesSuccessQuery(
  entries: GetEntriesUnionFragment_GetEntriesSuccess_entries,
) {
  return {
    entries,
    __typename: "GetEntriesSuccess" as "GetEntriesSuccess",
  };
}
