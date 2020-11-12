/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import { PropsWithChildren } from "react";
import { InMemoryCache, ApolloClient } from "@apollo/client";
import { CachePersistor } from "apollo-cache-persist-dev";
import { ChangeEvent } from "react";
import { BroadcastChannel } from "broadcast-channel";
import { OnSyncedData } from "./sync-to-server.types";

export type ReactMouseAnchorEvent = React.MouseEvent<
  HTMLAnchorElement | HTMLButtonElement,
  MouseEvent
>;

export interface E2EWindowObject {
  cache: InMemoryCache;
  client: ApolloClient<{}>;
  persistor: CachePersistor<{}>;
  connectionStatus: ConnectionStatus;
  logApolloQueries?: boolean;
  bc: BChannel;
}

export interface ConnectionStatus {
  isConnected: boolean | null;
  mode: "auto" | "manual";
}

export type KeyOfE2EWindowObject = keyof E2EWindowObject;

declare global {
  interface Window {
    Cypress: {
      env: <T>(k?: string, v?: T) => void | T;
    };

    ____ebnis: E2EWindowObject;
  }
}

export enum BroadcastMessageType {
  experienceDeleted = "@broadcast/experience-deleted",
  syncDone = "@broadcast/sync-done",
  connectionChanged = "@broadcast/connection-changed",
}

export type BroadcastMessageExperienceDeleted = {
  type: BroadcastMessageType.experienceDeleted;
  payload: {
    id: string;
    title: string;
  };
};

export interface BroadcastMessageConnectionChangedPayload {
  connected: boolean;
}

export type BroadcastMessageConnectionChanged = {
  type: BroadcastMessageType.connectionChanged;
  payload: BroadcastMessageConnectionChangedPayload;
};

export type BroadcastMessageOnSyncData = {
  type: BroadcastMessageType.syncDone;
  payload: OnSyncedData;
};

export type BroadcastMessage =
  | BroadcastMessageExperienceDeleted
  | BroadcastMessageOnSyncData
  | BroadcastMessageConnectionChanged;

export type BroadcastMessageSelf = {
  detail: BroadcastMessage;
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

export type Timeouts = {
  genericTimeout?: NodeJS.Timeout;
};

export type KeyOfTimeouts = keyof Timeouts;

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
export type SuccessVal = "success";
export type FailVal = "fail";
export type FetchEntriesErrorVal = "fetchEntriesError";
export type UpdateVal = "update";
export type InsertVal = "insert";
export type ReFetchOnly = "re-fetch-only";
export type OnlineVal = "online";
export type OfflineVal = "offline";
export type PartOfflineVal = "part-offline";
export type OnlineStatus = OnlineVal | OfflineVal | PartOfflineVal;
export type DeleteSuccess = "deleteSuccess";

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
  success: "success" as SuccessVal,
  fail: "fail" as FailVal,
  fetchEntriesError: "fetchEntriesError" as FetchEntriesErrorVal,
  update: "update" as UpdateVal,
  insert: "insert" as InsertVal,
  reFetchOnly: "re-fecht-only" as ReFetchOnly,
  selfBcMessageKey: "self-bc-message" as any,
  bcMessageKey: "message" as any,
  online: "online" as OnlineVal,
  offline: "offline" as OfflineVal,
  partOffline: "part-offline" as PartOfflineVal,
  deleteSuccess: "deleteSuccess" as DeleteSuccess,
} as const;

export type LoadingState = {
  value: LoadingVal;
};
