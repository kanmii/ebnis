/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { GetExperiencesInput, PaginationInput, DataTypes } from "./globalTypes";

// ====================================================
// GraphQL query operation: PreFetchExperiences
// ====================================================

export interface PreFetchExperiences_getExperiences_edges_node_dataDefinitions {
  __typename: "DataDefinition";
  id: string;
  /**
   * Name of field e.g start, end, meal
   */
  name: string;
  /**
   * The data type
   */
  type: DataTypes;
  /**
   * String that uniquely identifies this data definition has been
   *   created offline. If an associated entry is also created
   *   offline, then `dataDefinition.definitionId` **MUST BE** the same as this
   *   field and will be validated as such.
   */
  clientId: string | null;
}

export interface PreFetchExperiences_getExperiences_edges_node_entries_pageInfo {
  __typename: "PageInfo";
  /**
   * When paginating forwards, are there more items?
   */
  hasNextPage: boolean;
  /**
   * When paginating backwards, are there more items?
   */
  hasPreviousPage: boolean;
}

export interface PreFetchExperiences_getExperiences_edges_node_entries_edges_node_dataObjects {
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

export interface PreFetchExperiences_getExperiences_edges_node_entries_edges_node {
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
   *   is offline and is to be saved. The client ID uniquely
   *   identifies this entry and will be used to prevent conflict while saving entry
   *   created offline and must thus be non null in this situation.
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
  /**
   * The list of data belonging to this entry.
   */
  dataObjects: (PreFetchExperiences_getExperiences_edges_node_entries_edges_node_dataObjects | null)[];
}

export interface PreFetchExperiences_getExperiences_edges_node_entries_edges {
  __typename: "EntryEdge";
  /**
   * A cursor for use in pagination
   */
  cursor: string;
  /**
   * The item at the end of the edge
   */
  node: PreFetchExperiences_getExperiences_edges_node_entries_edges_node | null;
}

export interface PreFetchExperiences_getExperiences_edges_node_entries {
  __typename: "EntryConnection";
  pageInfo: PreFetchExperiences_getExperiences_edges_node_entries_pageInfo;
  edges: (PreFetchExperiences_getExperiences_edges_node_entries_edges | null)[] | null;
}

export interface PreFetchExperiences_getExperiences_edges_node {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: PreFetchExperiences_getExperiences_edges_node_dataDefinitions[];
  /**
   * The entries of the experience - can be paginated
   */
  entries: PreFetchExperiences_getExperiences_edges_node_entries;
}

export interface PreFetchExperiences_getExperiences_edges {
  __typename: "ExperienceEdge";
  /**
   * A cursor for use in pagination
   */
  cursor: string;
  /**
   * The item at the end of the edge
   */
  node: PreFetchExperiences_getExperiences_edges_node | null;
}

export interface PreFetchExperiences_getExperiences {
  __typename: "ExperienceConnection";
  edges: (PreFetchExperiences_getExperiences_edges | null)[] | null;
}

export interface PreFetchExperiences {
  /**
   * Get all experiences belonging to a user.
   *   The experiences returned may be paginated
   *   and may be filtered by IDs
   */
  getExperiences: PreFetchExperiences_getExperiences | null;
}

export interface PreFetchExperiencesVariables {
  input: GetExperiencesInput;
  entriesPagination: PaginationInput;
}
