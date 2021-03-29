/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: CommentUnionFragment
// ====================================================

export interface CommentUnionFragment_CommentSuccess_comment {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface CommentUnionFragment_CommentSuccess {
  __typename: "CommentSuccess";
  comment: CommentUnionFragment_CommentSuccess_comment;
}

export interface CommentUnionFragment_CommentUnionErrors_errors_meta {
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

export interface CommentUnionFragment_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface CommentUnionFragment_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: CommentUnionFragment_CommentUnionErrors_errors_meta;
  errors: CommentUnionFragment_CommentUnionErrors_errors_errors;
}

export interface CommentUnionFragment_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: CommentUnionFragment_CommentUnionErrors_errors;
}

export type CommentUnionFragment =
  | CommentUnionFragment_CommentSuccess
  | CommentUnionFragment_CommentUnionErrors;
