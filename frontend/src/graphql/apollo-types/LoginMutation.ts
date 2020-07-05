/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { LoginInput } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: LoginMutation
// ====================================================

export interface LoginMutation_login_UserSuccess_user {
  __typename: "User";
  id: string;
  name: string;
  email: string;
  jwt: string;
}

export interface LoginMutation_login_UserSuccess {
  __typename: "UserSuccess";
  user: LoginMutation_login_UserSuccess_user;
}

export interface LoginMutation_login_LoginError {
  __typename: "LoginError";
  error: string;
}

export type LoginMutation_login = LoginMutation_login_UserSuccess | LoginMutation_login_LoginError;

export interface LoginMutation {
  login: LoginMutation_login | null;
}

export interface LoginMutationVariables {
  input: LoginInput;
}
