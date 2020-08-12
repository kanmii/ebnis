/* istanbul ignore file */
import gql from "graphql-tag";
import { makeVar } from "@apollo/client";
import { UserFragment } from "../graphql/apollo-types/UserFragment";
import { useQuery } from "@apollo/client";

export const loggedOutUserVar = makeVar<null | UserFragment>(null);
export const loggedInUserVar = makeVar<null | UserFragment>(null);

const TOKEN_KEY = "nOQhAH4V54h9MMBS3BSwtE/2eZeQWHRnPfoC4K+RDuWairX";

const LOGGED_IN_USER_QUERY = gql`
  query {
    loggedInUser @client
  }
`;

export function manageUserAuthentication(user: UserFragment | null) {
  const cache = window.____ebnis.cache;

  if (user) {
    // login

    localStorage.setItem(TOKEN_KEY, user.jwt);

    loggedInUserVar(user);
    loggedOutUserVar(null);
  } else {
    // logout
    localStorage.removeItem(TOKEN_KEY);

    const data = cache.readQuery<LoggedInUserQueryResult>({
      query: LOGGED_IN_USER_QUERY,
    });

    loggedInUserVar(null);
    loggedOutUserVar(data ? data.loggedInUser : null);
  }
}

export function useUser() {
  return useQuery<LoggedInUserQueryResult>(LOGGED_IN_USER_QUERY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

interface LoggedInUserQueryResult {
  loggedInUser: UserFragment;
}
