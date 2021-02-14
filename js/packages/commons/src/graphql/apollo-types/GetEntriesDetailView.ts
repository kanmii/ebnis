/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PaginationInput } from "./globalTypes";

// ====================================================
// GraphQL query operation: GetEntriesDetailView
// ====================================================

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_pageInfo {
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

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges_node_dataObjects {
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

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges_node {
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
  dataObjects: (GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges_node_dataObjects | null)[];
}

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges {
  __typename: "EntryEdge";
  cursor: string | null;
  node: GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges_node | null;
}

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess_entries {
  __typename: "EntryConnection";
  pageInfo: GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_pageInfo;
  edges:
    | (GetEntriesDetailView_getEntries_GetEntriesSuccess_entries_edges | null)[]
    | null;
}

export interface GetEntriesDetailView_getEntries_GetEntriesSuccess {
  __typename: "GetEntriesSuccess";
  entries: GetEntriesDetailView_getEntries_GetEntriesSuccess_entries;
}

export interface GetEntriesDetailView_getEntries_GetEntriesErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface GetEntriesDetailView_getEntries_GetEntriesErrors {
  __typename: "GetEntriesErrors";
  errors: GetEntriesDetailView_getEntries_GetEntriesErrors_errors;
}

export type GetEntriesDetailView_getEntries =
  | GetEntriesDetailView_getEntries_GetEntriesSuccess
  | GetEntriesDetailView_getEntries_GetEntriesErrors;

export interface GetEntriesDetailView {
  /**
   * Get entries belonging to an experience.
   * The entries returned may be paginated
   */
  getEntries: GetEntriesDetailView_getEntries | null;
}

export interface GetEntriesDetailViewVariables {
  experienceId: string;
  pagination: PaginationInput;
}
