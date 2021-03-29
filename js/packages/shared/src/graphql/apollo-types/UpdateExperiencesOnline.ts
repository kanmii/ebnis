/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes, UpdateExperienceInput } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: UpdateExperiencesOnline
// ====================================================

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesAllFail {
  __typename: "UpdateExperiencesAllFail";
  /**
   * This will mostly be authorization error
   */
  error: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors {
  __typename: "UpdateExperienceErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors {
  __typename: "UpdateExperienceOwnFieldsError";
  title: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors {
  __typename: "UpdateExperienceOwnFieldsErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess_data {
  __typename: "ExperienceOwnFields";
  title: string;
  description: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess {
  __typename: "ExperienceOwnFieldsSuccess";
  data: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess_data;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_UpdateExperienceOwnFieldsErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields_ExperienceOwnFieldsSuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors_errors {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors {
  __typename: "DefinitionErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess_definition {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess {
  __typename: "DefinitionSuccess";
  definition: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess_definition;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions_DefinitionSuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience {
  __typename: "UpdateExperience";
  experienceId: string;
  updatedAt: any;
  ownFields: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_ownFields | null;
  updatedDefinitions:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience_updatedDefinitions[]
    | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors_errors {
  __typename: "UpdateEntryError";
  entryId: string;
  error: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors {
  __typename: "UpdateEntryErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors {
  __typename: "DataObjectError";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta;
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors {
  __typename: "DataObjectErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess {
  __typename: "DataObjectSuccess";
  dataObject: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry {
  __typename: "UpdateEntry";
  entryId: string;
  /**
   * If any entry data objects is updated, then the entry itself will
   * be updated to the latest dataObject.updatedAt
   */
  updatedAt: any | null;
  dataObjects: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects[];
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess {
  __typename: "UpdateEntrySomeSuccess";
  entry: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess_entry;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntryErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries_UpdateEntrySomeSuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_meta {
  __typename: "CreateEntryErrorMeta";
  experienceId: string;
  index: number;
  clientId: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects {
  __typename: "DataObjectError";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects_meta;
  definition: string | null;
  definitionId: string | null;
  clientId: string | null;
  /**
   * Error related to the data e.g. a string was supplied for a decimal field.
   */
  data: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors {
  __typename: "CreateEntryError";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_meta;
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
    | (UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors_dataObjects | null)[]
    | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors {
  __typename: "CreateEntryErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry_dataObjects {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry {
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
  dataObjects: (UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry_dataObjects | null)[];
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess {
  __typename: "CreateEntrySuccess";
  entry: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess_entry;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntryErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries_CreateEntrySuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess_entry {
  __typename: "Entry";
  /**
   * Entry ID
   */
  id: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess {
  __typename: "DeleteEntrySuccess";
  entry: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess_entry;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors_errors {
  __typename: "DeleteEntryError";
  id: string;
  /**
   * This will mostly be 'not found error'
   */
  error: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors {
  __typename: "DeleteEntryErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors_errors;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntrySuccess
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries_DeleteEntryErrors;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries {
  __typename: "UpdateExperienceEntriesKomponenten";
  updatedEntries:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_updatedEntries[]
    | null;
  newEntries:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_newEntries[]
    | null;
  deletedEntries:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries_deletedEntries[]
    | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess {
  __typename: "CommentSuccess";
  comment: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess_comment;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_meta {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_meta;
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors_errors;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentSuccess
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates_CommentUnionErrors;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess {
  __typename: "CommentSuccess";
  comment: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess_comment;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_meta {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_meta;
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors_errors;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentSuccess
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts_CommentUnionErrors;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess {
  __typename: "CommentSuccess";
  comment: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess_comment;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_meta {
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

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_meta;
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors_errors;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors_errors;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentSuccess
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes_CommentUnionErrors;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments {
  __typename: "CommentCrud";
  updates:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_updates[]
    | null;
  inserts:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_inserts[]
    | null;
  deletes:
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments_deletes[]
    | null;
}

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess {
  __typename: "UpdateExperienceSomeSuccess";
  experience: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_experience;
  entries: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_entries | null;
  comments: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess_comments | null;
}

export type UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences =

    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceErrors
    | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences_UpdateExperienceSomeSuccess;

export interface UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess {
  __typename: "UpdateExperiencesSomeSuccess";
  experiences: UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess_experiences[];
}

export type UpdateExperiencesOnline_updateExperiences =
  | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesAllFail
  | UpdateExperiencesOnline_updateExperiences_UpdateExperiencesSomeSuccess;

export interface UpdateExperiencesOnline {
  /**
   * Update several experiences at once
   */
  updateExperiences: UpdateExperiencesOnline_updateExperiences | null;
}

export interface UpdateExperiencesOnlineVariables {
  input: UpdateExperienceInput[];
}
