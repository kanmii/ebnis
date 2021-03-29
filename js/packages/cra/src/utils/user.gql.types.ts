/* eslint-disable react-hooks/rules-of-hooks*/
import {
  MutationFunction,
  MutationFunctionOptions,
  MutationResult,
  useMutation,
} from "@apollo/client";
import {
  LoginMutation,
  LoginMutationVariables,
} from "@eb/shared/src/graphql/apollo-types/LoginMutation";
import {
  RegisterUserMutation,
  RegisterUserMutationVariables,
} from "@eb/shared/src/graphql/apollo-types/RegisterUserMutation";
import {
  LOGIN_MUTATION,
  REGISTER_USER_MUTATION,
} from "@eb/shared/src/graphql/user.gql";
import { ExecutionResult } from "graphql/execution/execute";

////////////////////////// LOGIN ////////////////////////////

export function useLoginMutation(): UseLoginMutation {
  return useMutation(LOGIN_MUTATION);
}

type UseLoginMutation = [
  LoginMutationFn, //
  MutationResult<LoginMutation>,
];

type LoginMutationFn = MutationFunction<
  LoginMutation, //
  LoginMutationVariables
>;

// used to type check test mock calls
export type LoginMutationFnOptions = MutationFunctionOptions<
  LoginMutation, //
  LoginMutationVariables
>;

export type LoginMutationResult = ExecutionResult<LoginMutation>; //

// component's props should extend this
export interface LoginMutationComponentProps {
  login: LoginMutationFn;
}

////////////////////////// END LOGIN ////////////////////////////

////////////////////////// REGISTER USER ////////////////////////////

export function registerUserMutation(): UseRegisterUserMutation {
  return useMutation(REGISTER_USER_MUTATION);
}

type UseRegisterUserMutation = [
  RegisterUserMutationFn, //
  MutationResult<RegisterUserMutation>,
];

type RegisterUserMutationFn = MutationFunction<
  RegisterUserMutation, //
  RegisterUserMutationVariables
>;

// used to type check test mock calls
export type RegisterUserMutationFnOptions = MutationFunctionOptions<
  RegisterUserMutation, //
  RegisterUserMutationVariables
>;

export type RegisterUserMutationResult = ExecutionResult<RegisterUserMutation>; //

// component's props should extend this
export interface RegisterUserMutationComponentProps {
  registerUser: RegisterUserMutationFn;
}

////////////////////////// END REGISTER USER ////////////////////////////
