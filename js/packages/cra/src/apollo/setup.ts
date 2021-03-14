/* istanbul ignore file */
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { makeBChannel } from "@eb/cm/src/broadcast-channel-manager";
import { makeObservable } from "@eb/cm/src/observable-manager";
import { Any, CYPRESS_APOLLO_KEY, EbnisGlobals } from "@eb/cm/src/utils/types";
import { CachePersistor } from "apollo-cache-persist-dev";
import {
  PersistedData,
  PersistentStorage,
} from "apollo-cache-persist-dev/types";
import {
  makeConnectionObject,
  resetConnectionObject,
  storeConnectionStatus,
} from "../utils/connections";
import { makeApolloClient } from "./client";
import { SCHEMA_KEY, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from "./schema-keys";

export function buildClientCache(
  {
    uri,
    resolvers,
    newE2eTest,
    appHydrated,
    useMsw,
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

  if (useMsw) {
    storeConnectionStatus(true);
  }

  const { client, ...others } = makeApolloClient({ uri, testing: useMsw });
  cache = others.cache;

  persistor = makePersistor(cache, persistor);

  if (resolvers) {
    client.addResolvers(resolvers);
  }

  const { bcBroadcaster } = addToGlobals({ client, cache, persistor });

  return { client, cache, persistor, bcBroadcaster };
}

function makePersistor(
  appCache: InMemoryCache,
  persistor?: CachePersistor<Any>,
) {
  persistor = persistor
    ? persistor
    : (new CachePersistor({
        cache: appCache,
        storage: localStorage as PersistentStorage<PersistedData<Any>>,
        key: SCHEMA_KEY,
        maxSize: false,
      }) as CachePersistor<Any>);

  return persistor;
}

export async function restoreCacheOrPurgeStorage(
  persistor: CachePersistor<Any>,
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
  appClient: ApolloClient<Any>,
  appPersistor: CachePersistor<Any>,
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
  // use mock service worker package for graphql backend?
  useMsw?: true;
}

///////////////////// END TO END TESTS THINGS ///////////////////////

function getOrMakeGlobals(newE2eTest?: boolean) {
  if (!window.____ebnis) {
    window.____ebnis = {} as EbnisGlobals;
  }

  if (!window.Cypress) {
    makeBChannel(window.____ebnis);
    makeObservable(window.____ebnis);
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
    cypressApollo = {} as EbnisGlobals;
    makeBChannel(cypressApollo);
    makeObservable(cypressApollo);

    // reset connections
    cypressApollo.connectionStatus = resetConnectionObject();
  }

  window.____ebnis = cypressApollo;
  window.Cypress.env(CYPRESS_APOLLO_KEY, cypressApollo);

  return cypressApollo;
}

function addToGlobals(args: {
  client: ApolloClient<Any>;
  cache: InMemoryCache;
  persistor: CachePersistor<Any>;
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
  let globalVars = {} as EbnisGlobals;

  if (window.Cypress) {
    globalVars = (window.Cypress.env(CYPRESS_APOLLO_KEY) || {}) as EbnisGlobals;
  }

  return globalVars;
}
