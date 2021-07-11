import {
  getCachedEntriesDetailViewSuccess,
  readExperienceDFragment,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import { EntryConnectionFragment_edges } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { CreateEntryInput } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import {
  isOfflineId,
  makeOfflineDataObjectIdFromEntry,
  makeOfflineEntryIdFromExperience,
} from "@eb/shared/src/utils/offlines";
import { UnsyncedModifiedExperience } from "./unsynced-ledger.types";
import {
  upsertNewEntry,
  UpsertNewEntryReturnVal,
} from "./upsert-entry.injectables";

export async function createOfflineEntryMutation(
  variables: CreateOfflineEntryMutationVariables,
  experienceArg?: ExperienceDCFragment,
): Promise<CreateOfflineEntryMutationReturnVal | null> {
  const { experienceId, insertedAt, updatedAt } = variables;
  const today = new Date();
  const timestamps = today.toJSON();

  const experience = experienceArg || readExperienceDFragment(experienceId);

  if (!experience) {
    return null;
  }

  let id = variables.id as string;

  if (!id) {
    const entryIndex = (
      getCachedEntriesDetailViewSuccess(experienceId)
        .edges as EntryConnectionFragment_edges[]
    ).length;

    id = makeOfflineEntryIdFromExperience(experienceId, entryIndex);
  }

  const dataObjects = variables.dataObjects.map((dataObject, index) => {
    const { insertedAt, updatedAt } = dataObject;

    let dataObjectId = dataObject.id as string;

    if (!dataObjectId) {
      dataObjectId = makeOfflineDataObjectIdFromEntry(id, index);
    }

    return {
      ...dataObject,
      __typename: "DataObject" as "DataObject",
      id: dataObjectId,
      clientId: dataObjectId,
      insertedAt: insertedAt || timestamps,
      updatedAt: updatedAt || timestamps,
    };
  });

  const entry: EntryFragment = {
    __typename: "Entry",
    id,
    clientId: id,
    experienceId,
    dataObjects,
    insertedAt: insertedAt || timestamps,
    updatedAt: updatedAt || timestamps,
  };

  const updates = upsertNewEntry(experience, entry) as UpsertNewEntryReturnVal;

  updateUnsynced(experienceId);

  const { persistor } = window.____ebnis;
  await persistor.persist();

  return {
    id,
    experience: updates.experience,
    entry,
  };
}

export type CreateOfflineEntryMutationVariables = CreateEntryInput & {
  experienceId: string;
  id?: string;
};

export type CreateOfflineEntryMutationReturnVal = {
  id: string;
  entry: EntryFragment;
  experience: ExperienceDCFragment;
};

function updateUnsynced(experienceId: string) {
  if (isOfflineId(experienceId)) {
    return;
  }

  const unsyncedExperience = {
    ...((getUnsyncedExperience(experienceId) ||
      // istanbul ignore next:
      {}) as UnsyncedModifiedExperience),
  };

  unsyncedExperience.newEntries = true;
  writeUnsyncedExperience(experienceId, unsyncedExperience);
}

export type CreateOfflineEntryMutationInjectType = {
  createOfflineEntryMutationInject: typeof createOfflineEntryMutation;
};
