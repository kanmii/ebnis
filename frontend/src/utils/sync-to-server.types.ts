import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  UpdateExperienceSomeSuccessFragment_experience_updatedDefinitions_DefinitionErrors_errors,
  UpdateExperienceSomeSuccessFragment_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors,
  UpdateExperienceSomeSuccessFragment_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors,
} from "../graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import { CreateExperiences_createExperiences_CreateExperienceErrors_errors } from "../graphql/apollo-types/CreateExperiences";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";

export interface SyncFlagQueryResult {
  syncFlag: SyncFlag;
}

export type SyncFlag = Readonly<{
  canSync: boolean;
  isSyncing: boolean;
  onlineExperienceIdToOfflineId?: {
    [key: string]: string;
  };
}>;

export type OnlineExperienceIdToOfflineEntriesMap = {
  [onlineExperienceId: string]: OfflineIdToOnlineEntryMap;
};

export type OfflineIdToOnlineEntryMap = {
  [entryClientId: string]: EntryFragment;
};

export type OfflineIdToOnlineExperienceMap = {
  [offlineExperienceId: string]: ExperienceFragment;
};

export type OnSyncedData = {
  onlineExperienceIdToOfflineEntriesMap?: OnlineExperienceIdToOfflineEntriesMap;
  offlineIdToOnlineExperienceMap?: OfflineIdToOnlineExperienceMap;
  syncErrors?: SyncErrors;
};

export type SyncErrors = {
  // experienceId will be offline experience id if we are unable to create
  // offline experience online and will be online ID if offline experience
  // successfully created online or online experience updates synced
  [experienceId: string]: SyncError;
};

export type SyncError = {
  // Only offline experience we are unable to create online
  createExperience?: CreateExperiences_createExperiences_CreateExperienceErrors_errors;

  createEntries?: OfflineIdToCreateEntrySyncErrorMap;

  updateEntries?: IdToUpdateEntrySyncErrorMap;

  ownFields?: UpdateExperienceSomeSuccessFragment_experience_ownFields_UpdateExperienceOwnFieldsErrors_errors;

  definitions?: IdToDefinitionUpdateSyncErrorMap;
};

export type IdToUpdateEntrySyncErrorMap = {
  [entryId: string]: // string represents entry error
  string | IdToUpdateDataObjectSyncErrorMap;
};

export type IdToUpdateDataObjectSyncErrorMap = {
  [
    dataObjectId: string
  ]: UpdateExperienceSomeSuccessFragment_entries_updatedEntries_UpdateEntrySomeSuccess_entry_dataObjects_DataObjectErrors_errors;
};

export type OfflineIdToCreateEntrySyncErrorMap = {
  [offlineEntryId: string]: CreateEntryErrorFragment;
};

export type IdToDefinitionUpdateSyncErrorMap = {
  [
    definitionId: string
  ]: UpdateExperienceSomeSuccessFragment_experience_updatedDefinitions_DefinitionErrors_errors;
};

export type UpdateSyncReturnVal = [
  OnlineExperienceIdToOfflineEntriesMap,
  SyncErrors,
  OfflineIdToOnlineExperienceMap,
];

export type SyncCreateReturnVal = [SyncErrors, OfflineIdToOnlineExperienceMap];

export interface SyncErrorsQueryResult {
  syncErrors: SyncErrors;
}
