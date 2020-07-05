/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: CreateExperienceErrorsFragment
// ====================================================

export interface CreateExperienceErrorsFragment_errors_meta {
  __typename: "CreateExperienceErrorMeta";
  /**
   * The index of the failing experience in the list of experiences input
   */
  index: number;
  clientId: string | null;
}

export interface CreateExperienceErrorsFragment_errors_dataDefinitions {
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

export interface CreateExperienceErrorsFragment_errors {
  __typename: "CreateExperienceError";
  meta: CreateExperienceErrorsFragment_errors_meta;
  /**
   * A catch all for error unrelated to fields of experience e.g. an exception
   *   was raised
   */
  error: string | null;
  title: string | null;
  user: string | null;
  clientId: string | null;
  dataDefinitions: (CreateExperienceErrorsFragment_errors_dataDefinitions | null)[] | null;
}

export interface CreateExperienceErrorsFragment {
  __typename: "CreateExperienceErrors";
  errors: CreateExperienceErrorsFragment_errors;
}
