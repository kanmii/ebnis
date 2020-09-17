import gql from "graphql-tag";
import {
  ENTRY_FRAGMENT,
  DATA_OBJECT_FRAGMENT,
  ENTRY_CONNECTION_FRAGMENT,
} from "./entry.gql";
import { PAGE_INFO_FRAGMENT } from "./utils.gql";

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
  }

  ${DEFINITION_FRAGMENT}
`;

export const EXPERIENCE_FRAGMENT = gql`
  fragment ExperienceFragment on Experience {
    ...ExperienceMiniFragment

    dataDefinitions {
      ...DataDefinitionFragment
    }
  }

  ${EXPERIENCE_MINI_FRAGMENT}
  ${DEFINITION_FRAGMENT}
`;

export const FRAGMENT_NAME_experienceFragment = "ExperienceFragment";

export const EXPERIENCE_CONNECTION_FRAGMENT = gql`
  fragment ExperienceConnectionFragment on ExperienceConnection {
    pageInfo {
      ...PageInfoFragment
    }

    edges {
      cursor
      node {
        ...ExperienceFragment
      }
    }
  }

  ${EXPERIENCE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

export const PRE_FETCH_EXPERIENCE_FRAGMENT = gql`
  fragment PreFetchExperienceFragment on ExperienceConnection {
    edges {
      cursor
      node {
        ...ExperienceRestFragment
      }
    }
  }

  ${EXPERIENCE_REST_FRAGMENT}
`;

const EXPERIENCE_ERROR_FRAGMENT = gql`
  fragment ExperienceErrorFragment on ExperienceError {
    experienceId
    error
  }
`;

////////////////////////// UPDATE EXPERIENCES SECTION ////////////////////

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
  fragment UpdatedEntriesUnionFragment on UpdatedEntriesUnion {
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
  }
  ${UPDATE_EXPERIENCE_OWN_FIELDS_UNION_FRAGMENT}
  ${UPDATE_DEFINITION_UNION_FRAGMENT}
  ${ENTRY_FRAGMENT}
`;

const UPDATE_EXPERIENCE_SOME_SUCCESS_FRAGMENT = gql`
  fragment UpdateExperienceSomeSuccessFragment on UpdateExperienceSomeSuccess {
    experience {
      ...UpdateExperienceFragment
    }
    entries {
      updatedEntries {
        ...UpdatedEntriesUnionFragment
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
        ... on DeleteEntrySuccess {
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
  }
  ${UPDATE_EXPERIENCE_FRAGMENT}
  ${UPDATE_ENTRY_UNION_FRAGMENT}
  ${CREATE_ENTRY_SUCCESS_FRAGMENT}
  ${CREATE_ENTRY_ERRORS_FRAGMENT}
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
              ...ExperienceErrorFragment
            }
          }
          ... on UpdateExperienceSomeSuccess {
            ...UpdateExperienceSomeSuccessFragment
          }
        }
      }
    }
  }
  ${EXPERIENCE_ERROR_FRAGMENT}
  ${UPDATE_EXPERIENCE_SOME_SUCCESS_FRAGMENT}
`;

////////////////////////// END UPDATE EXPERIENCES SECTION //////////////////

////////////////////////// START CREATE EXPERIENCES SECTION ////////////////

const CREATE_EXPERIENCE_SUCCESS_FRAGMENT = gql`
  fragment CreateExperienceSuccessFragment on ExperienceSuccess {
    experience {
      ...ExperienceFragment
    }
    entries {
      __typename
      ... on CreateEntrySuccess {
        entry {
          ...EntryFragment
        }
      }

      ... on CreateEntryErrors {
        errors {
          ...CreateEntryErrorFragment
        }
      }
    }
  }
  ${EXPERIENCE_FRAGMENT}
  ${ENTRY_FRAGMENT}
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
  mutation CreateExperiences($input: [CreateExperienceInput!]!) {
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
`;

////////////////////////// END CREATE EXPERIENCES SECTION ////////////////

////////////////////////// START DELETE EXPERIENCES SECTION /////////////

const DELETE_EXPERIENCE_ERROR = gql`
  fragment DeleteExperienceErrorFragment on DeleteExperienceError {
    id
    error
  }
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
              ...DeleteExperienceErrorFragment
            }
          }
          ... on DeleteExperienceSuccess {
            experience {
              id
              title
            }
          }
        }

        clientSession
        clientToken
      }
    }
  }

  ${DELETE_EXPERIENCE_ERROR}
`;

export const ON_EXPERIENCES_DELETED_SUBSCRIPTION = gql`
  subscription OnExperiencesDeletedSubscription($clientSession: String!) {
    onExperiencesDeleted(clientSession: $clientSession) {
      experiences {
        id
        title
      }

      clientSession
      clientToken
    }
  }
`;

////////////////////////// END DELETE EXPERIENCES SECTION /////////////

////////////////////////// START GET MINIMAL EXPERIENCES QUERY ///////////////

// this query will be kept around after we ran it and all experiences list will
// refer to it.
export const GET_EXPERIENCES_CONNECTION_MINI_QUERY = gql`
  query GetExperienceConnectionMini(
    $after: String
    $before: String
    $first: Int
    $last: Int
    $ids: [ID]
  ) {
    getExperiences(
      ids: $ids
      after: $after
      before: $before
      first: $first
      last: $last
    ) @connection(key: "getExperiences") {
      pageInfo {
        ...PageInfoFragment
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
  ${PAGE_INFO_FRAGMENT}
`;

////////////////////////// END GET MINIMAL EXPERIENCES QUERY /////////////////

// this query will be deleted after we ran it.
// export const PRE_FETCH_EXPERIENCES_QUERY = gql`
//   query PreFetchExperiences(
//     $input: GetExperiencesInput!
//     $entriesPagination: PaginationInput!
//   ) {
//     getExperiences(input: $input) {
//       ...PreFetchExperienceFragment
//     }
//   }

//   ${PRE_FETCH_EXPERIENCE_FRAGMENT}
// `;

////////////////////////// GET COMPLETE EXPERIENCE QUERY //////////////////

const GET_ENTRIES_UNION_FRAGMENT = gql`
  fragment GetEntriesUnionFragment on GetEntriesUnion {
    ... on GetEntriesSuccess {
      entries {
        ...EntryConnectionFragment
      }
    }

    ... on GetEntriesErrors {
      errors {
        experienceId
        error
      }
    }
  }

  ${ENTRY_CONNECTION_FRAGMENT}
`;

export const GET_COMPLETE_EXPERIENCE_QUERY = gql`
  query GetDetailExperience($experienceId: ID!, $pagination: PaginationInput!) {
    getExperience(id: $experienceId) {
      ...ExperienceFragment
    }

    getEntries(experienceId: $experienceId, pagination: $pagination)
      @connection(key: "getEntries", filter: ["experienceId"]) {
      ...GetEntriesUnionFragment
    }
  }

  ${EXPERIENCE_FRAGMENT}
  ${GET_ENTRIES_UNION_FRAGMENT}
`;

export const GET_EXPERIENCE_QUERY = gql`
  query GetExperience($id: ID!) {
    getExperience(id: $id) {
      ...ExperienceFragment
    }
  }

  ${EXPERIENCE_FRAGMENT}
`;

export const GET_ENTRIES_QUERY = gql`
  query GetEntries($experienceId: ID!, $pagination: PaginationInput!) {
    getEntries(experienceId: $experienceId, pagination: $pagination)
      @connection(key: "getEntries", filter: ["experienceId"]) {
      ...GetEntriesUnionFragment
    }
  }

  ${GET_ENTRIES_UNION_FRAGMENT}
`;

////////////////////////// END GET EXPERIENCE DETAIL //////////////////
