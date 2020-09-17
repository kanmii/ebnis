import { createContext } from "react";
import {
  InMemoryCache,
  NormalizedCacheObject,
  ApolloClient,
} from "@apollo/client";
import { RestoreCacheOrPurgeStorageFn, E2EWindowObject } from "./types";
import { CachePersistor } from "apollo-cache-persist-dev";

export const EbnisAppContext = createContext<EbnisContextProps>(
  {} as EbnisContextProps,
);

export interface EbnisContextProps extends E2EWindowObject {
  cache: InMemoryCache;
  client: ApolloClient<{}>;
  restoreCacheOrPurgeStorage?: RestoreCacheOrPurgeStorageFn;
  persistor: AppPersistor;
}

export type AppPersistor = CachePersistor<NormalizedCacheObject>;

export const WithSubscriptionContext = createContext<WithSubscriptionContextProps>({
  connected: null,
} as WithSubscriptionContextProps);

export interface WithSubscriptionContextProps {
  connected: boolean | null;
}
