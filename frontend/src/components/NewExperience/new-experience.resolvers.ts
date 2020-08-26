/* eslint-disable react-hooks/rules-of-hooks*/
import gql from "graphql-tag";
import {
  LocalResolverFn,
  MUTATION_NAME_createExperienceOffline,
} from "../../apollo/resolvers";
import { CreateDataDefinition } from "../../graphql/apollo-types/globalTypes";
import { makeOfflineId } from "../../utils/offlines";
import {
  ExperienceFragment_dataDefinitions,
  ExperienceFragment,
} from "../../graphql/apollo-types/ExperienceFragment";
import {
  EXPERIENCE_FRAGMENT,
  GET_COMPLETE_EXPERIENCE_QUERY,
} from "../../graphql/experience.gql";
import { insertReplaceRemoveExperiencesInGetExperiencesMiniQuery } from "../../apollo/update-get-experiences-mini-query";
import { writeUnsyncedExperience } from "../../apollo/unsynced-ledger";
import {
  MutationFunction,
  MutationFunctionOptions,
  MutationResult,
  useMutation,
} from "@apollo/client";
import { ExecutionResult } from "graphql/execution/execute";
import {
  CreateExperiencesVariables,
  CreateExperiences_createExperiences,
  CreateExperiences_createExperiences_CreateExperienceErrors_errors,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "../../graphql/apollo-types/CreateExperiences";
import { v4 } from "uuid";
import { getExperiencesMiniQuery } from "../../apollo/get-experiences-mini-query";
import {
  GetExperienceConnectionMini_getExperiences_edges,
  GetExperienceConnectionMini_getExperiences_edges_node,
} from "../../graphql/apollo-types/GetExperienceConnectionMini";
import {
  GetDetailExperience,
  GetDetailExperienceVariables,
} from "../../graphql/apollo-types/GetDetailExperience";
import { entriesPaginationVariables } from "../../graphql/entry.gql";

const createOfflineExperienceResolver: LocalResolverFn<
  CreateExperiencesVariables,
  CreateExperiences_createExperiences
> = (_, variables, { cache }) => {
  const { input: inputs } = variables;
  const input = inputs[0];

  const existingExperiencesMini = getExperiencesMiniQuery();

  const existingExperiences = existingExperiencesMini
    ? (existingExperiencesMini.edges as GetExperienceConnectionMini_getExperiences_edges[])
    : ([] as GetExperienceConnectionMini_getExperiences_edges[]);

  const exists = existingExperiences.find((e) => {
    const edge = e as GetExperienceConnectionMini_getExperiences_edges;
    return (
      (edge.node as GetExperienceConnectionMini_getExperiences_edges_node)
        .title === input.title
    );
  });

  if (exists) {
    return {
      __typename: "CreateExperienceErrors",
      errors: {
        __typename: "CreateExperienceError",
        title: "has already been taken",
      } as CreateExperiences_createExperiences_CreateExperienceErrors_errors,
    };
  }

  const today = new Date();
  const timestamp = today.toJSON();
  const experienceId = makeOfflineId(v4());

  const {
    dataDefinitions: createDataDefinitions,
    title,
    description = null,
  } = input;

  const dataDefinitions: ExperienceFragment_dataDefinitions[] = (createDataDefinitions as CreateDataDefinition[]).map(
    ({ name, type }, index) => {
      const id = experienceId + "--" + index;

      return {
        __typename: "DataDefinition",
        name,
        type,
        id,
        clientId: id,
      };
    },
  );

  const experience: ExperienceFragment = {
    __typename: "Experience",
    id: experienceId,
    clientId: experienceId,
    insertedAt: timestamp,
    updatedAt: timestamp,
    description: description as string,
    title,
    dataDefinitions,
    entries: {
      __typename: "EntryConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };

  cache.writeQuery<GetDetailExperience, GetDetailExperienceVariables>({
    query: GET_COMPLETE_EXPERIENCE_QUERY,
    data: {
      getExperience: experience,
    },
    variables: {
      id: experienceId,
      entriesPagination: entriesPaginationVariables.entriesPagination,
    },
  });

  insertReplaceRemoveExperiencesInGetExperiencesMiniQuery([
    [experienceId, experience],
  ]);

  writeUnsyncedExperience(experienceId, true);

  return {
    __typename: "ExperienceSuccess",
    experience,
  } as CreateExperiences_createExperiences_ExperienceSuccess;
};

export const CREATE_OFFLINE_EXPERIENCE_MUTATION = gql`
  mutation CreateOfflineExperienceMutation($input: CreateExperienceInput!) {
    createOfflineExperience(input: $input) @client {
      __typename
      ... on ExperienceSuccess {
        experience {
          ...ExperienceFragment
        }
      }
      ... on CreateExperienceErrors {
        errors {
          title
        }
      }
    }
  }

  ${EXPERIENCE_FRAGMENT}
`;

export interface CreateExperienceOfflineMutation {
  createOfflineExperience: CreateExperiences_createExperiences;
}

// istanbul ignore next:
export function useCreateExperienceOfflineMutation() {
  return useMutation<
    CreateExperienceOfflineMutation,
    CreateExperiencesVariables
  >(CREATE_OFFLINE_EXPERIENCE_MUTATION);
}

export type CreateExperienceOfflineMutationResult = ExecutionResult<
  CreateExperienceOfflineMutation
>;

export type CreateExperienceOfflineMutationFn = MutationFunction<
  CreateExperienceOfflineMutation,
  CreateExperiencesVariables
>;

// used to type check test mock calls
export type CreateOfflineExperienceMutationFnOptions = MutationFunctionOptions<
  CreateExperienceOfflineMutation,
  CreateExperiencesVariables
>;

export type UseCreateExperienceOfflineMutation = [
  CreateExperienceOfflineMutationFn,
  MutationResult<CreateExperienceOfflineMutation>,
];

// component's props should extend this
export interface CreateExperienceOfflineMutationComponentProps {
  createExperienceOffline: CreateExperienceOfflineMutationFn;
}

export const experienceDefinitionResolvers = {
  Mutation: {
    [MUTATION_NAME_createExperienceOffline]: createOfflineExperienceResolver,
  },

  Query: {},
};
