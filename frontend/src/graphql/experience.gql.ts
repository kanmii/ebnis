import gql from "graphql-tag";
import {
  ENTRY_FRAGMENT,
  DATA_OBJECT_FRAGMENT,
  ENTRY_CONNECTION_FRAGMENT,
} from "./entry.gql";
import { GetExperienceConnectionMiniVariables } from "./apollo-types/GetExperienceConnectionMini";

export const DEFINITION_FRAGMENT = gql`
  fragment DataDefinitionFragment on DataDefinition {
    id
    name
    type
    clientId
  }
`;

// the minimum fields needed to quickly display an experience
export const EXPERIENCE_MINI_FRAGMENT = gql`
  fragment ExperienceMiniFragment on Experience {
    id
    title
    description
    clientId
    insertedAt
    updatedAt
  }
`;

// the fields not in mini fragment.
export const EXPERIENCE_REST_FRAGMENT = gql`
  fragment ExperienceRestFragment on Experience {
    id
    dataDefinitions {
      ...DataDefinitionFragment
    }

    entries(pagination: $entriesPagination) {
      ...EntryConnectionFragment
    }
  }

  ${DEFINITION_FRAGMENT}
  ${ENTRY_CONNECTION_FRAGMENT}
`;

export const EXPERIENCE_FRAGMENT = gql`
  fragment ExperienceFragment on Experience {
    ...ExperienceMiniFragment

    dataDefinitions {
      ...DataDefinitionFragment
    }

    entries(pagination: $entriesPagination) {
      ...EntryConnectionFragment
    }
  }

  ${EXPERIENCE_MINI_FRAGMENT}
  ${DEFINITION_FRAGMENT}
  ${ENTRY_CONNECTION_FRAGMENT}
`;

export const FRAGMENT_NAME_experienceFragment = "ExperienceFragment";

export const EXPERIENCE_CONNECTION_FRAGMENT = gql`
  fragment ExperienceConnectionFragment on ExperienceConnection {
    pageInfo {
      hasNextPage
      hasPreviousPage
    }

    edges {
      cursor
      node {
        ...ExperienceFragment
      }
    }
  }

  ${EXPERIENCE_FRAGMENT}
`;

export const EXPERIENCE_CONNECTION_PRE_FETCH_FRAGMENT = gql`
  fragment ExperienceConnectionPreFetchFragment on ExperienceConnection {
    edges {
      cursor
      node {
        ...ExperienceRestFragment
      }
    }
  }

  ${EXPERIENCE_REST_FRAGMENT}
`;

export const EXPERIENCE_NO_ENTRY_FRAGMENT = gql`
  fragment ExperienceNoEntryFragment on Experience {
    ...ExperienceMiniFragment

    dataDefinitions {
      ...DataDefinitionFragment
    }
  }

  ${EXPERIENCE_MINI_FRAGMENT}
  ${DEFINITION_FRAGMENT}
`;

////////////////////////// UPDATE EXPERIENCES SECTION ////////////////////

const UPDATE_EXPERIENCE_ERROR_FRAGMENT = gql`
  fragment UpdateExperienceErrorFragment on UpdateExperienceError {
    experienceId
    error
  }
`;

const DEFINITION_ERROR_FRAGMENT = gql`
  fragment DefinitionErrorFragment on DefinitionError {
    id
    name
    type
    error
  }
`;

const UPDATE_EXPERIENCE_OWN_FIELDS_FRAGMENT = gql`
  fragment ExperienceOwnFieldsFragment on ExperienceOwnFields {
    title
    description
  }
`;

const UPDATE_EXPERIENCE_OWN_FIELDS_ERROR_FRAGMENT = gql`
  fragment UpdateExperienceOwnFieldsErrorFragment on UpdateExperienceOwnFieldsError {
    title
  }
`;

const UPDATE_EXPERIENCE_OWN_FIELDS_UNION_FRAGMENT = gql`
  fragment UpdateExperienceOwnFieldsUnionFragment on UpdateExperienceOwnFieldsUnion {
    __typename
    ... on UpdateExperienceOwnFieldsErrors {
      errors {
        ...UpdateExperienceOwnFieldsErrorFragment
      }
    }
    ... on ExperienceOwnFieldsSuccess {
      data {
        ...ExperienceOwnFieldsFragment
      }
    }
  }
  ${UPDATE_EXPERIENCE_OWN_FIELDS_ERROR_FRAGMENT}
  ${UPDATE_EXPERIENCE_OWN_FIELDS_FRAGMENT}
`;

const DEFINITION_SUCCESS_FRAGMENT = gql`
  fragment DefinitionSuccessFragment on DefinitionSuccess {
    definition {
      ...DataDefinitionFragment
    }
  }
  ${DEFINITION_FRAGMENT}
`;

const DEFINITION_ERRORS_FRAGMENT = gql`
  fragment DefinitionErrorsFragment on DefinitionErrors {
    errors {
      ...DefinitionErrorFragment
    }
  }
  ${DEFINITION_ERROR_FRAGMENT}
`;

const UPDATE_DEFINITION_UNION_FRAGMENT = gql`
  fragment UpdateDefinitionUnionFragment on UpdateDefinition {
    __typename
    ... on DefinitionErrors {
      ...DefinitionErrorsFragment
    }

    ... on DefinitionSuccess {
      ...DefinitionSuccessFragment
    }
  }
  ${DEFINITION_ERRORS_FRAGMENT}
  ${DEFINITION_SUCCESS_FRAGMENT}
`;

const CREATE_ENTRY_ERROR_FRAGMENT = gql`
  fragment CreateEntryErrorFragment on CreateEntryError {
    meta {
      experienceId
      index
      clientId
    }
    error
    clientId
    experienceId
    dataObjects {
      meta {
        index
        id
        clientId
      }
      definition
      definitionId
      clientId
      data
    }
  }
`;

const CREATE_ENTRY_ERRORS_FRAGMENT = gql`
  fragment CreateEntryErrorsFragment on CreateEntryErrors {
    errors {
      ...CreateEntryErrorFragment
    }
  }
  ${CREATE_ENTRY_ERROR_FRAGMENT}
`;

const CREATE_ENTRY_SUCCESS_FRAGMENT = gql`
  fragment CreateEntrySuccessFragment on CreateEntrySuccess {
    entry {
      ...EntryFragment
    }
  }
  ${ENTRY_FRAGMENT}
`;

const UPDATE_ENTRY_ERROR_FRAGMENT = gql`
  fragment UpdateEntryErrorFragment on UpdateEntryError {
    entryId
    error
  }
`;

const DATA_OBJECT_ERROR_FRAGMENT = gql`
  fragment DataObjectErrorFragment on DataObjectError {
    meta {
      index
      id
      clientId
    }
    definition
    definitionId
    clientId
    data
    error
  }
`;

const UPDATE_ENTRY_FRAGMENT = gql`
  fragment UpdateEntryFragment on UpdateEntry {
    entryId
    updatedAt
    dataObjects {
      __typename
      ... on DataObjectErrors {
        errors {
          ...DataObjectErrorFragment
        }
      }
      ... on DataObjectSuccess {
        dataObject {
          ...DataObjectFragment
        }
      }
    }
  }

  ${DATA_OBJECT_ERROR_FRAGMENT}
  ${DATA_OBJECT_FRAGMENT}
`;

export const UPDATE_ENTRY_UNION_FRAGMENT = gql`
  fragment UpdateEntryUnionFragment on UpdateEntryUnion {
    __typename
    ... on UpdateEntryErrors {
      errors {
        ...UpdateEntryErrorFragment
      }
    }
    ... on UpdateEntrySomeSuccess {
      entry {
        ...UpdateEntryFragment
      }
    }
  }
  ${UPDATE_ENTRY_ERROR_FRAGMENT}
  ${UPDATE_ENTRY_FRAGMENT}
`;

const UPDATE_EXPERIENCE_FRAGMENT = gql`
  fragment UpdateExperienceFragment on UpdateExperience {
    experienceId
    updatedAt
    ownFields {
      ...UpdateExperienceOwnFieldsUnionFragment
    }
    updatedDefinitions {
      ...UpdateDefinitionUnionFragment
    }
    updatedEntries {
      ...UpdateEntryUnionFragment
    }
    newEntries {
      __typename
      ... on CreateEntryErrors {
        ...CreateEntryErrorsFragment
      }
      ... on CreateEntrySuccess {
        ...CreateEntrySuccessFragment
      }
    }
    deletedEntries {
      __typename
      ... on EntrySuccess {
        entry {
          ...EntryFragment
        }
      }
      ... on DeleteEntryErrors {
        errors {
          id
          error
        }
      }
    }
  }
  ${UPDATE_EXPERIENCE_OWN_FIELDS_UNION_FRAGMENT}
  ${UPDATE_DEFINITION_UNION_FRAGMENT}
  ${UPDATE_ENTRY_UNION_FRAGMENT}
  ${CREATE_ENTRY_SUCCESS_FRAGMENT}
  ${CREATE_ENTRY_ERRORS_FRAGMENT}
  ${ENTRY_FRAGMENT}
`;

const UPDATE_EXPERIENCE_SOME_SUCCESS_FRAGMENT = gql`
  fragment UpdateExperienceSomeSuccessFragment on UpdateExperienceSomeSuccess {
    experience {
      ...UpdateExperienceFragment
    }
  }
  ${UPDATE_EXPERIENCE_FRAGMENT}
`;

export const UPDATE_EXPERIENCES_ONLINE_MUTATION = gql`
  mutation UpdateExperiencesOnline($input: [UpdateExperienceInput!]!) {
    updateExperiences(input: $input) {
      __typename
      ... on UpdateExperiencesAllFail {
        error
      }
      ... on UpdateExperiencesSomeSuccess {
        experiences {
          __typename
          ... on UpdateExperienceErrors {
            errors {
              ...UpdateExperienceErrorFragment
            }
          }
          ... on UpdateExperienceSomeSuccess {
            ...UpdateExperienceSomeSuccessFragment
          }
        }
      }
    }
  }
  ${UPDATE_EXPERIENCE_ERROR_FRAGMENT}
  ${UPDATE_EXPERIENCE_SOME_SUCCESS_FRAGMENT}
`;

////////////////////////// END UPDATE EXPERIENCES SECTION //////////////////

const CREATE_EXPERIENCE_SUCCESS_FRAGMENT = gql`
  fragment CreateExperienceSuccessFragment on ExperienceSuccess {
    experience {
      ...ExperienceFragment
    }
    entriesErrors {
      ...CreateEntryErrorFragment
    }
  }
  ${CREATE_ENTRY_ERROR_FRAGMENT}
`;

const CREATE_EXPERIENCE_ERRORS_FRAGMENT = gql`
  fragment CreateExperienceErrorsFragment on CreateExperienceErrors {
    errors {
      meta {
        index
        clientId
      }
      error
      title
      user
      clientId
      dataDefinitions {
        index
        name
        type
      }
    }
  }
`;

export const CREATE_EXPERIENCES_MUTATION = gql`
  mutation CreateExperiences(
    $input: [CreateExperienceInput!]!
    $entriesPagination: PaginationInput!
  ) {
    createExperiences(input: $input) {
      __typename
      ... on ExperienceSuccess {
        ...CreateExperienceSuccessFragment
      }
      ... on CreateExperienceErrors {
        ...CreateExperienceErrorsFragment
      }
    }
  }
  ${CREATE_EXPERIENCE_SUCCESS_FRAGMENT}
  ${CREATE_EXPERIENCE_ERRORS_FRAGMENT}
  ${EXPERIENCE_FRAGMENT}
`;

export const DELETE_EXPERIENCES_MUTATION = gql`
  mutation DeleteExperiences($input: [ID!]!) {
    deleteExperiences(input: $input) {
      ... on DeleteExperiencesAllFail {
        error
      }
      ... on DeleteExperiencesSomeSuccess {
        experiences {
          ... on DeleteExperienceErrors {
            errors {
              id
              error
            }
          }
          ... on DeleteExperienceSuccess {
            experience {
              id
            }
          }
        }
      }
    }
  }
`;

// this query will be kept around after we ran it and all experiences list will
// refer to it.
export const GET_EXPERIENCES_CONNECTION_MINI_QUERY = gql`
  query GetExperienceConnectionMini($input: GetExperiencesInput) {
    getExperiences(input: $input) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }

      edges {
        cursor
        node {
          ...ExperienceMiniFragment
        }
      }
    }
  }

  ${EXPERIENCE_MINI_FRAGMENT}
`;

// this query will be deleted after we ran it.
export const PRE_FETCH_EXPERIENCES_QUERY = gql`
  query PreFetchExperiences(
    $input: GetExperiencesInput!
    $entriesPagination: PaginationInput!
  ) {
    getExperiences(input: $input) {
      ...ExperienceConnectionPreFetchFragment
    }
  }

  ${EXPERIENCE_CONNECTION_PRE_FETCH_FRAGMENT}
`;

////////////////////////// GET EXPERIENCE DETAIL //////////////////
export const GET_DETAIL_EXPERIENCE_QUERY = gql`
  query GetDetailExperience($id: ID!, $entriesPagination: PaginationInput!) {
    getExperience(id: $id) {
      ...ExperienceFragment
    }
  }

  ${EXPERIENCE_FRAGMENT}
`;
////////////////////////// END GET EXPERIENCE DETAIL //////////////////

export const getExperienceConnectionMiniVariables: GetExperienceConnectionMiniVariables = {
  input: {
    pagination: {
      first: 20000,
    },
  },
};
