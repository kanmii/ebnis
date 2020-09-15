/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { CreateExperienceInput, DataTypes } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: CreateExperiences
// ====================================================

export interface CreateExperiences_createExperiences_ExperienceSuccess_experience_dataDefinitions {
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

export interface CreateExperiences_createExperiences_ExperienceSuccess_experience {
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
  dataDefinitions: CreateExperiences_createExperiences_ExperienceSuccess_experience_dataDefinitions[];
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry_dataObjects {
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

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry {
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
  dataObjects: (CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry_dataObjects | null)[];
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess {
  __typename: "CreateEntrySuccess";
  entry: CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry;
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects {
  __typename: "DataObjectError";
  meta: CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors {
  __typename: "CreateEntryError";
  meta: CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_meta;
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
  dataObjects: (CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects | null)[] | null;
}

export interface CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors {
  __typename: "CreateEntryErrors";
  errors: CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors;
}

export type CreateExperiences_createExperiences_ExperienceSuccess_entries = CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess | CreateExperiences_createExperiences_ExperienceSuccess_entries_CreateEntryErrors;

export interface CreateExperiences_createExperiences_ExperienceSuccess {
  __typename: "ExperienceSuccess";
  experience: CreateExperiences_createExperiences_ExperienceSuccess_experience;
  entries: CreateExperiences_createExperiences_ExperienceSuccess_entries[] | null;
}

export interface CreateExperiences_createExperiences_CreateExperienceErrors_errors_meta {
  __typename: "CreateExperienceErrorMeta";
  /**
   * The index of the failing experience in the list of experiences input
   */
  index: number;
  clientId: string | null;
}

export interface CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions {
  __typename: "CreateDefinitionErrors";
  index: number;
  /**
   * name taken by another definition for the experience or name too short?
   */
  name: string | null;
  /**
   * Using unapproved data type or data can not be cast to type?
   */
  type: string | null;
}

export interface CreateExperiences_createExperiences_CreateExperienceErrors_errors {
  __typename: "CreateExperienceError";
  meta: CreateExperiences_createExperiences_CreateExperienceErrors_errors_meta;
  /**
   * A catch all for error unrelated to fields of experience e.g. an exception
   * was raised
   */
  error: string | null;
  title: string | null;
  user: string | null;
  clientId: string | null;
  dataDefinitions: (CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions | null)[] | null;
}

export interface CreateExperiences_createExperiences_CreateExperienceErrors {
  __typename: "CreateExperienceErrors";
  errors: CreateExperiences_createExperiences_CreateExperienceErrors_errors;
}

export type CreateExperiences_createExperiences = CreateExperiences_createExperiences_ExperienceSuccess | CreateExperiences_createExperiences_CreateExperienceErrors;

export interface CreateExperiences {
  /**
   * Create many experiences
   */
  createExperiences: CreateExperiences_createExperiences[] | null;
}

export interface CreateExperiencesVariables {
  input: CreateExperienceInput[];
}
