import gql from "graphql-tag";
import { PAGE_INFO_FRAGMENT } from "./utils.gql";

export const DATA_OBJECT_FRAGMENT = gql`
  fragment DataObjectFragment on DataObject {
    id
    data
    definitionId
    clientId
    insertedAt
    updatedAt
  }
`;

export const ENTRY_FRAGMENT = gql`
  fragment EntryFragment on Entry {
    id
    experienceId
    clientId
    insertedAt
    updatedAt
    dataObjects {
      ...DataObjectFragment
    }
  }

  ${DATA_OBJECT_FRAGMENT}
`;

export const ENTRY_CONNECTION_FRAGMENT = gql`
  fragment EntryConnectionFragment on EntryConnection {
    pageInfo {
      ...PageInfoFragment
    }

    edges {
      cursor
      node {
        ...EntryFragment
      }
    }
  }

  ${ENTRY_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;
