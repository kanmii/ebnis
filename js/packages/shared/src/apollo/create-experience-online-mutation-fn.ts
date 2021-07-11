import { ExecutionResult } from "graphql/execution/execute";
import {
  CreateExperiences,
  CreateExperiencesVariables,
} from "../graphql/apollo-types/CreateExperiences";
import { CREATE_EXPERIENCES_MUTATION } from "../graphql/experience.gql";
import { createExperiencesManualCacheUpdate } from "./create-experiences-manual-cache-update";

export function createExperienceOnlineMutation(
  variables: CreateExperiencesVariables,
  // onEvent: (data: CreateExperienceOnlineEvents) => void,
) {
  const { client } = window.____ebnis;

  return client.mutate<CreateExperiences, CreateExperiencesVariables>({
    mutation: CREATE_EXPERIENCES_MUTATION,
    variables,
    update: createExperiencesManualCacheUpdate,
  });
}

export type CreateExperienceOnlineMutationInjectType = {
  createExperienceOnlineMutationInject: typeof createExperienceOnlineMutation;
};

// used to type check test mock resolved value
export type CreateExperiencesMutationResult =
  ExecutionResult<CreateExperiences>;
