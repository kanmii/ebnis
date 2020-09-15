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
   * created offline. If an associated entry is also created
   * offline, then `dataDefinition.definitionId` **MUST BE** the same as this
   * field and will be validated as such.
   */
  clientId: string | null;
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
  dataDefinitions: CreateExperienceSuccessFragment_experience_dataDefinitions[];
}

export interface CreateExperienceSuccessFragment_entries_CreateEntrySuccess_entry_dataObjects {
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

export interface CreateExperienceSuccessFragment_entries_CreateEntrySuccess_entry {
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
  dataObjects: (CreateExperienceSuccessFragment_entries_CreateEntrySuccess_entry_dataObjects | null)[];
}

export interface CreateExperienceSuccessFragment_entries_CreateEntrySuccess {
  __typename: "CreateEntrySuccess";
  entry: CreateExperienceSuccessFragment_entries_CreateEntrySuccess_entry;
}

export interface CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_dataObjects {
  __typename: "DataObjectError";
  meta: CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors {
  __typename: "CreateEntryError";
  meta: CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_meta;
  /**
   * A catch-all field for when we are unable to create an entry
   */
  error: string | null;
  /**
   * May be we failed because entry.clientId is already taken by another
   * entry belonging to the experience.
   */
  clientId: string | null;
  /**
   * An offline entry of offline experience must have its experience ID same as
   * experience.clientId.
   */
  experienceId: string | null;
  /**
   * Did we fail because there are errors in the data object object?
   */
  dataObjects: (CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors_dataObjects | null)[] | null;
}

export interface CreateExperienceSuccessFragment_entries_CreateEntryErrors {
  __typename: "CreateEntryErrors";
  errors: CreateExperienceSuccessFragment_entries_CreateEntryErrors_errors;
}

export type CreateExperienceSuccessFragment_entries = CreateExperienceSuccessFragment_entries_CreateEntrySuccess | CreateExperienceSuccessFragment_entries_CreateEntryErrors;

export interface CreateExperienceSuccessFragment {
  __typename: "ExperienceSuccess";
  experience: CreateExperienceSuccessFragment_experience;
  entries: CreateExperienceSuccessFragment_entries[] | null;
}
