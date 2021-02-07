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

export const EXPERIENCE_LIST_VIEW_FRAGMENT = gql`
  fragment ExperienceListViewFragment on Experience {
    id
    title
    description
    clientId
    insertedAt
    updatedAt
  }
`;

export const COMMENT_FRAGMENT = gql`
  fragment CommentFragment on Comment {
    id
    text
  }
`;

// the fields not in list view fragment.
export const EXPERIENCE_REST_FRAGMENT = gql`
  fragment ExperienceRestFragment on Experience {
    id
    dataDefinitions {
      ...DataDefinitionFragment
    }
    comments {
      ...CommentFragment
    }
  }

  ${DEFINITION_FRAGMENT}
  ${COMMENT_FRAGMENT}
`;

// ====================================================
// Experience fetched on entering detailed view
// It includes all fields minus comments
// ====================================================

export const EXPERIENCE_DETAIL_VIEW_FRAGMENT = gql`
  fragment ExperienceDetailViewFragment on Experience {
    ...ExperienceListViewFragment

    dataDefinitions {
      ...DataDefinitionFragment
    }
  }

  ${EXPERIENCE_LIST_VIEW_FRAGMENT}
  ${DEFINITION_FRAGMENT}
`;

export const EXPERIENCE_COMPLETE_FRAGMENT = gql`
  fragment ExperienceCompleteFragment on Experience {
    id
    title
    description
    clientId
    insertedAt
    updatedAt
    dataDefinitions {
      ...DataDefinitionFragment
    }
    comments {
      ...CommentFragment
    }
  }

  ${DEFINITION_FRAGMENT}
  ${COMMENT_FRAGMENT}
`;

export const FRAGMENT_NAME_experienceCompleteFragment =
  "ExperienceCompleteFragment";

export const EXPERIENCE_CONNECTION_FRAGMENT = gql`
  fragment ExperienceConnectionFragment on ExperienceConnection {
    pageInfo {
      ...PageInfoFragment
    }

    edges {
      cursor
      node {
        ...ExperienceDetailViewFragment
      }
    }
  }

  ${EXPERIENCE_DETAIL_VIEW_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
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
            id
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

const UPDATE_EXPERIENCES_ONLINE_FRAGMENT = gql`
  fragment UpdateExperiencesOnlineFragment on UpdateExperiencesUnion {
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
  ${EXPERIENCE_ERROR_FRAGMENT}
  ${UPDATE_EXPERIENCE_SOME_SUCCESS_FRAGMENT}
`;

export const UPDATE_EXPERIENCES_ONLINE_MUTATION = gql`
  mutation UpdateExperiencesOnline($input: [UpdateExperienceInput!]!) {
    updateExperiences(input: $input) {
      ...UpdateExperiencesOnlineFragment
    }
  }
  ${UPDATE_EXPERIENCES_ONLINE_FRAGMENT}
`;

////////////////////////// END UPDATE EXPERIENCES SECTION //////////////////

////////////////////////// START CREATE EXPERIENCES SECTION ////////////////

const CREATE_EXPERIENCE_SUCCESS_FRAGMENT = gql`
  fragment CreateExperienceSuccessFragment on ExperienceSuccess {
    experience {
      ...ExperienceCompleteFragment
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
  ${EXPERIENCE_COMPLETE_FRAGMENT}
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

const CREATE_EXPERIENCES_FRAGMENT = gql`
  fragment CreateExperiencesFragment on CreateExperienceUnion {
    __typename
    ... on ExperienceSuccess {
      ...CreateExperienceSuccessFragment
    }
    ... on CreateExperienceErrors {
      ...CreateExperienceErrorsFragment
    }
  }
  ${CREATE_EXPERIENCE_SUCCESS_FRAGMENT}
  ${CREATE_EXPERIENCE_ERRORS_FRAGMENT}
`;

export const CREATE_EXPERIENCES_MUTATION = gql`
  mutation CreateExperiences($input: [CreateExperienceInput!]!) {
    createExperiences(input: $input) {
      ...CreateExperiencesFragment
    }
  }
  ${CREATE_EXPERIENCES_FRAGMENT}
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

// ====================================================
// Start Get experiences for the list view
// this query will be kept around after we ran it and all experiences list
// will refer to it.
// ====================================================
export const GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY = gql`
  query GetExperiencesConnectionListView(
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
          ...ExperienceListViewFragment
        }
      }
    }
  }

  ${EXPERIENCE_LIST_VIEW_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;
// ====================================================
// End get experiences for the list view
// ====================================================

// this query will be deleted after we run it.
export const PRE_FETCH_EXPERIENCES_QUERY = gql`
  query PreFetchExperiences($ids: [ID!]!, $entryPagination: PaginationInput!) {
    preFetchExperiences(ids: $ids, entryPagination: $entryPagination) {
      ...ExperienceRestFragment
      entries(pagination: $entryPagination) {
        ...EntryConnectionFragment
      }
    }
  }

  ${EXPERIENCE_REST_FRAGMENT}
  ${ENTRY_CONNECTION_FRAGMENT}
`;

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

export const GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY = gql`
  query GetExperienceAndEntriesDetailView(
    $experienceId: ID!
    $pagination: PaginationInput!
  ) {
    getExperience(id: $experienceId) {
      ...ExperienceDetailViewFragment
    }

    getEntries(experienceId: $experienceId, pagination: $pagination)
      @connection(key: "getEntries", filter: ["experienceId"]) {
      ...GetEntriesUnionFragment
    }
  }

  ${EXPERIENCE_DETAIL_VIEW_FRAGMENT}
  ${GET_ENTRIES_UNION_FRAGMENT}
`;

export const GET_EXPERIENCE_DETAIL_VIEW_QUERY = gql`
  query GetExperienceDetailView($id: ID!) {
    getExperience(id: $id) {
      ...ExperienceDetailViewFragment
    }
  }

  ${EXPERIENCE_DETAIL_VIEW_FRAGMENT}
`;

export const GET_ENTRIES_DETAIL_VIEW_QUERY = gql`
  query GetEntriesDetailView(
    $experienceId: ID!
    $pagination: PaginationInput!
  ) {
    getEntries(experienceId: $experienceId, pagination: $pagination)
      @connection(key: "getEntries", filter: ["experienceId"]) {
      ...GetEntriesUnionFragment
    }
  }

  ${GET_ENTRIES_UNION_FRAGMENT}
`;

////////////////////////// END GET EXPERIENCE DETAIL //////////////////

////////////////////////// GET DATA OBJECTS //////////////////

export const GET_DATA_OBJECTS_QUERY = gql`
  query GetDataObjects($ids: [ID!]!) {
    getDataObjects(ids: $ids) {
      id
      data
    }
  }
`;

////////////////////////// END GET DATA OBJECTS //////////////////

////////////////////////// START SYNC_TO_SERVER ////////////////////////////

export const SYNC_TO_SERVER_MUTATION = gql`
  mutation SyncToServer(
    $updateInput: [UpdateExperienceInput!]!
    $createInput: [CreateExperienceInput!]!
  ) {
    updateExperiences(input: $updateInput) {
      ...UpdateExperiencesOnlineFragment
    }

    createExperiences(input: $createInput) {
      ...CreateExperiencesFragment
    }
  }
  ${UPDATE_EXPERIENCES_ONLINE_FRAGMENT}
  ${CREATE_EXPERIENCES_FRAGMENT}
`;

////////////////////////// END START SYNC_TO_SERVER ////////////////////////////

const GET_EXPERIENCE_COMMENTS_ERRORS_FRAGMENT = gql`
  fragment GetExperienceCommentsErrorsFragment on GetExperienceCommentsErrors {
    errors {
      experienceId
      error
    }
  }
`;

const GET_EXPERIENCE_COMMENTS_UNION_FRAGMENT = gql`
  fragment GetExperienceCommentsUnionFragment on GetExperienceCommentsUnion {
    ... on GetExperienceCommentsSuccess {
      comments {
        ...CommentFragment
      }
    }

    ... on GetExperienceCommentsErrors {
      ...GetExperienceCommentsErrorsFragment
    }
  }

  ${COMMENT_FRAGMENT}
  ${GET_EXPERIENCE_COMMENTS_ERRORS_FRAGMENT}
`;

export const GET_EXPERIENCE_COMMENTS_QUERY = gql`
  query GetExperienceComments($experienceId: ID!) {
    getExperienceComments(experienceId: $experienceId) {
      ...GetExperienceCommentsUnionFragment
    }
  }

  ${GET_EXPERIENCE_COMMENTS_UNION_FRAGMENT}
`;
