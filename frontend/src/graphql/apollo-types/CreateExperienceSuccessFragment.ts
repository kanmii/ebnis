/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes } from "./globalTypes";

// ====================================================
// GraphQL fragment: CreateExperienceSuccessFragment
// ====================================================

export interface CreateExperienceSuccessFragment_experience_dataDefinitions {
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

export interface CreateExperienceSuccessFragment_experience_entries_pageInfo {
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

export interface CreateExperienceSuccessFragment_experience_entries_edges_node_dataObjects {
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

export interface CreateExperienceSuccessFragment_experience_entries_edges_node {
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
  dataObjects: (CreateExperienceSuccessFragment_experience_entries_edges_node_dataObjects | null)[];
}

export interface CreateExperienceSuccessFragment_experience_entries_edges {
  __typename: "EntryEdge";
  /**
   * A cursor for use in pagination
   */
  cursor: string;
  /**
   * The item at the end of the edge
   */
  node: CreateExperienceSuccessFragment_experience_entries_edges_node | null;
}

export interface CreateExperienceSuccessFragment_experience_entries {
  __typename: "EntryConnection";
  pageInfo: CreateExperienceSuccessFragment_experience_entries_pageInfo;
  edges: (CreateExperienceSuccessFragment_experience_entries_edges | null)[] | null;
}

export interface CreateExperienceSuccessFragment_experience {
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
   *   offline and to be saved , the client ID uniquely identifies such and can
   *   be used to enforce uniqueness at the DB level. Not providing client_id
   *   assumes a fresh experience.
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: CreateExperienceSuccessFragment_experience_dataDefinitions[];
  /**
   * The entries of the experience - can be paginated
   */
  entries: CreateExperienceSuccessFragment_experience_entries;
}

export interface CreateExperienceSuccessFragment_entriesErrors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface CreateExperienceSuccessFragment_entriesErrors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface CreateExperienceSuccessFragment_entriesErrors_dataObjects {
  __typename: "DataObjectError";
  meta: CreateExperienceSuccessFragment_entriesErrors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface CreateExperienceSuccessFragment_entriesErrors {
  __typename: "CreateEntryError";
  meta: CreateExperienceSuccessFragment_entriesErrors_meta;
  /**
   * A catch-all field for when we are unable to create an entry
   */
  error: string | null;
  /**
   * May be we failed because entry.clientId is already taken by another
   *   entry belonging to the experience.
   */
  clientId: string | null;
  /**
   * An offline entry of offline experience must have its experience ID same as
   *   experience.clientId.
   */
  experienceId: string | null;
  /**
   * Did we fail because there are errors in the data object object?
   */
  dataObjects: (CreateExperienceSuccessFragment_entriesErrors_dataObjects | null)[] | null;
}

export interface CreateExperienceSuccessFragment {
  __typename: "ExperienceSuccess";
  experience: CreateExperienceSuccessFragment_experience;
  entriesErrors: CreateExperienceSuccessFragment_entriesErrors[] | null;
}
