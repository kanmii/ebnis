import {
  isOfflineId,
  makeOfflineEntryIdFromExperience,
  makeOfflineDataObjectIdFromEntry,
} from "../../utils/offlines";
import { CreateDataObject } from "../../graphql/apollo-types/globalTypes";
import {
  upsertNewEntry,
  UpsertNewEntryReturnVal,
} from "./upsert-entry.injectables";
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

export interface CreateOfflineEntryMutationValid {
  id: string;
  entry: EntryFragment;
  experience: ExperienceFragment;
  __typename: "Entry";
}

export function createOfflineEntryMutation(
  variables: CreateOfflineEntryMutationVariables,
) {
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
