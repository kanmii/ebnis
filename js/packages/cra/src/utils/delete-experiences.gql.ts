import {
  DeleteExperiences,
  DeleteExperiencesVariables,
} from "@eb/shared/src/graphql/apollo-types/DeleteExperiences";
import { DELETE_EXPERIENCES_MUTATION } from "@eb/shared/src/graphql/experience.gql";
import { ExecutionResult } from "graphql/execution/execute";

export async function deleteExperiences(variables: DeleteExperiencesVariables) {
  const { client } = window.____ebnis;

  const response = await client.mutate<
    DeleteExperiences,
    DeleteExperiencesVariables
  >({
    mutation: DELETE_EXPERIENCES_MUTATION,
    variables,
  });

  return response;
}

export type DeleteExperiencesMutationFn = typeof deleteExperiences;

// component's props should extend this
export interface DeleteExperiencesComponentProps {
  deleteExperiences: DeleteExperiencesMutationFn;
}

// used to type check test fake mutation function return value e.g. {data: {result: {}}}
export type DeleteExperiencesMutationResult =
  ExecutionResult<DeleteExperiences>;
