/* istanbul ignore file */
import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { CachePersistor } from "apollo-cache-persist-dev";
import { BroadcastChannel } from "broadcast-channel";
import { graphql, SetupWorkerApi } from "msw";
import { Socket as PhoenixSocket } from "phoenix";
import { Observable } from "zen-observable-ts";
import { CreateEntryErrorFragment } from "../../graphql/apollo-types/CreateEntryErrorFragment";
import { CreateExperienceErrorsFragment_errors } from "../../graphql/apollo-types/CreateExperienceErrorsFragment";
import { DataObjectErrorFragment } from "../../graphql/apollo-types/DataObjectErrorFragment";
import { DefinitionErrorFragment } from "../../graphql/apollo-types/DefinitionErrorFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "../../graphql/apollo-types/ExperienceCompleteFragment";
import { UpdateExperienceOwnFieldsErrorFragment } from "../../graphql/apollo-types/UpdateExperienceOwnFieldsErrorFragment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = Record<string, any>;

export const CYPRESS_APOLLO_KEY = "ebnis-cypress-apollo";

export interface AppSocket extends PhoenixSocket {
  ebnisConnect: (token?: string | null) => AppSocket;
}

export interface EbnisGlobals {
  cache: InMemoryCache;
  client: ApolloClient<Any>;
  persistor: CachePersistor<Any>;
  connectionStatus: ConnectionStatus;
  logApolloQueries?: boolean;
  logReducers?: boolean;
  bcBroadcaster: BChannel;
  mswBrowserWorker?: MswSetupWorkerApi;
  mswGraphql?: MswGraphql;
  emitter: ZenObservable.SubscriptionObserver<EmitAction>;
  emitData: EmitData;
  observable: Observable<EmitAction>;
  apolloLink: ApolloLink;
  appSocket: AppSocket;
}

declare global {
  interface Window {
    Cypress: {
      env: <T>(k?: string, v?: T) => void | T;
    };

    ____ebnis: EbnisGlobals;
  }
}

export type KeyOfEbnisGlobals = keyof EbnisGlobals;

export interface ConnectionStatus {
  isConnected: boolean | null;
  mode: "auto" | "manual";
}

export type BChannel = BroadcastChannel<BroadcastAction>;

export type BroadcastAction =
  | BroadcastMessageExperienceDeleted
  | BroadcastMessageOnSyncData;

export enum BroadcastMessageType {
  experienceDeleted = "@broadcast/experience-deleted",
  syncDone = "@broadcast/sync-done",
}

export type BroadcastMessageOnSyncData = OnSyncedData & {
  type: BroadcastMessageType.syncDone;
};

export type BroadcastMessageExperienceDeleted = {
  type: BroadcastMessageType.experienceDeleted;
  id: string;
  title: string;
};

export type OnSyncedData = {
  onlineExperienceIdToOfflineEntriesMap?: OnlineExperienceIdToOfflineEntriesMap;
  offlineIdToOnlineExperienceMap?: OfflineIdToOnlineExperienceMap;
  syncErrors?: SyncErrors;
  onlineExperienceUpdatedMap?: OnlineExperienceUpdatedMap;
};

export type OnlineExperienceUpdatedMap = {
  [onlineExperienceId: string]: true;
};

export type OnlineExperienceIdToOfflineEntriesMap = {
  [onlineExperienceId: string]: OfflineIdToOnlineEntryMap;
};

export type OfflineIdToOnlineExperienceMap = {
  [offlineExperienceId: string]: ExperienceCompleteFragment;
};

export type SyncErrors = {
  // experienceId will be offline experience id if we are unable to create
  // offline experience online and will be online ID if offline experience
  // successfully created online or online experience updates synced
  [experienceId: string]: SyncError;
};

export type SyncError = {
  // Only offline experience we are unable to create online
  createExperience?: CreateExperienceErrorsFragment_errors;

  createEntries?: OfflineIdToCreateEntrySyncErrorMap;

  updateEntries?: IdToUpdateEntrySyncErrorMap;

  ownFields?: UpdateExperienceOwnFieldsErrorFragment;

  definitions?: IdToDefinitionUpdateSyncErrorMap;
};

export type OfflineIdToOnlineEntryMap = {
  [entryClientId: string]: EntryFragment;
};

export type OfflineIdToCreateEntrySyncErrorMap = {
  [offlineEntryId: string]: CreateEntryErrorFragment;
};

export type IdToUpdateEntrySyncErrorMap = {
  [entryId: string]: UpdateEntrySyncErrors;
};

// string represents entry error
export type UpdateEntrySyncErrors = string | IdToUpdateDataObjectSyncErrorMap;

export type IdToUpdateDataObjectSyncErrorMap = {
  [dataObjectId: string]: DataObjectErrorFragment;
};

export type IdToDefinitionUpdateSyncErrorMap = {
  [definitionId: string]: DefinitionErrorFragment;
};

export type SyncFlag = Readonly<{
  canSync: boolean;
  isSyncing: boolean;
  onlineExperienceIdToOfflineId?: {
    [key: string]: string;
  };
}>;

export type UpdateSyncReturnVal = [
  OnlineExperienceIdToOfflineEntriesMap,
  SyncErrors,
  OnlineExperienceUpdatedMap,
];

export type SyncCreateReturnVal = [SyncErrors, OfflineIdToOnlineExperienceMap];

export interface SyncErrorsQueryResult {
  syncErrors: SyncErrors;
}

export enum EmitActionType {
  connectionChanged = "@emit-action/connection-changed",
  random = "@emit-action/nothing",
  syncDone = "@emit-action/sync-done",
}

export type EmitData = (params: EmitAction) => void;

export type EmitAction =
  | ({
      type: EmitActionType.connectionChanged;
    } & EmitActionConnectionChangedPayload)
  | {
      type: EmitActionType.random;
    }
  | BroadcastMessageExperienceDeleted
  | BroadcastMessageOnSyncData;

export interface EmitActionConnectionChangedPayload {
  connected: boolean;
}

export type CommonError = Error | string;

export type RestoreCacheOrPurgeStorageFn = (
  persistor: CachePersistor<Any>,
) => Promise<CachePersistor<Any>>;

export type IEnum<T extends Any> = T[keyof T];

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
  update: "update" as UpdateVal,
  insert: "insert" as InsertVal,
  reFetchOnly: "re-fecht-only" as ReFetchOnly,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selfBcMessageKey: "self-bc-message" as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type MswGraphql = typeof graphql;
export type MswSetupWorkerApi = SetupWorkerApi;
