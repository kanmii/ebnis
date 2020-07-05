/* istanbul ignore file */
import gql from "graphql-tag";
import { UserFragment } from "../graphql/apollo-types/UserFragment";
import {
  LOGGED_IN_USER_CACHE_KEY,
  LOGGED_OUT_USER_CACHE_KEY,
} from "../apollo/resolvers";
import { useQuery } from "@apollo/react-hooks";
import { USER_FRAGMENT } from "../graphql/user.gql";

const TOKEN_KEY = "nOQhAH4V54h9MMBS3BSwtE/2eZeQWHRnPfoC4K+RDuWairX";

const LOGGED_IN_USER_QUERY = gql`
  query {
    loggedInUser @client {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export function manageUserAuthentication(user: UserFragment | null) {
  const cache = window.____ebnis.cache;

  if (user) {
    // login

    localStorage.setItem(TOKEN_KEY, user.jwt);

    cache.writeData({
      data: {
        [LOGGED_IN_USER_CACHE_KEY]: user,
        [LOGGED_OUT_USER_CACHE_KEY]: null,
      },
    });
  } else {
    // logout
    localStorage.removeItem(TOKEN_KEY);
    const data = cache.readQuery<LoggedInUserQueryResult>({
      query: LOGGED_IN_USER_QUERY,
    });

    cache.writeData({
      data: {
        [LOGGED_IN_USER_CACHE_KEY]: null,
        [LOGGED_OUT_USER_CACHE_KEY]: data ? data.loggedInUser : null,
      },
    });
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
