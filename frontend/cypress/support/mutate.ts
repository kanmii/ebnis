/// <reference types="cypress" />
import { ApolloClient, MutationOptions } from "@apollo/client";
import { CYPRESS_APOLLO_KEY } from "../../src/apollo/setup";

export function mutate<TData, TVariables>(
  options: MutationOptions<TData, TVariables>,
) {
  return (Cypress.env(CYPRESS_APOLLO_KEY).client as ApolloClient<{}>).mutate<
    TData,
    TVariables
  >(options);
}
