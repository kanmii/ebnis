/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetDataObjects
// ====================================================

export interface GetDataObjects_getDataObjects {
  __typename: "DataObject";
  id: string;
  data: any;
}

export interface GetDataObjects {
  /**
   * Get data objects by ID
   */
  getDataObjects: (GetDataObjects_getDataObjects | null)[] | null;
}

export interface GetDataObjectsVariables {
  ids: string[];
}
