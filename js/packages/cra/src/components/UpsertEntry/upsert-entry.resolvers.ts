import {
  isOfflineId,
  makeOfflineEntryIdFromExperience,
  makeOfflineDataObjectIdFromEntry,
} from "../../utils/offlines";
import { CreateDataObject } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  upsertNewEntry,
  UpsertNewEntryReturnVal,
} from "./upsert-entry.injectables";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "../../apollo/unsynced-ledger";
import { UnsyncedModifiedExperience } from "../../utils/unsynced-ledger.types";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceCompleteFragment,
} from "../../apollo/get-detailed-experience-query";
import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";

export interface CreateOfflineEntryMutationValid {
  id: string;
  entry: EntryFragment;
  experience: ExperienceCompleteFragment;
  __typename: "Entry";
}

export function createOfflineEntryMutation(
  variables: CreateOfflineEntryMutationVariables,
) {
  const { experienceId } = variables;
  const today = new Date();
  const timestamps = today.toJSON();
  const experience = readExperienceCompleteFragment(experienceId);

  if (!experience) {
    return null;
  }

  const entryIndex = (getCachedEntriesDetailViewSuccess(experienceId)
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

  const updates = upsertNewEntry(experience, entry) as UpsertNewEntryReturnVal;

  updateUnsynced(experienceId);

  return {
    id,
    experience: updates.experience,
    entry,
  };
}

export interface CreateOfflineEntryMutationVariables {
  dataObjects: CreateDataObject[];
  experienceId: string;
}

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
