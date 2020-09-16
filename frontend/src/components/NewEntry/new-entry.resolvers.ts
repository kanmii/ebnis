import {
  useMutation,
  MutationFunction,
  MutationFunctionOptions,
  MutationResult,
} from "@apollo/client";
import { ExecutionResult } from "graphql/execution/execute";
import {
  LocalResolverFn,
  MUTATION_NAME_createOfflineEntry,
} from "../../apollo/resolvers";
import {
  isOfflineId,
  makeOfflineEntryIdFromExperience,
  makeOfflineDataObjectIdFromEntry,
} from "../../utils/offlines";
import { CreateDataObject } from "../../graphql/apollo-types/globalTypes";
import gql from "graphql-tag";
import {
  upsertNewEntry,
  UpsertNewEntryReturnVal,
} from "./new-entry.injectables";
import { ENTRY_FRAGMENT } from "../../graphql/entry.gql";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "../../apollo/unsynced-ledger";
import { UnsyncedModifiedExperience } from "../../utils/unsynced-ledger.types";
import {
  getEntriesQuerySuccess,
  readExperienceFragment,
} from "../../apollo/get-detailed-experience-query";
import { EntryConnectionFragment_edges } from "../../graphql/apollo-types/EntryConnectionFragment";

export const CREATE_OFFLINE_ENTRY_MUTATION = gql`
  mutation CreateOfflineEntry(
    $experienceId: String!
    $dataObjects: [DataObjects!]!
  ) {
    createOfflineEntry(experienceId: $experienceId, dataObjects: $dataObjects)
      @client {
      entry {
        ...EntryFragment
      }
    }
  }

  ${ENTRY_FRAGMENT}
`;

export interface CreateOfflineEntryMutationValid {
  id: string;
  entry: EntryFragment;
  experience: ExperienceFragment;
  __typename: "Entry";
}

interface CreateOfflineEntryMutationReturned {
  createOfflineEntry: CreateOfflineEntryMutationValid | null;
}

export type CreateOfflineEntryResult = ExecutionResult<
  CreateOfflineEntryMutationReturned
>;

const createOfflineEntryMutationResolver: LocalResolverFn<
  CreateOfflineEntryMutationVariables,
  CreateOfflineEntryMutationReturned["createOfflineEntry"]
> = (_, variables) => {
  const { experienceId } = variables;
  const today = new Date();
  const timestamps = today.toJSON();
  const experience = readExperienceFragment(experienceId);

  if (!experience) {
    return null;
  }

  const entryIndex = (getEntriesQuerySuccess(experienceId)
    .edges as EntryConnectionFragment_edges[]).length;

  const id = makeOfflineEntryIdFromExperience(experienceId, entryIndex);

  const dataObjects = variables.dataObjects.map((dataObject, index) => {
    const dataObjectId = makeOfflineDataObjectIdFromEntry(id, index);

    return {
      ...dataObject,
      __typename: "DataObject" as "DataObject",
      id: dataObjectId,
      clientId: dataObjectId,
      insertedAt: timestamps,
      updatedAt: timestamps,
    };
  });

  const entry: EntryFragment = {
    __typename: "Entry",
    id,
    clientId: id,
    experienceId,
    dataObjects,
    insertedAt: timestamps,
    updatedAt: timestamps,
  };

  const updates = upsertNewEntry(
    experience.id,
    entry,
  ) as UpsertNewEntryReturnVal;

  updateUnsynced(experienceId);

  return { id, experience: updates.experience, entry, __typename: "Entry" };
};

export interface CreateOfflineEntryMutationVariables {
  dataObjects: CreateDataObject[];
  experienceId: string;
}

export const newEntryResolvers = {
  Mutation: {
    [MUTATION_NAME_createOfflineEntry]: createOfflineEntryMutationResolver,
  },

  Query: {},
};

function updateUnsynced(experienceId: string) {
  if (isOfflineId(experienceId)) {
    return;
  }

  const unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    // istanbul ignore next:
    {}) as UnsyncedModifiedExperience;

  unsyncedExperience.newEntries = true;
  writeUnsyncedExperience(experienceId, unsyncedExperience);
}

////////////////////////// TYPES SECTION ////////////////////////////

// istanbul ignore next:
export function useCreateOfflineEntryMutation(): UseCreateOfflineEntryMutation {
  return useMutation(CREATE_OFFLINE_ENTRY_MUTATION);
}

export type CreateOfflineEntryMutationFn = MutationFunction<
  CreateOfflineEntryMutationReturned,
  CreateOfflineEntryMutationVariables
>;

// used to type check test mock calls
export type CreateOfflineEntryMutationFnOptions = MutationFunctionOptions<
  CreateOfflineEntryMutationReturned,
  CreateOfflineEntryMutationVariables
>;

export type UseCreateOfflineEntryMutation = [
  CreateOfflineEntryMutationFn,
  MutationResult<CreateOfflineEntryMutationReturned>,
];

// component's props should extend this
export interface CreateOfflineEntryMutationComponentProps {
  createOfflineEntry: CreateOfflineEntryMutationFn;
}
