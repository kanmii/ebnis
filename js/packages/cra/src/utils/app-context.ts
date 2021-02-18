import {
  EbnisGlobals,
  OnSyncedData,
  RestoreCacheOrPurgeStorageFn,
} from "@eb/cm/src/utils/types";
import { createContext } from "react";
import { DispatchType } from "../components/WithSubscriptions/with-subscriptions.utils";

export const EbnisAppContext = createContext<EbnisContextProps>(
  {} as EbnisContextProps,
);

export interface EbnisContextProps extends EbnisGlobals {
  restoreCacheOrPurgeStorage?: RestoreCacheOrPurgeStorageFn;
}

export type AppPersistor = EbnisGlobals["persistor"];

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
