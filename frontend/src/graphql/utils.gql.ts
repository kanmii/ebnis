import gql from "graphql-tag";
import { PageInfoFragment } from "./apollo-types/PageInfoFragment";
import { GetEntriesUnionFragment_GetEntriesSuccess } from "./apollo-types/GetEntriesUnionFragment";
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
