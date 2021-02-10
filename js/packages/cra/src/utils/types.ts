/* istanbul ignore file */
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { Any } from "@eb/cm/src/utils/types";
import { CachePersistor } from "apollo-cache-persist-dev";
import { BroadcastChannel } from "broadcast-channel";
import { ChangeEvent } from "react";
import { OnSyncedData } from "./sync-to-server.types";

export interface E2EWindowObject {
  cache: InMemoryCache;
  client: ApolloClient<Any>;
  persistor: CachePersistor<Any>;
  connectionStatus: ConnectionStatus;
  logApolloQueries?: boolean;
  logReducers?: boolean;
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
  persistor: CachePersistor<Any>,
) => Promise<CachePersistor<Any>>;

export type IEnum<T extends Any> = T[keyof T];

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
export type EmptyVal = "empty";
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
  empty: "empty" as EmptyVal,
} as const;

export type LoadingState = {
  value: LoadingVal;
};
