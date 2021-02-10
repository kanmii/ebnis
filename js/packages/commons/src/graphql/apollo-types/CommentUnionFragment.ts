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
  index: number;
  id: string | null;
}

export interface CommentUnionFragment_CommentUnionErrors_errors_errors {
  __typename: "CommentErrorsErrors";
  id: string | null;
  association: string | null;
  error: string | null;
}

export interface CommentUnionFragment_CommentUnionErrors_errors {
  __typename: "CommentErrors";
  meta: CommentUnionFragment_CommentUnionErrors_errors_meta | null;
  errors: CommentUnionFragment_CommentUnionErrors_errors_errors;
}

export interface CommentUnionFragment_CommentUnionErrors {
  __typename: "CommentUnionErrors";
  errors: CommentUnionFragment_CommentUnionErrors_errors;
}

export type CommentUnionFragment =
  | CommentUnionFragment_CommentSuccess
  | CommentUnionFragment_CommentUnionErrors;
