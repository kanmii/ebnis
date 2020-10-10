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
} from "../graphql/experience.gql";
import { UpdateExperienceInput } from "../graphql/apollo-types/globalTypes";
import {
  CommonError, //
} from "../utils/types";
import {
  writeUpdatedExperienceToCache, //
} from "../apollo/write-updated-experiences-to-cache";
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

////////////////////////// UPDATE EXPERIENCES SECTION //////////////////

export function useUpdateExperiencesOnlineMutation(): UseUpdateExperiencesOnlineMutation {
  return useMutation(UPDATE_EXPERIENCES_ONLINE_MUTATION);
}

interface UpdateExperiencesOnlineEffectHelperFunc {
  input: UpdateExperienceInput[];
  updateExperiencesOnline: UpdateExperiencesOnlineMutationFn;
  onUpdateSuccess: (arg: UpdateExperienceSomeSuccessFragment) => void;
  onError: (error?: CommonError) => void;
  onDone?: () => void;
}

export async function updateExperiencesOnlineEffectHelperFunc({
  input,
  updateExperiencesOnline,
  onUpdateSuccess,
  onError,
  onDone,
}: UpdateExperiencesOnlineEffectHelperFunc) {
  try {
    const response = await updateExperiencesOnline({
      variables: {
        input,
      },

      update: writeUpdatedExperienceToCache,
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
        onUpdateSuccess(updateResult);
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

export type KleinErfahrüngenAbfrageErgebnisse = ApolloQueryResult<
  GetExperienceConnectionMini
>;

export const EXPERIENCES_MINI_FETCH_COUNT = 10;

export type ExperiencesData = Readonly<{
  experiences: ExperienceMiniFragment[];
  pageInfo: PageInfoFragment;
}>;

export function preFetchExperiences(variables: PreFetchExperiencesVariables) {
  const { client } = window.____ebnis;

  return client.query<PreFetchExperiences, PreFetchExperiencesVariables>({
    query: PRE_FETCH_EXPERIENCES_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}
