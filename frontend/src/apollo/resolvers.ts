/* istanbul ignore file */
import { CacheResolver, InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";

export const LOGGED_IN_USER_CACHE_KEY = "loggedInUser";
export const LOGGED_OUT_USER_CACHE_KEY = "loggedOutUser";
export const UNSYNCED_LEDGER_CACHE_KEY = "unsyncedLedger";
export const MUTATION_NAME_createExperienceOffline = "createOfflineExperience";
export const MUTATION_NAME_createOfflineEntry = "createOfflineEntry";
export const QUERY_NAME_getExperience = "getExperience";
export const SYNCING_EXPERIENCES_LEDGER_CACHE_KEY = "syncingExperiencesLedger";
export const ENTRIES_SYNC_ERRORS_LEDGER_CACHE_KEY = "entriesSyncErrorsLedger";

export function initState() {
  return {
    resolvers: [],
    defaults: {
      staleToken: null,
      [LOGGED_OUT_USER_CACHE_KEY]: null,
      [LOGGED_IN_USER_CACHE_KEY]: null,
      [UNSYNCED_LEDGER_CACHE_KEY]: null,
      [SYNCING_EXPERIENCES_LEDGER_CACHE_KEY]: null,
      [ENTRIES_SYNC_ERRORS_LEDGER_CACHE_KEY]: null,
    },
  };
}

const getExperience: CacheResolver = (_, args, { getCacheKey }) =>
  getCacheKey({
    __typename: "Experience",
    id: args.id,
  });

export const CUSTOM_QUERY_RESOLVERS = {
  Query: {
    getExperience,
  },
};

export interface CacheContext {
  cache: InMemoryCache;
  client: ApolloClient<{}>;
  getCacheKey: (args: { __typename: string; id: string }) => string;
}

export type LocalResolverFn<TVariables = {}, TReturnedValue = void> = (
  root: object,
  variables: TVariables,
  context: CacheContext,
) => TReturnedValue;

export function makeApolloCacheRef(typeName: string, id: string | number) {
  return `${typeName}:${id}`;
}
