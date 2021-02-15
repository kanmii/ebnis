/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import {
  UpdateExperienceInput,
  CreateExperienceInput,
  DataTypes,
} from "./globalTypes";

// ====================================================
// GraphQL mutation operation: SyncToServer
// ====================================================

export interface SyncToServer_updateExperiences_UpdateExperiencesAllFail {
  __typename: "UpdateExperiencesAllFail";
  /**
   * This will mostly be authorization error
   */
  error: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors {
  __typename: "UpdateExperienceErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors {
  __typename: "UpdateExperienceOwnFieldsError";
  title: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors {
  __typename: "UpdateExperienceOwnFieldsErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess_data {
  __typename: "ExperienceOwnFields";
  title: string;
  description: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess {
  __typename: "ExperienceOwnFieldsSuccess";
  data: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess_data;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors_errors {
  __typename: "DefinitionError";
  /**
   * ID of the definition that failed
   */
  id: string;
  /**
   * The name of the definition is not unique or less than minimum char
   * length
   */
  name: string | null;
  /**
   * The type is not in the list of allowed data types
   */
  type: string | null;
  /**
   * May be we can't find the definition during an update
   */
  error: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors {
  __typename: "DefinitionErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess_definition {
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

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess {
  __typename: "DefinitionSuccess";
  definition: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess_definition;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience {
  __typename: "UpdateExperience";
  experienceId: string;
  updatedAt: any;
  ownFields: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields | null;
  updatedDefinitions:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions[]
    | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors_errors {
  __typename: "UpdateEntryError";
  entryId: string;
  error: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors {
  __typename: "UpdateEntryErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors {
  __typename: "DataObjectError";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
  /**
   * For generic errors unrelated to the fields of the data object e.g.
   * not found error
   */
  error: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors {
  __typename: "DataObjectErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject {
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

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess {
  __typename: "DataObjectSuccess";
  dataObject: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry {
  __typename: "UpdateEntry";
  entryId: string;
  /**
   * If any entry data objects is updated, then the entry itself will
   * be updated to the latest dataObject.updatedAt
   */
  updatedAt: any | null;
  dataObjects: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects[];
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess {
  __typename: "UpdateEntrySomeSuccess";
  entry: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects {
  __typename: "DataObjectError";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors {
  __typename: "CreateEntryError";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_meta;
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
  dataObjects:
    | (SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects | null)[]
    | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors {
  __typename: "CreateEntryErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry_dataObjects {
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

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry {
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
  dataObjects: (SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry_dataObjects | null)[];
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess {
  __typename: "CreateEntrySuccess";
  entry: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess_entry {
  __typename: "Entry";
  /**
   * Entry ID
   */
  id: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess {
  __typename: "DeleteEntrySuccess";
  entry: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess_entry;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors_errors {
  __typename: "DeleteEntryError";
  id: string;
  /**
   * This will mostly be 'not found error'
   */
  error: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors {
  __typename: "DeleteEntryErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors_errors;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries {
  __typename: "UpdateExperienceEntriesKomponenten";
  updatedEntries:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries[]
    | null;
  newEntries:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries[]
    | null;
  deletedEntries:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries[]
    | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess {
  __typename: "CommentSuccess";
  comment: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess_comment;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_meta {
  __typename: "CommentErrorsMeta";
  /**
   * The index of the comment in the list of comments sent for processing
   */
  index: number;
  /**
   * For a comment deleted, this will be a non empty ID
   * For an offline comment created, this will be a non empty ID
   * For all other cases, e.g. online comment create, the ID can be null or
   *   empty
   */
  id: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_meta;
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess {
  __typename: "CommentSuccess";
  comment: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess_comment;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_meta {
  __typename: "CommentErrorsMeta";
  /**
   * The index of the comment in the list of comments sent for processing
   */
  index: number;
  /**
   * For a comment deleted, this will be a non empty ID
   * For an offline comment created, this will be a non empty ID
   * For all other cases, e.g. online comment create, the ID can be null or
   *   empty
   */
  id: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_meta;
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess {
  __typename: "CommentSuccess";
  comment: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess_comment;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_meta {
  __typename: "CommentErrorsMeta";
  /**
   * The index of the comment in the list of comments sent for processing
   */
  index: number;
  /**
   * For a comment deleted, this will be a non empty ID
   * For an offline comment created, this will be a non empty ID
   * For all other cases, e.g. online comment create, the ID can be null or
   *   empty
   */
  id: string;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_meta;
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_errors;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments {
  __typename: "CommentCrud";
  updates:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates[]
    | null;
  inserts:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts[]
    | null;
  deletes:
    | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes[]
    | null;
}

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess {
  __typename: "UpdateExperienceSomeSuccess";
  experience: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience;
  entries: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries | null;
  comments: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments | null;
}

export type SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences =
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess;

export interface SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess {
  __typename: "UpdateExperiencesSomeSuccess";
  experiences: SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess_experiences[];
}

export type SyncToServer_updateExperiences =
  | SyncToServer_updateExperiences_UpdateExperiencesAllFail
  | SyncToServer_updateExperiences_UpdateExperiencesSomeSuccess;

export interface SyncToServer_createExperiences_ExperienceSuccess_experience_dataDefinitions {
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

export interface SyncToServer_createExperiences_ExperienceSuccess_experience_comments {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_experience {
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
  dataDefinitions: SyncToServer_createExperiences_ExperienceSuccess_experience_dataDefinitions[];
  /**
   * The list of comments belonging to an experience
   */
  comments:
    | (SyncToServer_createExperiences_ExperienceSuccess_experience_comments | null)[]
    | null;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry_dataObjects {
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

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry {
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
  dataObjects: (SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry_dataObjects | null)[];
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess {
  __typename: "CreateEntrySuccess";
  entry: SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess_entry;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects {
  __typename: "DataObjectError";
  meta: SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors {
  __typename: "CreateEntryError";
  meta: SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_meta;
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
  dataObjects:
    | (SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors_dataObjects | null)[]
    | null;
}

export interface SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors {
  __typename: "CreateEntryErrors";
  errors: SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors_errors;
}

export type SyncToServer_createExperiences_ExperienceSuccess_entries =
  | SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntrySuccess
  | SyncToServer_createExperiences_ExperienceSuccess_entries_CreateEntryErrors;

export interface SyncToServer_createExperiences_ExperienceSuccess {
  __typename: "ExperienceSuccess";
  experience: SyncToServer_createExperiences_ExperienceSuccess_experience;
  entries: SyncToServer_createExperiences_ExperienceSuccess_entries[] | null;
}

export interface SyncToServer_createExperiences_CreateExperienceErrors_errors_meta {
  __typename: "CreateExperienceErrorMeta";
  /**
   * The index of the failing experience in the list of experiences input
   */
  index: number;
  clientId: string | null;
}

export interface SyncToServer_createExperiences_CreateExperienceErrors_errors_dataDefinitions {
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

export interface SyncToServer_createExperiences_CreateExperienceErrors_errors {
  __typename: "CreateExperienceError";
  meta: SyncToServer_createExperiences_CreateExperienceErrors_errors_meta;
  /**
   * A catch all for error unrelated to fields of experience e.g. an exception
   * was raised
   */
  error: string | null;
  title: string | null;
  user: string | null;
  clientId: string | null;
  dataDefinitions:
    | (SyncToServer_createExperiences_CreateExperienceErrors_errors_dataDefinitions | null)[]
    | null;
}

export interface SyncToServer_createExperiences_CreateExperienceErrors {
  __typename: "CreateExperienceErrors";
  errors: SyncToServer_createExperiences_CreateExperienceErrors_errors;
}

export type SyncToServer_createExperiences =
  | SyncToServer_createExperiences_ExperienceSuccess
  | SyncToServer_createExperiences_CreateExperienceErrors;

export interface SyncToServer {
  /**
   * Update several experiences at once
   */
  updateExperiences: SyncToServer_updateExperiences | null;
  /**
   * Create many experiences
   */
  createExperiences: SyncToServer_createExperiences[] | null;
}

export interface SyncToServerVariables {
  updateInput: UpdateExperienceInput[];
  createInput: CreateExperienceInput[];
}
