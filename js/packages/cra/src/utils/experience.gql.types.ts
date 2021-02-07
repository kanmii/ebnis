import {
  ApolloQueryResult,
  FetchPolicy,
  MutationFunction,
  MutationFunctionOptions,
  MutationResult,
  useMutation,
} from "@apollo/client";
import {
  CreateExperiences,
  CreateExperiencesVariables,
} from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import {
  DeleteExperiences,
  DeleteExperiencesVariables,
} from "@eb/cm/src/graphql/apollo-types/DeleteExperiences";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceListViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceListViewFragment";
import {
  GetDataObjects,
  GetDataObjectsVariables,
} from "@eb/cm/src/graphql/apollo-types/GetDataObjects";
import {
  GetEntriesDetailView,
  GetEntriesDetailViewVariables,
} from "@eb/cm/src/graphql/apollo-types/GetEntriesDetailView";
import {
  GetExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewVariables,
} from "@eb/cm/src/graphql/apollo-types/GetExperienceAndEntriesDetailView";
import {
  GetExperienceComments,
  GetExperienceCommentsVariables,
} from "@eb/cm/src/graphql/apollo-types/GetExperienceComments";
import {
  GetExperienceDetailView,
  GetExperienceDetailViewVariables,
} from "@eb/cm/src/graphql/apollo-types/GetExperienceDetailView";
import {
  GetExperiencesConnectionListView,
  GetExperiencesConnectionListViewVariables,
} from "@eb/cm/src/graphql/apollo-types/GetExperiencesConnectionListView";
import { UpdateExperienceInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { OnExperiencesDeletedSubscription } from "@eb/cm/src/graphql/apollo-types/OnExperiencesDeletedSubscription";
import { PageInfoFragment } from "@eb/cm/src/graphql/apollo-types/PageInfoFragment";
import {
  PreFetchExperiences,
  PreFetchExperiencesVariables,
} from "@eb/cm/src/graphql/apollo-types/PreFetchExperiences";
import { UpdateExperienceSomeSuccessFragment } from "@eb/cm/src/graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
} from "@eb/cm/src/graphql/apollo-types/UpdateExperiencesOnline";
import {
  CREATE_EXPERIENCES_MUTATION,
  DELETE_EXPERIENCES_MUTATION,
  GET_DATA_OBJECTS_QUERY,
  GET_ENTRIES_DETAIL_VIEW_QUERY,
  GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY,
  GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY,
  GET_EXPERIENCE_COMMENTS_QUERY,
  GET_EXPERIENCE_DETAIL_VIEW_QUERY,
  ON_EXPERIENCES_DELETED_SUBSCRIPTION,
  PRE_FETCH_EXPERIENCES_QUERY,
  UPDATE_EXPERIENCES_ONLINE_MUTATION,
} from "@eb/cm/src/graphql/experience.gql";
import { ExecutionResult } from "graphql/execution/execute";
import { getCachedExperienceDetailView } from "../apollo/get-detailed-experience-query";
import { updateExperiencesManualCacheUpdate } from "../apollo/update-experiences-manual-cache-update";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-list-view-query";
import { CommonError, OnlineStatus } from "../utils/types";
import { getSessionId } from "./session-manager";
import { SyncError } from "./sync-to-server.types";

////////////////////////// UPDATE EXPERIENCES SECTION //////////////////

export function useUpdateExperiencesOnlineMutation(): UseUpdateExperiencesOnlineMutation {
  return useMutation(UPDATE_EXPERIENCES_ONLINE_MUTATION);
}

interface UpdateExperiencesOnlineEffectHelperFunc {
  input: UpdateExperienceInput[];
  updateExperiencesOnline: UpdateExperiencesOnlineMutationFn;
  onUpdateSuccess: (
    updateResult: UpdateExperienceSomeSuccessFragment,
    experience: ExperienceCompleteFragment,
  ) => void;
  onError: (error?: CommonError) => void;
  onDone?: () => void;
}

export async function updateExperiencesOnlineEffectHelperFunc({
  input,
  updateExperiencesOnline,
  onUpdateSuccess,
  onError,
}: UpdateExperiencesOnlineEffectHelperFunc) {
  try {
    const response = await updateExperiencesOnline({
      variables: {
        input,
      },

      update: updateExperiencesManualCacheUpdate,
    });

    const validResponse =
      response && response.data && response.data.updateExperiences;

    if (!validResponse) {
      onError();
      return;
    }

    if (validResponse.__typename === "UpdateExperiencesAllFail") {
      onError(validResponse.error);
    } else {
      const updateResult = validResponse.experiences[0];

      if (updateResult.__typename === "UpdateExperienceErrors") {
        onError(updateResult.errors.error);
      } else {
        const { experienceId } = updateResult.experience;

        const updatedExperience = getCachedExperienceDetailView(
          experienceId,
        ) as ExperienceCompleteFragment;

        floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);

        onUpdateSuccess(updateResult, updatedExperience);
      }
    }
  } catch (errors) {
    onError(errors);
  }
}

export type UpdateExperiencesOnlineMutationFn = MutationFunction<
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables
>;

export type UpdateExperiencesOnlineMutationResult = ExecutionResult<UpdateExperiencesOnline>;

// used to type check test mock calls
export type UpdateExperiencesOnlineMutationFnOptions = MutationFunctionOptions<
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables
>;

export type UseUpdateExperiencesOnlineMutation = [
  UpdateExperiencesOnlineMutationFn,
  MutationResult<UpdateExperiencesOnline>,
];

// component's props should extend this
export interface UpdateExperiencesOnlineComponentProps {
  updateExperiencesOnline: UpdateExperiencesOnlineMutationFn;
}

////////////////////////// END UPDATE EXPERIENCES SECTION //////////////////

////////////////////////// START CREATE EXPERIENCES SECTION ////////////////////

export function useCreateExperiencesMutation(): UseCreateExperiencesMutation {
  return useMutation(CREATE_EXPERIENCES_MUTATION);
}

export type CreateExperiencesMutationFn = MutationFunction<
  CreateExperiences,
  CreateExperiencesVariables
>;

// used to type check test mock resolved value
export type CreateExperiencesMutationResult = ExecutionResult<CreateExperiences>;

// used to type check test mock calls
export type CreateExperiencesMutationFnOptions = MutationFunctionOptions<
  CreateExperiences,
  CreateExperiencesVariables
>;

type UseCreateExperiencesMutation = [
  CreateExperiencesMutationFn,
  MutationResult<CreateExperiences>,
];

// component's props should extend this
export interface CreateExperiencesOnlineComponentProps {
  createExperiences: CreateExperiencesMutationFn;
}

////////////////////////// END CREATE EXPERIENCES SECTION ///////////////

////////////////////////// DELETE EXPERIENCES SECTION ///////////////

export function useDeleteExperiencesMutation(): UseDeleteExperiencesMutation {
  return useMutation(DELETE_EXPERIENCES_MUTATION);
}

export type DeleteExperiencesMutationFn = MutationFunction<
  DeleteExperiences,
  DeleteExperiencesVariables
>;

// used to type check test fake mutation function return value e.g. {data: {result: {}}}
export type DeleteExperiencesMutationResult = ExecutionResult<DeleteExperiences>;

// used to type check test fake function calls arguments
export type DeleteExperiencesMutationFnOptions = MutationFunctionOptions<
  DeleteExperiences,
  DeleteExperiencesVariables
>;

export type UseDeleteExperiencesMutation = [
  DeleteExperiencesMutationFn,
  MutationResult<DeleteExperiences>,
];

// component's props should extend this
export interface DeleteExperiencesComponentProps {
  deleteExperiences: DeleteExperiencesMutationFn;
}

export function subscribeToGraphqlEvents() {
  const { client } = window.____ebnis;

  const observer = client.subscribe<OnExperiencesDeletedSubscription>({
    query: ON_EXPERIENCES_DELETED_SUBSCRIPTION,
    variables: {
      clientSession: getSessionId(),
    },
  });

  return observer;
}

////////////////////////// END DELETE EXPERIENCES SECTION ////////////

////////////////////////// START FULL EXPERIENCE SECTION ////////////////////

export function getExperienceAndEntriesDetailView(
  variables: GetExperienceAndEntriesDetailViewVariables,
  fetchPolicy?: FetchPolicy,
) {
  const { client } = window.____ebnis;

  return client.query<
    GetExperienceAndEntriesDetailView,
    GetExperienceAndEntriesDetailViewVariables
  >({
    query: GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY,
    variables,
    fetchPolicy,
  });
}

export type GetExperienceAndEntriesDetailViewQueryResult = ApolloQueryResult<GetExperienceAndEntriesDetailView>;

export function getEntriesDetailView(variables: GetEntriesDetailViewVariables) {
  const { client } = window.____ebnis;

  return client.query<GetEntriesDetailView, GetEntriesDetailViewVariables>({
    query: GET_ENTRIES_DETAIL_VIEW_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}

export type GetEntriesDetailViewQueryResult = ApolloQueryResult<GetEntriesDetailView>;

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

export type GetExperienceQueryResult = ApolloQueryResult<GetExperienceDetailView>;

////////////////////////// END COMPLETE EXPERIENCE SECTION ////////////////////

export function getExperienceConnectionListView(
  fetchPolicy?: FetchPolicy,
  pagination: GetExperiencesConnectionListViewVariables = {},
) {
  const { client } = window.____ebnis;

  return client.query<
    GetExperiencesConnectionListView,
    GetExperiencesConnectionListViewVariables
  >({
    query: GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY,
    variables: pagination,
    fetchPolicy: fetchPolicy || "network-only",
  });
}

export type GetExperiencesConnectionListViewQueryResult = ApolloQueryResult<GetExperiencesConnectionListView>;

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

export function preFetchExperiences(variables: PreFetchExperiencesVariables) {
  const { client } = window.____ebnis;

  return client.query<PreFetchExperiences, PreFetchExperiencesVariables>({
    query: PRE_FETCH_EXPERIENCES_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}

export function getGetDataObjects(variables: GetDataObjectsVariables) {
  const { client } = window.____ebnis;

  return client.query<GetDataObjects, GetDataObjectsVariables>({
    query: GET_DATA_OBJECTS_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}

export function getExperienceComments(variables: { experienceId: string }) {
  const { client } = window.____ebnis;

  return client.query<GetExperienceComments, GetExperienceCommentsVariables>({
    query: GET_EXPERIENCE_COMMENTS_QUERY,
    variables,
  });
}

export type GetExperienceCommentsQueryResult = ApolloQueryResult<GetExperienceComments>;
