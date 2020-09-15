/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: UpdatedEntriesUnionFragment
// ====================================================

export interface UpdatedEntriesUnionFragment_UpdateEntryErrors_errors {
  __typename: "UpdateEntryError";
  entryId: string;
  error: string;
}

export interface UpdatedEntriesUnionFragment_UpdateEntryErrors {
  __typename: "UpdateEntryErrors";
  errors: UpdatedEntriesUnionFragment_UpdateEntryErrors_errors;
}

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta {
  __typename: "DataObjectErrorMeta";
  index: number;
  id: string | null;
  clientId: string | null;
}

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors {
  __typename: "DataObjectError";
  meta: UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors_meta;
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

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors {
  __typename: "DataObjectErrors";
  errors: UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors;
}

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject {
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

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess {
  __typename: "DataObjectSuccess";
  dataObject: UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess_dataObject;
}

export type UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects = UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors | UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectSuccess;

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry {
  __typename: "UpdateEntry";
  entryId: string;
  /**
   * If any entry data objects is updated, then the entry itself will
   * be updated to the latest dataObject.updatedAt
   */
  updatedAt: any | null;
  dataObjects: UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry_dataObjects[];
}

export interface UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess {
  __typename: "UpdateEntrySomeSuccess";
  entry: UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess_entry;
}

export type UpdatedEntriesUnionFragment = UpdatedEntriesUnionFragment_UpdateEntryErrors | UpdatedEntriesUnionFragment_UpdateEntrySomeSuccess;
