import { GetCachedExperiencesConnectionListViewInjectType } from "./apollo/cached-experiences-list-view";
import { CreateExperienceOnlineMutationInjectType } from "./apollo/create-experience-online-mutation-fn";
import {
  GetDeleteExperienceLedgerInjectType,
  PutOrRemoveDeleteExperienceLedgerInjectType,
} from "./apollo/delete-experience-cache";
import {
  GetCachedEntriesDetailViewSuccessInjectType,
  ReadEntryFragmentInjectType,
} from "./apollo/experience-detail-cache-utils";
import {
  GetExperienceDetailViewInjectType,
  GetGetDataObjectsInjectType,
  SubscribeToGraphqlExperiencesDeletedEventInjectType,
} from "./apollo/experience.gql.types";
import {
  CleanUpOfflineExperiencesInjectType,
  PurgeEntryInjectType,
  PurgeExperiencesFromCacheInjectType,
} from "./apollo/experiences-list-cache-utils";
import { GetExperienceConnectionListViewInjectType } from "./apollo/get-experiences-connection-list.gql";
import { UseWithSubscriptionContextInjectType } from "./apollo/injectables";
import { SyncToServerInjectType } from "./apollo/sync-to-server";
import { GetSyncErrorsInjectType } from "./apollo/sync-to-server-cache";
import { UpdateExperiencesMutationInjectType } from "./apollo/update-experiences.gql";
import { CreateOfflineEntryMutationInjectType } from "./apollo/upsert-entry.resolvers";
import {
  CreateOfflineExperienceInjectType,
  UpdateExperienceOfflineFnInjectType,
} from "./apollo/upsert-experience.resolvers";
import {
  GetLocationInjectionType,
  SetUpRoutePageInjectType,
  WindowChangeUrlInjectType,
} from "./global-window";
import { ScrollIntoViewInjectType } from "./scroll-into-view";
import { GetIsConnectedInjectType } from "./utils/connections";
import { GetUserInjectType } from "./utils/manage-user-auth";
import { ComponentTimeoutsMsInjectType } from "./utils/timers";

export type UpsertExperienceInjections = GetExperienceDetailViewInjectType &
  GetGetDataObjectsInjectType &
  CreateOfflineExperienceInjectType &
  UpdateExperienceOfflineFnInjectType &
  GetCachedEntriesDetailViewSuccessInjectType &
  UpdateExperiencesMutationInjectType &
  GetIsConnectedInjectType &
  WindowChangeUrlInjectType &
  ScrollIntoViewInjectType &
  CreateExperienceOnlineMutationInjectType;

export type UpsertEntryInjections = UpdateExperiencesMutationInjectType &
  CreateOfflineEntryMutationInjectType &
  ScrollIntoViewInjectType &
  GetIsConnectedInjectType;

export type ListExperiencesViewInjections =
  UseWithSubscriptionContextInjectType &
    SetUpRoutePageInjectType &
    GetIsConnectedInjectType &
    GetExperienceConnectionListViewInjectType &
    GetCachedExperiencesConnectionListViewInjectType &
    GetSyncErrorsInjectType &
    GetDeleteExperienceLedgerInjectType &
    PutOrRemoveDeleteExperienceLedgerInjectType &
    PurgeExperiencesFromCacheInjectType &
    ComponentTimeoutsMsInjectType &
    CleanUpOfflineExperiencesInjectType;

export type WithSubscriptionsComponentInjections =
  PurgeExperiencesFromCacheInjectType &
    PurgeEntryInjectType &
    GetUserInjectType &
    ReadEntryFragmentInjectType &
    SyncToServerInjectType &
    WindowChangeUrlInjectType &
    GetLocationInjectionType &
    SubscribeToGraphqlExperiencesDeletedEventInjectType;
