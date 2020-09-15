/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PaginationInput } from "./globalTypes";

// ====================================================
// GraphQL query operation: GetEntries
// ====================================================

export interface GetEntries_getEntries_GetEntriesSuccess_entries_pageInfo {
  __typename: "PageInfo";
  /**
   * When paginating forwards, are there more items?
   */
  hasNextPage: boolean;
  /**
   * When paginating backwards, are there more items?
   */
  hasPreviousPage: boolean;
  /**
   * When paginating backwards, the cursor to continue.
   */
  startCursor: string | null;
  /**
   * When paginating forwards, the cursor to continue.
   */
  endCursor: string | null;
}

export interface GetEntries_getEntries_GetEntriesSuccess_entries_edges_node_dataObjects {
  __typename: "DataObject";
  id: string;
  data: any;
  definitionId: string;
  /**
   * Client ID indicates that data object was created offline
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
}

export interface GetEntries_getEntries_GetEntriesSuccess_entries_edges_node {
  __typename: "Entry";
  /**
   * Entry ID
   */
  id: string;
  /**
   * The ID of experience to which this entry belongs.
   */
  experienceId: string;
  /**
   * The client ID which indicates that an entry has been created while server
   * is offline and is to be saved. The client ID uniquely
   * identifies this entry and will be used to prevent conflict while saving entry
   * created offline and must thus be non null in this situation.
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
  /**
   * The list of data belonging to this entry.
   */
  dataObjects: (GetEntries_getEntries_GetEntriesSuccess_entries_edges_node_dataObjects | null)[];
}

export interface GetEntries_getEntries_GetEntriesSuccess_entries_edges {
  __typename: "EntryEdge";
  cursor: string | null;
  node: GetEntries_getEntries_GetEntriesSuccess_entries_edges_node | null;
}

export interface GetEntries_getEntries_GetEntriesSuccess_entries {
  __typename: "EntryConnection";
  pageInfo: GetEntries_getEntries_GetEntriesSuccess_entries_pageInfo;
  edges: (GetEntries_getEntries_GetEntriesSuccess_entries_edges | null)[] | null;
}

export interface GetEntries_getEntries_GetEntriesSuccess {
  __typename: "GetEntriesSuccess";
  entries: GetEntries_getEntries_GetEntriesSuccess_entries;
}

export interface GetEntries_getEntries_GetEntriesErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface GetEntries_getEntries_GetEntriesErrors {
  __typename: "GetEntriesErrors";
  errors: GetEntries_getEntries_GetEntriesErrors_errors;
}

export type GetEntries_getEntries = GetEntries_getEntries_GetEntriesSuccess | GetEntries_getEntries_GetEntriesErrors;

export interface GetEntries {
  /**
   * Get entries belonging to an experience.
   * The entries returned may be paginated
   */
  getEntries: GetEntries_getEntries | null;
}

export interface GetEntriesVariables {
  experienceId: string;
  pagination: PaginationInput;
}
