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
import { deleteObjectKey } from "../utils";
import {
  makeConnectionObject,
  resetConnectionObject,
} from "../utils/connections";
import { makeApolloClient } from "./client";
import { SCHEMA_KEY, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from "./schema-keys";

export function buildClientCache(
  {
    uri,
    resolvers,
    newE2eTest,
    useMsw,
  }: BuildClientCache = {} as BuildClientCache,
) {
  // use cypress version of cache if it has been set by cypress
  const ebnisGlobals = getOrMakeGlobals({ newE2eTest, useMsw });

  // cache has been set by e2e test
  if (ebnisGlobals.cache && ebnisGlobals.client) {
    return ebnisGlobals;
  }

  const { client, cache } = makeApolloClient(ebnisGlobals, {
    uri,
    testing: useMsw,
  });

  makePersistor(cache, ebnisGlobals);

  if (resolvers) {
    client.addResolvers(resolvers);
  }

  return ebnisGlobals;
}

function makePersistor(appCache: InMemoryCache, ebnisGlobals: EbnisGlobals) {
  const persistor = new CachePersistor({
    cache: appCache,
    storage: localStorage as PersistentStorage<PersistedData<Any>>,
    key: SCHEMA_KEY,
    maxSize: false,
  }) as CachePersistor<Any>;

  ebnisGlobals.persistor = persistor;
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

function getOrMakeGlobals({ newE2eTest }: BuildClientCache) {
  if (!window.Cypress) {
    const ebnisGlobals = window.____ebnis || ({} as EbnisGlobals);
    makeBChannel(ebnisGlobals);
    makeObservable(ebnisGlobals);
    makeConnectionObject(ebnisGlobals);
    window.____ebnis = ebnisGlobals;
    return ebnisGlobals;
  }

  let ebnisGlobals = getGlobalsFromCypress();

  if (newE2eTest) {
    resetGlobals(ebnisGlobals);

    // We need to set up local storage for local state management
    // so that whatever we persist in e2e tests will be picked up by apollo
    // when app starts. Otherwise, apollo will always clear out the local
    // storage when the app starts if it can not read the schema version.
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);

    // reset globals
    ebnisGlobals = {} as EbnisGlobals;
    makeBChannel(ebnisGlobals);
    makeObservable(ebnisGlobals);

    // reset connections
    resetConnectionObject(ebnisGlobals);
  }

  // if we reach here from App, then we need to set window.____ebnis to the
  // value obtained from cypress
  window.____ebnis = ebnisGlobals;

  window.Cypress.env(CYPRESS_APOLLO_KEY, ebnisGlobals);

  return ebnisGlobals;
}

function getGlobalsFromCypress() {
  let globalVars = {} as EbnisGlobals;

  if (window.Cypress) {
    globalVars = (window.Cypress.env(CYPRESS_APOLLO_KEY) || {}) as EbnisGlobals;
  }

  return globalVars;
}

function resetGlobals(ebnisGlobals: EbnisGlobals) {
  const { appSocket } = ebnisGlobals;

  if (appSocket) {
    appSocket.disconnect();
    deleteObjectKey(ebnisGlobals, "appSocket");
  }
}
