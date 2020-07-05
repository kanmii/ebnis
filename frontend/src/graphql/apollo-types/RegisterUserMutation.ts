/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { RegisterUserInput } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: RegisterUserMutation
// ====================================================

export interface RegisterUserMutation_registerUser_UserSuccess_user {
  __typename: "User";
  id: string;
  name: string;
  email: string;
  jwt: string;
}

export interface RegisterUserMutation_registerUser_UserSuccess {
  __typename: "UserSuccess";
  user: RegisterUserMutation_registerUser_UserSuccess_user;
}

export interface RegisterUserMutation_registerUser_RegisterUserErrors_errors {
  __typename: "RegisterUserError";
  email: string | null;
  password: string | null;
  passwordConfirmation: string | null;
}

export interface RegisterUserMutation_registerUser_RegisterUserErrors {
  __typename: "RegisterUserErrors";
  errors: RegisterUserMutation_registerUser_RegisterUserErrors_errors;
}

export type RegisterUserMutation_registerUser = RegisterUserMutation_registerUser_UserSuccess | RegisterUserMutation_registerUser_RegisterUserErrors;

export interface RegisterUserMutation {
  registerUser: RegisterUserMutation_registerUser | null;
}

export interface RegisterUserMutationVariables {
  input: RegisterUserInput;
}
