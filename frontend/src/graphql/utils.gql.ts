import { PageInfoFragment } from "./apollo-types/PageInfoFragment";

export const emptyPageInfo: PageInfoFragment = {
  __typename: "PageInfo",
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: "",
  endCursor: "",
};
