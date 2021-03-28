import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { CreateEntryInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  isOfflineId,
  makeOfflineDataObjectIdFromEntry,
  makeOfflineEntryIdFromExperience,
} from "@eb/cm/src/utils/offlines";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceCompleteFragment,
} from "../../apollo/get-detailed-experience-query";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "../../apollo/unsynced-ledger";
import { UnsyncedModifiedExperience } from "../../utils/unsynced-ledger.types";
import {
  upsertNewEntry,
  UpsertNewEntryReturnVal,
} from "./upsert-entry.injectables";

export async function createOfflineEntryMutation(
  variables: CreateOfflineEntryMutationVariables,
  experienceArg?: ExperienceCompleteFragment,
): Promise<CreateOfflineEntryMutationReturnVal | null> {
  const { experienceId, insertedAt, updatedAt } = variables;
  const today = new Date();
  const timestamps = today.toJSON();
  const experience =
    experienceArg || readExperienceCompleteFragment(experienceId);

  if (!experience) {
    return null;
  }

  let id = variables.id as string;

  if (!id) {
    const entryIndex = (getCachedEntriesDetailViewSuccess(experienceId)
      .edges as EntryConnectionFragment_edges[]).length;

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
  experience: ExperienceCompleteFragment;
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
