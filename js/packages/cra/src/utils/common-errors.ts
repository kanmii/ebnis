import { ApolloError } from "@apollo/client";
import { CommonError, CommonErrorsVal } from "@eb/shared/src/utils/types";
import { GraphQLError } from "graphql";

type EbnisApolloError = {
  graphQLErrors: GraphQLError[];
  networkError: Error;
};

export function parseStringError(
  error: EbnisApolloError | string | Error,
): string {
  if ("string" === typeof error) {
    return error;
  } else if (error instanceof Error) {
    return error.message;
  } else if (
    error instanceof ApolloError ||
    error.graphQLErrors ||
    error.networkError
  ) {
    const { graphQLErrors, networkError } = error;

    if (networkError) {
      const { message } = networkError;

      // There is a weird bug in Apollo where error instances are passed
      // into networkError as string. In this instances, the error message
      // will contain the string "'[object Object]'". And since this error
      // is not meaningful, we simply return our own error.
      // :TODO: should we not be logging javascript errors in our code???
      if (message.includes("'[object Object]'")) {
        return GENERIC_SERVER_ERROR;
      }

      return message;
    }

    return GENERIC_SERVER_ERROR;

    return graphQLErrors[0].message;
  }

  return GENERIC_SERVER_ERROR;
}

export const FORM_CONTAINS_ERRORS_MESSAGE =
  "Form contains errors. Please correct them and save again.";

export const GENERIC_SERVER_ERROR = "Something went wrong - please try again.";

export const DATA_FETCHING_FAILED =
  "Data fetching failed - please check your network connection and try again.";

export const FETCH_ENTRIES_FAIL_ERROR_MSG = "Fetch of entries failed";

export const NOTHING_TO_SAVE_WARNING_MESSAGE =
  "Please make changes before saving.";

export const NO_CONNECTION_ERROR =
  "You are not connected - please check your internet connection and try again.";

export interface StringyErrorPayload {
  error: CommonError;
}

export type CommonErrorsState = Readonly<{
  value: CommonErrorsVal;
  commonErrors: Readonly<{
    context: {
      errors: string;
    };
  }>;
}>;

type ErrorField = string;
type ErrorText = string;
export type FieldError = [ErrorField, ErrorText][];
export type ErrorType = [string, string][];
