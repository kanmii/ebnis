/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: GetExperienceCommentsUnionFragment
// ====================================================

export interface GetExperienceCommentsUnionFragment_GetExperienceCommentsSuccess_comments {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface GetExperienceCommentsUnionFragment_GetExperienceCommentsSuccess {
  __typename: "GetExperienceCommentsSuccess";
  comments: (GetExperienceCommentsUnionFragment_GetExperienceCommentsSuccess_comments | null)[];
}

export interface GetExperienceCommentsUnionFragment_GetExperienceCommentsErrors_errors {
  __typename: "ExperienceError";
  experienceId: string;
  /**
   * This will mostly be experience not found error
   */
  error: string;
}

export interface GetExperienceCommentsUnionFragment_GetExperienceCommentsErrors {
  __typename: "GetExperienceCommentsErrors";
  errors: GetExperienceCommentsUnionFragment_GetExperienceCommentsErrors_errors;
}

export type GetExperienceCommentsUnionFragment =
  | GetExperienceCommentsUnionFragment_GetExperienceCommentsSuccess
  | GetExperienceCommentsUnionFragment_GetExperienceCommentsErrors;
