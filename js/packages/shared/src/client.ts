/* istanbul ignore file */
import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
  InMemoryCache,
} from "@apollo/client/core";
import { onError } from "@apollo/client/link/error";
import * as AbsintheSocket from "@kanmii/socket";
import { createAbsintheSocketLink } from "@kanmii/socket-apollo-link";
import { CachePersistor, LocalStorageWrapper } from "apollo3-cache-persist";
import { deleteExperienceVar } from "./apollo/delete-experience-cache";
import { getEntriesConnectionFieldPolicy } from "./apollo/entries-connection.gql";
import { getCachedExperiencesConnectionListFieldPolicy } from "./apollo/get-experiences-connection-list.gql";
import {
  SCHEMA_KEY,
  SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
} from "./apollo/schema-keys";
import { syncErrorsPolicy, syncFlagVar } from "./apollo/sync-to-server-cache";
import { unsyncedLedgerPolicy } from "./apollo/unsynced-ledger";
import { makeBChannel } from "./broadcast-channel-manager";
import possibleTypes from "./graphql/apollo-types/fragment-types.json";
import { makeObservable } from "./observable-manager";
import { getSocket } from "./phoenix-socket";
import { resetConnectionObject } from "./utils/connections";
import {
  getApiUrl,
  getOrMakeGlobals,
  isBrowser,
  setGlobals,
} from "./utils/globals";
import { getToken } from "./utils/manage-user-auth";
import { Any, EbnisGlobals } from "./utils/types";
import { setUpMsw } from "./__tests__/setup-msw";

export function makeApolloClient({
  apiUrl,
  testing,
  ebnisGlobals,
  useMsw,
  cache: initializedCache,
}: MakeApolloClientArgs) {
  const globals = ebnisGlobals || getOrMakeGlobals();

  if (globals.client) {
    // Our app and Cypress may have different window context. We make sure that
    // whichever window context reaches here has our global attached

    setGlobals(globals);

    return globals;
  }

  let link = undefined as unknown as EbnisGlobals["apolloLink"];
  let uri = "";

  // During testing, we use http instead of websocket. In the future, we
  // should be able to use websocket for all request
  if (testing || useMsw) {
    uri = "http://localhost:4000";

    link = createHttpLink({
      uri,
    });

    if (useMsw) {
      setUpMsw(globals);
    }
  } else {
    // apiUrl will be supplied by Cypress in cypress context
    uri = apiUrl || getApiUrl();

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

  const cache = initializedCache || makeApolloCache();

  const client: EbnisGlobals["client"] = new ApolloClient({
    cache,
    link,
    // queryDeduplication: false,
    // assumeImmutableResults: true,
    // ssrMode: true,
  });

  if (!testing) {
    globals.persistor = makePersistor(cache);
    makeBChannel(globals);
    makeObservable(globals);
    resetConnectionObject(globals);
  }

  globals.client = client;
  globals.cache = cache;
  globals.apolloLink = link;
  setGlobals(globals);

  return globals;
}

export async function restoreCacheOrPurgeStorage() {
  const persistor = getOrMakeGlobals().persistor;

  const currentVersion = localStorage.getItem(SCHEMA_VERSION_KEY);

  if (currentVersion === SCHEMA_VERSION) {
    // If the current version matches the latest version,
    // we're good to go and can restore the cache.
    await persistor.restore();
  } else {
    // Otherwise, we'll want to purge the outdated persisted cache
    // and mark ourselves as having updated to the latest version.
    await persistor.purge();
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  }

  return persistor;
}

function makePersistor(cache: InMemoryCache) {
  return new CachePersistor({
    cache,
    storage: new LocalStorageWrapper(window.localStorage),
    key: SCHEMA_KEY,
    maxSize: false,
  }) as CachePersistor<Any>;
}

export function makeApolloCache() {
  const cache: EbnisGlobals["cache"] = new InMemoryCache({
    addTypename: true,
    possibleTypes,
    typePolicies: {
      unsyncedLedger: {
        // disables cache normalization for this field
        keyFields: false,
      },

      syncingExperiencesLedger: {
        keyFields: false,
      },

      syncErrors: {
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

          getExperiences: getCachedExperiencesConnectionListFieldPolicy,

          getEntries: getEntriesConnectionFieldPolicy,

          preFetchExperiences: {
            read() {
              return {};
            },
            merge() {
              return {};
            },
          },
        },
      },

      Mutation: {
        fields: {
          login: {
            read() {
              return {};
            },
            merge() {
              return {};
            },
          },

          registerUser: {
            read() {
              return {};
            },
            merge() {
              return {};
            },
          },
        },
      },
    },
  });

  if (isBrowser()) {
    const initialStateString = window.__EBNIS_APOLLO_STATE__;

    const initialState =
      "string" === typeof initialStateString
        ? JSON.parse(initialStateString || "null")
        : initialStateString;

    if (initialState) {
      cache.restore(initialState);
    }
  }

  return cache;
}

function middlewareLoggerLink(link: ApolloLink) {
  return new ApolloLink((operation, forward) => {
    if (!forward) {
      return null;
    }

    const fop = forward(operation);
    const { logApolloQueries } = getOrMakeGlobals();

    if (!logApolloQueries) {
      return fop;
    }

    const operationName = `Apollo operation: ${operation.operationName}`;

    console.log(
      "\n\n\n",
      getNow(),
      `\n\n====${operationName}===\n\n`,
      `======QUERY=====\n\n`,
      operation.query.loc ? operation.query.loc.source.body : "",
      `\n\n======VARIABLES======\n\n`,
      JSON.stringify(operation.variables, null, 2),
      `\n\n===End ${operationName}====\n\n`,
    );

    if (fop.map) {
      return fop.map((response) => {
        console.log(
          "\n\n\n",
          getNow(),
          `\n=Received response from ${operationName}=\n\n`,
          JSON.stringify(response, null, 2),
          `\n\n=End Received response from ${operationName}=\n\n`,
        );

        return response;
      });
    }

    return fop;
  }).concat(link);
}

function middlewareErrorLink(link: ApolloLink) {
  return onError(({ graphQLErrors, networkError, response, operation }) => {
    const { logApolloQueries } = getOrMakeGlobals();

    if (!logApolloQueries) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const logError = (errorName: string, obj: object) => {
      const operationName = `Response [${errorName} error] from Apollo operation: ${operation.operationName}`;

      console.error(
        "\n\n\n",
        getNow(),
        `\n=${operationName}=\n\n`,
        obj,
        `\n\n=End Response ${operationName}=`,
      );
    };

    if (graphQLErrors) {
      logError("graphQLErrors", graphQLErrors);
    }

    if (response) {
      logError("", response);
    }

    if (networkError) {
      logError("Network", networkError);
    }
  }).concat(link);
}

export function middlewareAuthLink(makeSocketLink: MakeSocketLinkFn) {
  let previousToken = getToken();
  let socketLink = makeSocketLink({ token: previousToken });

  const headers: {
    [headerKey: string]: string;
  } = {};

  return new ApolloLink((operation, forward) => {
    const token = getToken();

    if (token !== previousToken) {
      previousToken = token;
      // if token has changed, reconnect socket with new token
      socketLink = makeSocketLink({ token, forceReconnect: true });
    }

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    operation.setContext({
      headers,
    });

    return socketLink.request(operation, forward);
  });
}

function getNow() {
  const n = new Date();
  return `${n.getHours()}:${n.getMinutes()}:${n.getSeconds()}:${n.getMilliseconds()}`;
}

type MakeApolloClientArgs = {
  ebnisGlobals?: EbnisGlobals;
  apiUrl?: string;
  testing?: true;
  useMsw?: boolean;
  cache?: EbnisGlobals["cache"];
};

type MakeSocketLinkFn = (arg: {
  token: string | null;
  forceReconnect?: boolean;
}) => ApolloLink;
