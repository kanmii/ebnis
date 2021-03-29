/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetExperienceComments
// ====================================================

export interface GetExperienceComments_getExperienceComments_GetExperienceCommentsSuccess_comments {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface GetExperienceComments_getExperienceComments_GetExperienceCommentsSuccess {
  __typename: "GetExperienceCommentsSuccess";
  comments: (GetExperienceComments_getExperienceComments_GetExperienceCommentsSuccess_comments | null)[];
}

export interface GetExperienceComments_getExperienceComments_GetExperienceCommentsErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface GetExperienceComments_getExperienceComments_GetExperienceCommentsErrors {
  __typename: "GetExperienceCommentsErrors";
  errors: GetExperienceComments_getExperienceComments_GetExperienceCommentsErrors_errors;
}

export type GetExperienceComments_getExperienceComments =
  | GetExperienceComments_getExperienceComments_GetExperienceCommentsSuccess
  | GetExperienceComments_getExperienceComments_GetExperienceCommentsErrors;

export interface GetExperienceComments {
  /**
   * Get comments belonging to an experience.
   */
  getExperienceComments: GetExperienceComments_getExperienceComments | null;
}

export interface GetExperienceCommentsVariables {
  experienceId: string;
}
