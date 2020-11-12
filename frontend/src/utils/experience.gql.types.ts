import { useMutation, useSubscription } from "@apollo/client";
import {
  MutationFunctionOptions,
  MutationResult,
  MutationFunction,
  FetchPolicy,
  ApolloQueryResult,
} from "@apollo/client";
import { ExecutionResult } from "graphql/execution/execute";
import {
  UPDATE_EXPERIENCES_ONLINE_MUTATION,
  CREATE_EXPERIENCES_MUTATION,
  DELETE_EXPERIENCES_MUTATION,
  GET_EXPERIENCES_CONNECTION_MINI_QUERY,
  ON_EXPERIENCES_DELETED_SUBSCRIPTION,
  PRE_FETCH_EXPERIENCES_QUERY,
  GET_EXPERIENCE_QUERY,
  GET_DATA_OBJECTS_QUERY,
} from "../graphql/experience.gql";
import { UpdateExperienceInput } from "../graphql/apollo-types/globalTypes";
import {
  CommonError,
  OnlineStatus, //
} from "../utils/types";
import {
  updateExperiencesManualCacheUpdate, //
} from "../apollo/update-experiences-manual-cache-update";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
} from "../graphql/apollo-types/UpdateExperiencesOnline";
import {
  CreateExperiences,
  CreateExperiencesVariables,
} from "../graphql/apollo-types/CreateExperiences";
import {
  DeleteExperiences,
  DeleteExperiencesVariables,
} from "../graphql/apollo-types/DeleteExperiences";
import {
  GetDetailExperience,
  GetDetailExperienceVariables,
} from "../graphql/apollo-types/GetDetailExperience";
import {
  GET_COMPLETE_EXPERIENCE_QUERY,
  GET_ENTRIES_QUERY,
} from "../graphql/experience.gql";
import {
  GetExperienceConnectionMiniVariables,
  GetExperienceConnectionMini,
} from "../graphql/apollo-types/GetExperienceConnectionMini";
import { OnExperiencesDeletedSubscription } from "../graphql/apollo-types/OnExperiencesDeletedSubscription";
import { getSessionId } from "./session-manager";
import { PageInfoFragment } from "../graphql/apollo-types/PageInfoFragment";
import { ExperienceMiniFragment } from "../graphql/apollo-types/ExperienceMiniFragment";
import { UpdateExperienceSomeSuccessFragment } from "../graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  GetEntries,
  GetEntriesVariables,
} from "../graphql/apollo-types/GetEntries";
import {
  PreFetchExperiences,
  PreFetchExperiencesVariables,
} from "../graphql/apollo-types/PreFetchExperiences";
import {
  GetExperienceVariables,
  GetExperience,
} from "../graphql/apollo-types/GetExperience";
import {
  GetDataObjectsVariables,
  GetDataObjects,
} from "../graphql/apollo-types/GetDataObjects";
import { SyncError } from "./sync-to-server.types";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { getExperienceQuery } from "../apollo/get-detailed-experience-query";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";

////////////////////////// UPDATE EXPERIENCES SECTION //////////////////

export function useUpdateExperiencesOnlineMutation(): UseUpdateExperiencesOnlineMutation {
  return useMutation(UPDATE_EXPERIENCES_ONLINE_MUTATION);
}

interface UpdateExperiencesOnlineEffectHelperFunc {
  input: UpdateExperienceInput[];
  updateExperiencesOnline: UpdateExperiencesOnlineMutationFn;
  onUpdateSuccess: (
    updateResult: UpdateExperienceSomeSuccessFragment,
    experience: ExperienceFragment,
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

        const updatedExperience = getExperienceQuery(
          experienceId,
        ) as ExperienceFragment;

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

export type UpdateExperiencesOnlineMutationResult = ExecutionResult<
  UpdateExperiencesOnline
>;

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
export type CreateExperiencesMutationResult = ExecutionResult<
  CreateExperiences
>;

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
export type DeleteExperiencesMutationResult = ExecutionResult<
  DeleteExperiences
>;

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

export function useOnExperiencesDeletedSubscription() {
  return useSubscription<OnExperiencesDeletedSubscription>(
    ON_EXPERIENCES_DELETED_SUBSCRIPTION,
    {
      variables: {
        clientSession: getSessionId(),
      },
    },
  );
}

////////////////////////// END DELETE EXPERIENCES SECTION ////////////

////////////////////////// START FULL EXPERIENCE SECTION ////////////////////

export function manuallyFetchDetailedExperience(
  variables: GetDetailExperienceVariables,
  fetchPolicy?: FetchPolicy,
) {
  const { client } = window.____ebnis;

  return client.query<GetDetailExperience, GetDetailExperienceVariables>({
    query: GET_COMPLETE_EXPERIENCE_QUERY,
    variables,
    fetchPolicy,
  });
}

export type DetailedExperienceQueryResult = ApolloQueryResult<
  GetDetailExperience
>;

export function manuallyFetchEntries(variables: GetEntriesVariables) {
  const { client } = window.____ebnis;

  return client.query<GetEntries, GetEntriesVariables>({
    query: GET_ENTRIES_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}

export type GetEntriesQueryResult = ApolloQueryResult<GetEntries>;

export function manuallyFetchExperience(variables: GetExperienceVariables) {
  const { client } = window.____ebnis;

  return client.query<GetExperience, GetExperienceVariables>({
    query: GET_EXPERIENCE_QUERY,
    variables,
  });
}

export type GetExperienceQueryResult = ApolloQueryResult<GetExperience>;

////////////////////////// END COMPLETE EXPERIENCE SECTION ////////////////////

export function manuallyFetchExperienceConnectionMini(
  fetchPolicy?: FetchPolicy,
  pagination: GetExperienceConnectionMiniVariables = {},
) {
  const { client } = window.____ebnis;

  return client.query<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    query: GET_EXPERIENCES_CONNECTION_MINI_QUERY,
    variables: pagination,
    fetchPolicy: fetchPolicy || "network-only",
  });
}

export type GetExperienceConnectionMiniQueryResult = ApolloQueryResult<
  GetExperienceConnectionMini
>;

export const EXPERIENCES_MINI_FETCH_COUNT = 10;

export type ExperienceData = {
  experience: ExperienceMiniFragment;
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

export function manuallyGetDataObjects(variables: GetDataObjectsVariables) {
  const { client } = window.____ebnis;

  return client.query<GetDataObjects, GetDataObjectsVariables>({
    query: GET_DATA_OBJECTS_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}
