/// <reference types="cypress" />
import { ApolloClient } from "apollo-client";
import { MutationOptions } from "apollo-client/core/watchQueryOptions";
import { CYPRESS_APOLLO_KEY } from "../../src/apollo/setup";

export function mutate<TData, TVariables>(
  options: MutationOptions<TData, TVariables>,
) {
  return (Cypress.env(CYPRESS_APOLLO_KEY).client as ApolloClient<{}>).mutate<
    TData,
    TVariables
  >(options);
}

