/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PaginationInput, DataTypes } from "./globalTypes";

// ====================================================
// GraphQL query operation: GetDetailExperience
// ====================================================

export interface GetDetailExperience_getExperience_dataDefinitions {
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
   * created offline. If an associated entry is also created
   * offline, then `dataDefinition.definitionId` **MUST BE** the same as this
   * field and will be validated as such.
   */
  clientId: string | null;
}

export interface GetDetailExperience_getExperience_entries_pageInfo {
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

export interface GetDetailExperience_getExperience_entries_edges_node_dataObjects {
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

export interface GetDetailExperience_getExperience_entries_edges_node {
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
  dataObjects: (GetDetailExperience_getExperience_entries_edges_node_dataObjects | null)[];
}

export interface GetDetailExperience_getExperience_entries_edges {
  __typename: "EntryEdge";
  cursor: string | null;
  node: GetDetailExperience_getExperience_entries_edges_node | null;
}

export interface GetDetailExperience_getExperience_entries {
  __typename: "EntryConnection";
  pageInfo: GetDetailExperience_getExperience_entries_pageInfo;
  edges: (GetDetailExperience_getExperience_entries_edges | null)[] | null;
}

export interface GetDetailExperience_getExperience {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  title: string;
  /**
   * The description of the experience
   */
  description: string | null;
  /**
   * The client ID. For experiences created on the client while server is
   * offline and to be saved , the client ID uniquely identifies such and can
   * be used to enforce uniqueness at the DB level. Not providing client_id
   * assumes a fresh experience.
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: GetDetailExperience_getExperience_dataDefinitions[];
  /**
   * The entries of the experience - can be paginated
   */
  entries: GetDetailExperience_getExperience_entries;
}

export interface GetDetailExperience {
  /**
   * Get an experience
   */
  getExperience: GetDetailExperience_getExperience | null;
}

export interface GetDetailExperienceVariables {
  id: string;
  entriesPagination: PaginationInput;
}
