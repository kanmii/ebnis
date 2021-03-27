/* istanbul ignore file */
import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
  InMemoryCache,
} from "@apollo/client/core";
import possibleTypes from "@eb/cm/src/graphql/apollo-types/fragment-types.json";
import { Any, EbnisGlobals } from "@eb/cm/src/utils/types";
import * as AbsintheSocket from "@kanmii/socket";
import { createAbsintheSocketLink } from "@kanmii/socket-apollo-link";
import { deleteExperienceVar } from "../apollo/delete-experience-cache";
import { getSocket } from "../utils/phoenix-socket";
import {
  MakeSocketLinkFn,
  middlewareAuthLink,
  middlewareErrorLink,
  middlewareLoggerLink,
} from "./middlewares";
import { syncErrorsPolicy, syncFlagVar } from "./sync-to-server-cache";
import { unsyncedLedgerPolicy } from "./unsynced-ledger";

export function makeApolloClient(
  ebnisGlobals: EbnisGlobals,
  { uri, testing }: MakeApolloClientArgs,
) {
  let client = (undefined as unknown) as ApolloClient<Any>;
  let cache = (undefined as unknown) as InMemoryCache;

  const { cache: windowCache, client: windowClient } = window.____ebnis || {};

  if (windowClient) {
    client = windowClient;
  }

  if (windowCache) {
    cache = windowCache;
  }

  if (ebnisGlobals.client && ebnisGlobals.cache) {
    return ebnisGlobals;
  }

  if (!cache) {
    cache = makeCache();
  }

  let link = (undefined as unknown) as ApolloLink;

  // During testing, we use http instead of websocket. In the future, we
  // should be able to use websocket for all request
  if (testing) {
    link = createHttpLink({
      uri: "http://localhost:4001/mocks",
      fetch: (...args: any) => {
        return (fetch as any)(...args);
      },
    });
  } else {
    const makeSocketLink: MakeSocketLinkFn = (makeSocketLinkArgs) => {
      const absintheSocket = AbsintheSocket.create(
        getSocket({
          uri,
          ...makeSocketLinkArgs,
        }),
      );

      return createAbsintheSocketLink(absintheSocket);
    };

    link = middlewareAuthLink(makeSocketLink);
  }

  link = middlewareErrorLink(link);
  link = middlewareLoggerLink(link);

  client = new ApolloClient({
    cache,
    link,
    queryDeduplication: false,
    assumeImmutableResults: true,
  });

  ebnisGlobals.client = client;
  ebnisGlobals.cache = cache;
  ebnisGlobals.apolloLink = link;

  return ebnisGlobals;
}

export function makeCache() {
  const cache = new InMemoryCache({
    addTypename: true,
    possibleTypes,
    typePolicies: {
      unsyncedLedger: {
        keyFields: false,
      },

      syncingExperiencesLedger: {
        keyFields: false,
      },

      Query: {
        fields: {
          deleteExperience: {
            read() {
              return deleteExperienceVar();
            },
          },

          syncFlag: {
            read() {
              return syncFlagVar();
            },
          },

          unsyncedLedger: unsyncedLedgerPolicy,
          syncErrors: syncErrorsPolicy,
        },
      },
    },
  });

  return cache;
}

type MakeApolloClientArgs = {
  uri?: string;
  testing?: true;
};
