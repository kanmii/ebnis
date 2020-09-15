/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes } from "./globalTypes";

// ====================================================
// GraphQL fragment: UpdateExperienceFragment
// ====================================================

export interface UpdateExperienceFragment_ownFields_UpdateExperienceOwnFieldsErrors_errors {
  __typename: "UpdateExperienceOwnFieldsError";
  title: string;
}

export interface UpdateExperienceFragment_ownFields_UpdateExperienceOwnFieldsErrors {
  __typename: "UpdateExperienceOwnFieldsErrors";
  errors: UpdateExperienceFragment_ownFields_UpdateExperienceOwnFieldsErrors_errors;
}

export interface UpdateExperienceFragment_ownFields_ExperienceOwnFieldsSuccess_data {
  __typename: "ExperienceOwnFields";
  title: string;
  description: string | null;
}

export interface UpdateExperienceFragment_ownFields_ExperienceOwnFieldsSuccess {
  __typename: "ExperienceOwnFieldsSuccess";
  data: UpdateExperienceFragment_ownFields_ExperienceOwnFieldsSuccess_data;
}

export type UpdateExperienceFragment_ownFields = UpdateExperienceFragment_ownFields_UpdateExperienceOwnFieldsErrors | UpdateExperienceFragment_ownFields_ExperienceOwnFieldsSuccess;

export interface UpdateExperienceFragment_updatedDefinitions_DefinitionErrors_errors {
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

export interface UpdateExperienceFragment_updatedDefinitions_DefinitionErrors {
  __typename: "DefinitionErrors";
  errors: UpdateExperienceFragment_updatedDefinitions_DefinitionErrors_errors;
}

export interface UpdateExperienceFragment_updatedDefinitions_DefinitionSuccess_definition {
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

export interface UpdateExperienceFragment_updatedDefinitions_DefinitionSuccess {
  __typename: "DefinitionSuccess";
  definition: UpdateExperienceFragment_updatedDefinitions_DefinitionSuccess_definition;
}

export type UpdateExperienceFragment_updatedDefinitions = UpdateExperienceFragment_updatedDefinitions_DefinitionErrors | UpdateExperienceFragment_updatedDefinitions_DefinitionSuccess;

export interface UpdateExperienceFragment {
  __typename: "UpdateExperience";
  experienceId: string;
  updatedAt: any;
  ownFields: UpdateExperienceFragment_ownFields | null;
  updatedDefinitions: UpdateExperienceFragment_updatedDefinitions[] | null;
}
