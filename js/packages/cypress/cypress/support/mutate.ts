/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="cypress" />
import { ApolloClient, MutationOptions } from "@apollo/client";
import { StateValue } from "@eb/shared/src/utils/types";

export function mutate<TData, TVariables>(
  options: MutationOptions<TData, TVariables>,
) {
  return (Cypress.env(StateValue.globalKey).client as ApolloClient<any>).mutate<
    TData,
    TVariables
  >(options);
}
