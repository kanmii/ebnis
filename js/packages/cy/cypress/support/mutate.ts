/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="cypress" />
import { ApolloClient, MutationOptions } from "@apollo/client";
import { CYPRESS_APOLLO_KEY } from "@eb/cm/src/utils/types";

export function mutate<TData, TVariables>(
  options: MutationOptions<TData, TVariables>,
) {
  return (Cypress.env(CYPRESS_APOLLO_KEY).client as ApolloClient<any>).mutate<
    TData,
    TVariables
  >(options);
}
