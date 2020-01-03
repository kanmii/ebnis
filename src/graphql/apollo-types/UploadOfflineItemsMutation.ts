/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import { CreateExperienceInput, CreateEntriesInput, DataTypes } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: UploadOfflineItemsMutation
// ====================================================

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_dataDefinitions {
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

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_pageInfo {
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

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges_node_dataObjects {
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

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges_node {
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
   * Indicates whether entry has been modified offline, in which case this
   *   property will be true, otherwise it will be falsy
   */
  modOffline: boolean | null;
  /**
   * The list of data belonging to this entry.
   */
  dataObjects: (UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges_node_dataObjects | null)[];
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges {
  __typename: "EntryEdge";
  /**
   * A cursor for use in pagination
   */
  cursor: string;
  /**
   * The item at the end of the edge
   */
  node: UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges_node | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries {
  __typename: "EntryConnection";
  pageInfo: UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_pageInfo;
  edges: (UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries_edges | null)[] | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experience {
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
  hasUnsaved: boolean | null;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: (UploadOfflineItemsMutation_saveOfflineExperiences_experience_dataDefinitions | null)[];
  /**
   * The entries of the experience - can be paginated
   */
  entries: UploadOfflineItemsMutation_saveOfflineExperiences_experience_entries;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors_dataDefinitionsErrors_errors {
  __typename: "DataDefinitionError";
  name: string | null;
  type: string | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors_dataDefinitionsErrors {
  __typename: "DataDefinitionErrors";
  index: number;
  errors: UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors_dataDefinitionsErrors_errors;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors {
  __typename: "CreateExperienceErrors";
  clientId: string | null;
  title: string | null;
  user: string | null;
  dataDefinitionsErrors: (UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors_dataDefinitionsErrors | null)[] | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors {
  __typename: "CreateOfflineExperienceErrors";
  /**
   * The client ID of the failing experience. As user may not have provided a
   *   client ID, this field is nullable and in that case, the index field will
   *   be used to identify this error
   */
  clientId: string;
  /**
   * The index of the failing experience in the list of experiences input
   */
  index: number;
  /**
   * The error object representing the insert failure reasons
   */
  errors: UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors_errors;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors_dataObjectsErrors_errors {
  __typename: "DataObjectError";
  data: string | null;
  definition: string | null;
  definitionId: string | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors_dataObjectsErrors {
  __typename: "DataObjectsErrors";
  index: number;
  clientId: string | null;
  errors: UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors_dataObjectsErrors_errors;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors {
  __typename: "CreateEntryErrors";
  /**
   * May be we failed because entry.clientId is already taken by another
   *   entry belonging to the experience.
   */
  clientId: string | null;
  /**
   * A catch-all field for when we are unable to create an entry
   */
  entry: string | null;
  /**
   * An offline entry of offline experience must have its experience ID same as
   *   experience.clientId.
   */
  experienceId: string | null;
  /**
   * Did we fail because, say, we did could not fetch the experience
   */
  experience: string | null;
  /**
   * Did we fail because there are errors in the data object object?
   */
  dataObjectsErrors: (UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors_dataObjectsErrors | null)[] | null;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors {
  __typename: "CreateEntriesErrors";
  /**
   * The experience ID of the entry which fails to save
   */
  experienceId: string;
  /**
   * The client ID of the entry which fails to save
   */
  clientId: string;
  errors: UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors_errors;
}

export interface UploadOfflineItemsMutation_saveOfflineExperiences {
  __typename: "OfflineExperience";
  /**
   * The experience which was successfully inserted
   *   - will be null if experience fails to insert
   */
  experience: UploadOfflineItemsMutation_saveOfflineExperiences_experience | null;
  /**
   * If the experience fails to insert, then this is the error object
   *   returned
   */
  experienceErrors: UploadOfflineItemsMutation_saveOfflineExperiences_experienceErrors | null;
  /**
   * A list of error objects denoting entries which fail to insert
   */
  entriesErrors: (UploadOfflineItemsMutation_saveOfflineExperiences_entriesErrors | null)[] | null;
}

export interface UploadOfflineItemsMutation_createEntries_entries_dataObjects {
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

export interface UploadOfflineItemsMutation_createEntries_entries {
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
   * Indicates whether entry has been modified offline, in which case this
   *   property will be true, otherwise it will be falsy
   */
  modOffline: boolean | null;
  /**
   * The list of data belonging to this entry.
   */
  dataObjects: (UploadOfflineItemsMutation_createEntries_entries_dataObjects | null)[];
}

export interface UploadOfflineItemsMutation_createEntries_errors_errors_dataObjectsErrors_errors {
  __typename: "DataObjectError";
  data: string | null;
  definition: string | null;
  definitionId: string | null;
}

export interface UploadOfflineItemsMutation_createEntries_errors_errors_dataObjectsErrors {
  __typename: "DataObjectsErrors";
  index: number;
  clientId: string | null;
  errors: UploadOfflineItemsMutation_createEntries_errors_errors_dataObjectsErrors_errors;
}

export interface UploadOfflineItemsMutation_createEntries_errors_errors {
  __typename: "CreateEntryErrors";
  /**
   * May be we failed because entry.clientId is already taken by another
   *   entry belonging to the experience.
   */
  clientId: string | null;
  /**
   * A catch-all field for when we are unable to create an entry
   */
  entry: string | null;
  /**
   * An offline entry of offline experience must have its experience ID same as
   *   experience.clientId.
   */
  experienceId: string | null;
  /**
   * Did we fail because, say, we did could not fetch the experience
   */
  experience: string | null;
  /**
   * Did we fail because there are errors in the data object object?
   */
  dataObjectsErrors: (UploadOfflineItemsMutation_createEntries_errors_errors_dataObjectsErrors | null)[] | null;
}

export interface UploadOfflineItemsMutation_createEntries_errors {
  __typename: "CreateEntriesErrors";
  /**
   * The experience ID of the entry which fails to save
   */
  experienceId: string;
  /**
   * The client ID of the entry which fails to save
   */
  clientId: string;
  errors: UploadOfflineItemsMutation_createEntries_errors_errors;
}

export interface UploadOfflineItemsMutation_createEntries {
  __typename: "CreateEntriesResponse";
  /**
   * Experience ID of an entry we are trying to create
   */
  experienceId: string;
  /**
   * The entries that were successfully inserted for a particular
   *   experience ID
   */
  entries: (UploadOfflineItemsMutation_createEntries_entries | null)[];
  /**
   * List of error objects denoting entries that fail to insert for
   *   a particular experience ID
   */
  errors: (UploadOfflineItemsMutation_createEntries_errors | null)[] | null;
}

export interface UploadOfflineItemsMutation {
  /**
   * Save many experiences created offline
   */
  saveOfflineExperiences: (UploadOfflineItemsMutation_saveOfflineExperiences | null)[] | null;
  /**
   * Create several entries, for one or more experiences
   */
  createEntries: (UploadOfflineItemsMutation_createEntries | null)[] | null;
}

export interface UploadOfflineItemsMutationVariables {
  offlineExperiencesInput: CreateExperienceInput[];
  offlineEntriesInput: CreateEntriesInput[];
}
