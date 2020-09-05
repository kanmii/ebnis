/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import { PropsWithChildren } from "react";
import { InMemoryCache, ApolloClient } from "@apollo/client";
import { Observable } from "zen-observable-ts";
import { CachePersistor } from "apollo-cache-persist-dev";
import { EmitActionType, BroadcastMessageType } from "./observable-manager";
import { ChangeEvent } from "react";
import { BroadcastChannel } from "broadcast-channel";

export type ReactMouseAnchorEvent = React.MouseEvent<
  HTMLAnchorElement | HTMLButtonElement,
  MouseEvent
>;

export type EmitData = (params: EmitPayload) => void;

export type EmitPayload =
  | ({
      type: EmitActionType.connectionChanged;
    } & EmitActionConnectionChangedPayload)
  | {
      type: EmitActionType.random;
    };

export interface EmitActionConnectionChangedPayload {
  connected: boolean;
}

export interface ObservableUtils {
  emitData: EmitData;
  observable: Observable<EmitPayload>;
}

export interface E2EWindowObject extends ObservableUtils {
  cache: InMemoryCache;
  client: ApolloClient<{}>;
  persistor: CachePersistor<{}>;
  connectionStatus: ConnectionStatus;
  emitter: ZenObservable.SubscriptionObserver<EmitPayload>;
  emitting: boolean;
  experienceDefinitionResolversAdded?: boolean;
  newEntryResolversAdded?: boolean;
  logApolloQueries?: boolean;
  bc: BChannel;
}

export interface ConnectionStatus {
  isConnected: boolean | null;
  mode: "auto" | "manual";
}

type KeyOfE2EWindowObject = keyof E2EWindowObject;

declare global {
  interface Window {
    Cypress: {
      env: <T>(k?: string, v?: T) => void | T;
    };

    ____ebnis: E2EWindowObject;
  }
}

export type BroadcastMessage = {
  type: BroadcastMessageType.experienceDeleted;
  payload: {
    id: string;
    title: string;
  };
};

export type BChannel = BroadcastChannel<BroadcastMessage>;

export type CommonError = Error | string;

export type RestoreCacheOrPurgeStorageFn = (
  persistor: CachePersistor<{}>,
) => Promise<CachePersistor<{}>>;

export type ComponentProps = any &
  PropsWithChildren<{}> & {
    className?: string;
    id?: string;
    value?: any;
    onChange?: any;
    name?: string;
  };

export type IEnum<T extends object> = T[keyof T];

export type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export type NoEffectVal = "noEffect";
export type HasEffectsVal = "hasEffects";
export type ActiveVal = "active";
export type InActiveVal = "inactive";
export type SubmissionVal = "submitting";
export type CommonErrorsVal = "commonErrors";
export type WarningVal = "warning";
export type ValidVal = "valid";
export type InvalidVal = "invalid";
export type InitialVal = "initial";
export type UnChangedVal = "unchanged";
export type ChangedVal = "changed";
export type ErrorsVal = "errors";
export type SyncOfflineExperienceErrorsVal = "syncOfflineExperienceErrors";
export type LoadingVal = "loading";
export type DataVal = "data";
export type CancelledVal = "cancelled";
export type DeletedVal = "deleted";
export type RequestedVal = "requested";

export const StateValue = {
  noEffect: "noEffect" as NoEffectVal,
  hasEffects: "hasEffects" as HasEffectsVal,
  inactive: "inactive" as InActiveVal,
  unchanged: "unchanged" as UnChangedVal,
  commonErrors: "commonErrors" as CommonErrorsVal,
  warning: "warning" as WarningVal,
  active: "active" as ActiveVal,
  submitting: "submission" as SubmissionVal,
  changed: "changed" as ChangedVal,
  valid: "valid" as ValidVal,
  invalid: "invalid" as InvalidVal,
  initial: "initial" as InitialVal,
  errors: "errors" as ErrorsVal,
  syncOfflineExperienceErrors: "syncOfflineExperienceErrors" as SyncOfflineExperienceErrorsVal,
  loading: "loading" as LoadingVal,
  data: "data" as DataVal,
  cancelled: "cancelled" as CancelledVal,
  deleted: "deleted" as DeletedVal,
  requested: "requested" as RequestedVal,
} as const;

export type LoadingState = Readonly<{
  value: LoadingVal;
}>;
