import { createContext } from "react";
import { DispatchType } from "../components/WithSubscriptions/with-subscriptions.utils";
import { OnSyncedData } from "./sync-to-server.types";
import { E2EWindowObject, RestoreCacheOrPurgeStorageFn } from "./types";

export const EbnisAppContext = createContext<EbnisContextProps>(
  {} as EbnisContextProps,
);

export interface EbnisContextProps extends E2EWindowObject {
  restoreCacheOrPurgeStorage?: RestoreCacheOrPurgeStorageFn;
}

export type AppPersistor = E2EWindowObject["persistor"];

export const WithSubscriptionContext = createContext<WithSubscriptionContextProps>(
  {
    connected: null,
  } as WithSubscriptionContextProps,
);

export const WithSubscriptionsDispatchContext = createContext<WithSubscriptionsDispatchContextProps>(
  {} as WithSubscriptionsDispatchContextProps,
);

export interface WithSubscriptionContextProps {
  connected: boolean | null;
  onSyncData?: OnSyncedData;
}

export type WithSubscriptionsDispatchContextProps = {
  withSubDispatch: DispatchType;
};
