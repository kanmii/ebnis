import {
  ApolloQueryResult,
  FetchPolicy,
  MutationFunction,
  MutationFunctionOptions,
  MutationResult,
} from "@apollo/client";
import { OnlineStatus, SyncError } from "@eb/shared/src/utils/types";
import { ExecutionResult } from "graphql/execution/execute";
import { ExperienceListViewFragment } from "../graphql/apollo-types/ExperienceListViewFragment";
import {
  GetDataObjects,
  GetDataObjectsVariables,
} from "../graphql/apollo-types/GetDataObjects";
import {
  GetExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewVariables,
} from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";
import {
  GetExperienceComments,
  GetExperienceCommentsVariables,
} from "../graphql/apollo-types/GetExperienceComments";
import {
  GetExperienceDetailView,
  GetExperienceDetailViewVariables,
} from "../graphql/apollo-types/GetExperienceDetailView";
import { OnExperiencesDeletedSubscription } from "../graphql/apollo-types/OnExperiencesDeletedSubscription";
import { PageInfoFragment } from "../graphql/apollo-types/PageInfoFragment";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
} from "../graphql/apollo-types/UpdateExperiencesOnline";
import {
  GET_DATA_OBJECTS_QUERY,
  GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY,
  GET_EXPERIENCE_COMMENTS_QUERY,
  GET_EXPERIENCE_DETAIL_VIEW_QUERY,
  ON_EXPERIENCES_DELETED_SUBSCRIPTION,
} from "../graphql/experience.gql";
import { getSessionId } from "../utils/session-manager";
import { CacheExperienceAndEntries } from "./experience-detail-entries-connection.gql";

////////////////////////// UPDATE EXPERIENCES SECTION //////////////////

export type UpdateExperiencesOnlineMutationFn = MutationFunction<
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables
>;

export type UpdateExperiencesOnlineMutationResult =
  ExecutionResult<UpdateExperiencesOnline>;

// used to type check test mock calls
export type UpdateExperiencesOnlineMutationFnOptions = MutationFunctionOptions<
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables
>;

export type UseUpdateExperiencesOnlineMutation = [
  UpdateExperiencesOnlineMutationFn,
  MutationResult<UpdateExperiencesOnline>,
];

////////////////////////// END UPDATE EXPERIENCES SECTION //////////////////

export function subscribeToGraphqlExperiencesDeletedEvent() {
  const { client } = window.____ebnis;

  const observer = client.subscribe<OnExperiencesDeletedSubscription>({
    query: ON_EXPERIENCES_DELETED_SUBSCRIPTION,
    variables: {
      clientSession: getSessionId(),
    },
  });

  return observer;
}

export type SubscribeToGraphqlExperiencesDeletedEventInjectType = {
  subscribeToGraphqlExperiencesDeletedEventInject: typeof subscribeToGraphqlExperiencesDeletedEvent;
};

////////////////////////// END DELETE EXPERIENCES SECTION ////////////

////////////////////////// START FULL EXPERIENCE SECTION ////////////////////

export function getExperienceAndEntriesDetailView(
  variables: GetExperienceAndEntriesDetailViewVariables,
  fetchPolicy?: FetchPolicy,
) {
  const { client } = window.____ebnis;

  return client.query<
    CacheExperienceAndEntries,
    GetExperienceAndEntriesDetailViewVariables
  >({
    query: GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY,
    variables,
    fetchPolicy,
  });
}

export type GetExperienceAndEntriesDetailViewInject = {
  getExperienceAndEntriesDetailViewInject: typeof getExperienceAndEntriesDetailView;
};

export type GetExperienceAndEntriesDetailViewQueryResult =
  ApolloQueryResult<GetExperienceAndEntriesDetailView>;

export function getExperienceDetailView(
  variables: GetExperienceDetailViewVariables,
) {
  const { client } = window.____ebnis;

  return client.query<
    GetExperienceDetailView,
    GetExperienceDetailViewVariables
  >({
    query: GET_EXPERIENCE_DETAIL_VIEW_QUERY,
    variables,
  });
}

export type GetExperienceDetailViewInjectType = {
  getExperienceDetailViewInject: typeof getExperienceDetailView;
};

export type GetExperienceQueryResult =
  ApolloQueryResult<GetExperienceDetailView>;

////////////////////////// END COMPLETE EXPERIENCE SECTION ////////////////////

export const EXPERIENCES_MINI_FETCH_COUNT = 10;

export type ExperienceData = {
  experience: ExperienceListViewFragment;
  syncError?: SyncError;
  onlineStatus: OnlineStatus;
};

export type ExperiencesData = {
  experiences: ExperienceData[];
  pageInfo: PageInfoFragment;
};

export function getGetDataObjects(variables: GetDataObjectsVariables) {
  const { client } = window.____ebnis;

  return client.query<GetDataObjects, GetDataObjectsVariables>({
    query: GET_DATA_OBJECTS_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}

export type GetGetDataObjectsInjectType = {
  getGetDataObjectsInject: typeof getGetDataObjects;
};

export function getExperienceComments(variables: { experienceId: string }) {
  const { client } = window.____ebnis;

  return client.query<GetExperienceComments, GetExperienceCommentsVariables>({
    query: GET_EXPERIENCE_COMMENTS_QUERY,
    variables,
  });
}

export type GetExperienceCommentsFn = typeof getExperienceComments;

export type GetExperienceCommentsQueryResult =
  ApolloQueryResult<GetExperienceComments>;
