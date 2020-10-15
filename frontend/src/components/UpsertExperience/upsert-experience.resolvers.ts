/* eslint-disable react-hooks/rules-of-hooks*/
import gql from "graphql-tag";
import {
  LocalResolverFn,
  MUTATION_NAME_createExperienceOffline,
} from "../../apollo/resolvers";
import {
  CreateDataDefinition,
  UpdateExperienceInput,
  UpdateDefinitionInput,
  DataTypes,
} from "../../graphql/apollo-types/globalTypes";
import { makeOfflineId, isOfflineId } from "../../utils/offlines";
import {
  ExperienceFragment_dataDefinitions,
  ExperienceFragment,
} from "../../graphql/apollo-types/ExperienceFragment";
import {
  EXPERIENCE_FRAGMENT,
  GET_COMPLETE_EXPERIENCE_QUERY,
} from "../../graphql/experience.gql";
import {
  insertReplaceRemoveExperiencesInGetExperiencesMiniQuery,
  purgeEntry,
  floatExperienceToTheTopInGetExperiencesMiniQuery,
} from "../../apollo/update-get-experiences-mini-query";
import {
  writeUnsyncedExperience,
  getUnsyncedExperience,
} from "../../apollo/unsynced-ledger";
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
import {
  emptyGetEntries,
  toGetEntriesSuccessQuery,
} from "../../graphql/utils.gql";
import immer from "immer";
import {
  writeExperienceFragmentToCache,
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
  readExperienceFragment,
} from "../../apollo/get-detailed-experience-query";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { EntryConnectionFragment_edges } from "../../graphql/apollo-types/EntryConnectionFragment";
import { UnsyncedModifiedExperience } from "../../utils/unsynced-ledger.types";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import {
  parseDataObjectData,
  stringifyDataObjectData,
} from "../NewEntry/new-entry.utils";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "../../graphql/apollo-types/GetEntries";

////////////////////////// CREATE ////////////////////////////

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
  };

  cache.writeQuery<GetDetailExperience, GetDetailExperienceVariables>({
    query: GET_COMPLETE_EXPERIENCE_QUERY,
    data: {
      getExperience: experience,
      getEntries: emptyGetEntries,
    },
    variables: {
      experienceId,
      pagination: {
        first: 10,
      },
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

export interface CreateExperienceOfflineMutationReturned {
  createOfflineExperience: CreateExperiences_createExperiences;
}

// istanbul ignore next:
export function useCreateExperienceOfflineMutation() {
  return useMutation<
    CreateExperienceOfflineMutationReturned,
    CreateExperiencesVariables
  >(CREATE_OFFLINE_EXPERIENCE_MUTATION);
}

export type CreateExperienceOfflineMutationResult = ExecutionResult<
  CreateExperienceOfflineMutationReturned
>;

export type CreateExperienceOfflineMutationFn = MutationFunction<
  CreateExperienceOfflineMutationReturned,
  CreateExperiencesVariables
>;

// used to type check test mock calls
export type CreateOfflineExperienceMutationFnOptions = MutationFunctionOptions<
  CreateExperienceOfflineMutationReturned,
  CreateExperiencesVariables
>;

export type UseCreateExperienceOfflineMutation = [
  CreateExperienceOfflineMutationFn,
  MutationResult<CreateExperienceOfflineMutationReturned>,
];

// component's props should extend this
export interface CreateExperienceOfflineMutationComponentProps {
  createExperienceOffline: CreateExperienceOfflineMutationFn;
}

////////////////////////// END CREATE ////////////////////////////

////////////////////////// UPDATE ////////////////////////////

export function updateExperienceOfflineFn(input: UpdateExperienceOfflineInput) {
  const { experienceId } = input;

  const experience = readExperienceFragment(experienceId);

  if (!experience) {
    return;
  }

  const unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    // istanbul ignore else:
    {}) as UnsyncedModifiedExperience;

  let entriesUpdated = false;
  const entries = getEntriesQuerySuccess(experienceId);

  const immerUpdate: ImmerUpdate = [experience, unsyncedExperience, entries];

  const [updatedExperience, updatedUnsyncedExperience] = immer<ImmerUpdate>(
    immerUpdate,
    ([proxy, immerUnsyncedExperience, immerEntries]) => {
      const modifiedOwnFields = immerUnsyncedExperience.ownFields || {};
      const modifiedDefinitions = immerUnsyncedExperience.definitions || {};
      const modifiedEntries = immerUnsyncedExperience.modifiedEntries || {};
      const deletedEntries = immerUnsyncedExperience.deletedEntries || [];

      const { edges: entriesEdges, ...rest } = immerEntries;

      const {
        ownFields,
        updateDefinitions,
        updatedEntry,
        deletedEntry,
      } = input;
      const { title, description } = ownFields || {};

      if (title) {
        proxy.title = title;
        modifiedOwnFields.title = true;
        immerUnsyncedExperience.ownFields = modifiedOwnFields;
      }

      if (description !== undefined) {
        proxy.description = description;
        modifiedOwnFields.description = true;
        immerUnsyncedExperience.ownFields = modifiedOwnFields;
      }

      let newEdges: EntryConnectionFragment_edges[] = [];

      // entry must be updated before definitions.type update
      if (updatedEntry || deletedEntry) {
        (entriesEdges as EntryConnectionFragment_edges[]).forEach((edge) => {
          let shouldAppend = true;
          const entry = edge.node as EntryFragment;
          const { id: entryId } = entry;

          if (updatedEntry && updatedEntry.entry.id === entryId) {
            edge.node = updatedEntry.entry;

            const modifiedEntry = modifiedEntries[entryId] || {};

            updatedEntry.dataObjectsIds.forEach((dataObjectId) => {
              modifiedEntry[dataObjectId] = true;
            });

            modifiedEntries[entryId] = modifiedEntry;
            immerUnsyncedExperience.modifiedEntries = modifiedEntries;
            entriesUpdated = true;
          }

          if (deletedEntry && deletedEntry.id === entryId) {
            deletedEntries.push(entryId);
            immerUnsyncedExperience.deletedEntries = deletedEntries;
            purgeEntry(entry);
            shouldAppend = false;
          }

          if (shouldAppend) {
            newEdges.push(edge);
          }
        });
      }

      if (updateDefinitions) {
        immerUnsyncedExperience.definitions = modifiedDefinitions;

        const idToDefinitionUpdateMap = updateDefinitions.reduce((acc, d) => {
          acc[d.id] = d;
          return acc;
        }, {} as { [key: string]: UpdateDefinitionInput });

        const definitionIdToTypeMap: { [definitionId: string]: DataTypes } = {};
        let hasTypeUpdate = false;

        proxy.dataDefinitions = proxy.dataDefinitions.map((d) => {
          const definition = d as DataDefinitionFragment;
          const { id } = definition;
          const updates = idToDefinitionUpdateMap[id];

          if (updates) {
            const modifiedDefinition = modifiedDefinitions[id] || {};
            modifiedDefinitions[id] = modifiedDefinition;
            const { name, type } = updates;

            if (name) {
              definition.name = name;
              modifiedDefinition.name = true;
            }

            if (type) {
              definitionIdToTypeMap[id] = type;
              modifiedDefinition.type = true;
              definition.type = type;
              entriesUpdated = true;
              hasTypeUpdate = true;
            }

            return definition;
          }

          return definition;
        });

        if (hasTypeUpdate) {
          newEdges.forEach((edge) => {
            const entry = edge.node as EntryFragment;

            entry.dataObjects.forEach((d) => {
              const dataObject = d as DataObjectFragment;
              const type = definitionIdToTypeMap[dataObject.id];

              if (type) {
                const { data } = dataObject;
                const parsedData = parseDataObjectData(data);
                dataObject.data = stringifyDataObjectData(type, parsedData);
              }
            });
          });
        }
      }

      if (entriesUpdated) {
        const entries = {
          ...rest,
          edges: newEdges,
        };

        writeGetEntriesQuery(experienceId, toGetEntriesSuccessQuery(entries));
      }
    },
  );

  if (!isOfflineId(experienceId)) {
    writeUnsyncedExperience(experienceId, updatedUnsyncedExperience);
  }

  floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);
  writeExperienceFragmentToCache(updatedExperience);

  return updatedExperience;
}

export type UpdateExperienceOfflineInput = UpdateExperienceInput & {
  updatedEntry?: {
    entry: EntryFragment;
    dataObjectsIds: string[];
  };
  deletedEntry?: EntryFragment;
};

type ImmerUpdate = [
  ExperienceFragment,
  UnsyncedModifiedExperience,
  GetEntries_getEntries_GetEntriesSuccess_entries,
];

////////////////////////// END UPDATE ////////////////////////////

export const upsertExperienceResolvers = {
  Mutation: {
    [MUTATION_NAME_createExperienceOffline]: createOfflineExperienceResolver,
  },

  Query: {},
};
