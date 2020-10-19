/* istanbul ignore file */
import { InMemoryCache, ApolloClient } from "@apollo/client";
import { CachePersistor } from "apollo-cache-persist-dev";
import * as AbsintheSocket from "@kanmii/socket";
import { createAbsintheSocketLink } from "@kanmii/socket-apollo-link";
import { SCHEMA_KEY, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from "./schema-keys";
import { getSocket } from "../utils/phoenix-socket";
import {
  PersistentStorage,
  PersistedData,
} from "apollo-cache-persist-dev/types";
import {
  MakeSocketLinkFn,
  middlewareErrorLink,
  middlewareLoggerLink,
  middlewareAuthLink,
} from "./middlewares";
import {
  makeConnectionObject,
  resetConnectionObject,
} from "../utils/connections";
import { makeObservable, makeBChannel } from "../utils/observable-manager";
import possibleTypes from "../graphql/apollo-types/fragment-types.json";
import { E2EWindowObject } from "../utils/types";
import { unsyncedLedgerPolicy } from "./unsynced-ledger";
import { syncingExperiencesLedgerPolicy } from "./syncing-experience-ledger";
import { deleteExperienceVar } from "../apollo/delete-experience-cache";
import { syncFlagVar, syncErrorsPolicy } from "./sync-to-server-cache";

export function buildClientCache(
  {
    uri,
    resolvers,
    newE2eTest,
    appHydrated,
  }: BuildClientCache = {} as BuildClientCache,
) {
  // use cypress version of cache if it has been set by cypress
  const globalVars = getOrMakeGlobals(newE2eTest);
  let { cache, persistor } = globalVars;

  // cache has been set by e2e test
  if (cache) {
    // e2e test is now serving our app
    if (appHydrated) {
      // storeConnectionStatus(true);
    }
    return globalVars;
  }

  cache = new InMemoryCache({
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
          syncingExperiencesLedger: syncingExperiencesLedgerPolicy,
          syncErrors: syncErrorsPolicy,
        },
      },
    },
  }) as InMemoryCache;

  persistor = makePersistor(cache, persistor);

  const makeSocketLink: MakeSocketLinkFn = (makeSocketLinkArgs) => {
    const absintheSocket = AbsintheSocket.create(
      getSocket({
        uri,
        ...makeSocketLinkArgs,
      }),
    );

    return createAbsintheSocketLink(absintheSocket);
  };

  let link = middlewareAuthLink(makeSocketLink);
  link = middlewareErrorLink(link);
  link = middlewareLoggerLink(link);

  const client = new ApolloClient({
    cache,
    link,
    assumeImmutableResults: true,
  }) as ApolloClient<{}>;

  if (resolvers) {
    client.addResolvers(resolvers);
  }

  const { observable } = addToGlobals({ client, cache, persistor });

  return { client, cache, persistor, observable };
}

function makePersistor(
  appCache: InMemoryCache,
  persistor?: CachePersistor<{}>,
) {
  persistor = persistor
    ? persistor
    : (new CachePersistor({
        cache: appCache,
        storage: localStorage as PersistentStorage<PersistedData<{}>>,
        key: SCHEMA_KEY,
        maxSize: false,
      }) as CachePersistor<{}>);

  return persistor;
}

export async function restoreCacheOrPurgeStorage(
  persistor: CachePersistor<{}>,
) {
  if (persistor === getGlobalsFromCypress().persistor) {
    return persistor;
  }

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

export const resetClientAndPersistor = async (
  appClient: ApolloClient<{}>,
  appPersistor: CachePersistor<{}>,
) => {
  await appPersistor.pause(); // Pause automatic persistence.
  await appPersistor.purge(); // Delete everything in the storage provider.
  await appClient.clearStore();
  await appPersistor.resume();
};

interface BuildClientCache {
  uri?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolvers?: any;
  newE2eTest?: boolean;
  // this will be set in react app to show we are not in e2e test
  appHydrated?: boolean;
}

///////////////////// END TO END TESTS THINGS ///////////////////////

export const CYPRESS_APOLLO_KEY = "ebnis-cypress-apollo";

function getOrMakeGlobals(newE2eTest?: boolean) {
  if (!window.____ebnis) {
    window.____ebnis = {} as E2EWindowObject;
  }

  if (!window.Cypress) {
    makeObservable(window.____ebnis);

    makeBChannel(window.____ebnis);
    makeConnectionObject();
    return window.____ebnis;
  }

  let cypressApollo = getGlobalsFromCypress();

  if (newE2eTest) {
    // We need to set up local storage for local state management
    // so that whatever we persist in e2e tests will be picked up by apollo
    // when app starts. Otherwise, apollo will always clear out the local
    // storage when the app starts if it can not read the schema version.
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);

    // reset globals
    cypressApollo = {} as E2EWindowObject;
    makeObservable(cypressApollo);
    makeBChannel(cypressApollo);

    // reset connections
    cypressApollo.connectionStatus = resetConnectionObject();
  }

  window.____ebnis = cypressApollo;
  window.Cypress.env(CYPRESS_APOLLO_KEY, cypressApollo);

  return cypressApollo;
}

function addToGlobals(args: {
  client: ApolloClient<{}>;
  cache: InMemoryCache;
  persistor: CachePersistor<{}>;
}) {
  const keys: (keyof typeof args)[] = ["client", "cache", "persistor"];
  const globals = window.Cypress ? getGlobalsFromCypress() : window.____ebnis;

  keys.forEach((key) => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    (globals as any)[key] = args[key];
  });

  if (window.Cypress) {
    window.Cypress.env(CYPRESS_APOLLO_KEY, globals);
    window.____ebnis = globals;
  }

  return globals;
}

function getGlobalsFromCypress() {
  let globalVars = {} as E2EWindowObject;

  if (window.Cypress) {
    globalVars = (window.Cypress.env(CYPRESS_APOLLO_KEY) ||
      {}) as E2EWindowObject;
  }

  return globalVars;
}

declare global {
  interface Window {
    Cypress: {
      env: <T>(k?: string, v?: T) => void | T;
    };

    ____ebnis: E2EWindowObject;
  }
}
