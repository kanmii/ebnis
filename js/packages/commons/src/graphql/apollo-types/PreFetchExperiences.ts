/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { PaginationInput, DataTypes } from "./globalTypes";

// ====================================================
// GraphQL query operation: PreFetchExperiences
// ====================================================

export interface PreFetchExperiences_preFetchExperiences_dataDefinitions {
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

export interface PreFetchExperiences_preFetchExperiences_comments {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface PreFetchExperiences_preFetchExperiences_entries_pageInfo {
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

export interface PreFetchExperiences_preFetchExperiences_entries_edges_node_dataObjects {
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

export interface PreFetchExperiences_preFetchExperiences_entries_edges_node {
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
  dataObjects: (PreFetchExperiences_preFetchExperiences_entries_edges_node_dataObjects | null)[];
}

export interface PreFetchExperiences_preFetchExperiences_entries_edges {
  __typename: "EntryEdge";
  cursor: string | null;
  node: PreFetchExperiences_preFetchExperiences_entries_edges_node | null;
}

export interface PreFetchExperiences_preFetchExperiences_entries {
  __typename: "EntryConnection";
  pageInfo: PreFetchExperiences_preFetchExperiences_entries_pageInfo;
  edges:
    | (PreFetchExperiences_preFetchExperiences_entries_edges | null)[]
    | null;
}

export interface PreFetchExperiences_preFetchExperiences {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: PreFetchExperiences_preFetchExperiences_dataDefinitions[];
  /**
   * The list of comments belonging to an experience
   */
  comments: (PreFetchExperiences_preFetchExperiences_comments | null)[] | null;
  /**
   * The entries of the experience - can be paginated
   */
  entries: PreFetchExperiences_preFetchExperiences_entries;
}

export interface PreFetchExperiences {
  /**
   * Wenn der Klient erstmal die Erfahrungen bestellt mit wenige Besitztümer,
   * und muss später mehr Besitztümer bestellen
   */
  preFetchExperiences:
    | (PreFetchExperiences_preFetchExperiences | null)[]
    | null;
}

export interface PreFetchExperiencesVariables {
  ids: string[];
  entryPagination: PaginationInput;
}
