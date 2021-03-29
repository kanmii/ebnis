/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: GetExperienceCommentsErrorsFragment
// ====================================================

export interface GetExperienceCommentsErrorsFragment_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface GetExperienceCommentsErrorsFragment {
  __typename: "GetExperienceCommentsErrors";
  errors: GetExperienceCommentsErrorsFragment_errors;
}
