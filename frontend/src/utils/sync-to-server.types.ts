import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import { DefinitionErrorFragment } from "../graphql/apollo-types/DefinitionErrorFragment";
import { UpdateExperienceOwnFieldsErrorFragment } from "../graphql/apollo-types/UpdateExperienceOwnFieldsErrorFragment";
import { DataObjectErrorFragment } from "../graphql/apollo-types/DataObjectErrorFragment";
import { CreateExperienceErrorsFragment_errors } from "../graphql/apollo-types/CreateExperienceErrorsFragment";

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

export type OnlineExperienceUpdatedMap = {
  [onlineExperienceId: string]: true;
};

export type OnSyncedData = {
  onlineExperienceIdToOfflineEntriesMap?: OnlineExperienceIdToOfflineEntriesMap;
  offlineIdToOnlineExperienceMap?: OfflineIdToOnlineExperienceMap;
  syncErrors?: SyncErrors;
  onlineExperienceUpdatedMap?: OnlineExperienceUpdatedMap;
};

export type SyncErrors = {
  // experienceId will be offline experience id if we are unable to create
  // offline experience online and will be online ID if offline experience
  // successfully created online or online experience updates synced
  [experienceId: string]: SyncError;
};

export type SyncError = {
  // Only offline experience we are unable to create online
  createExperience?: CreateExperienceErrorsFragment_errors;

  createEntries?: OfflineIdToCreateEntrySyncErrorMap;

  updateEntries?: IdToUpdateEntrySyncErrorMap;

  ownFields?: UpdateExperienceOwnFieldsErrorFragment;

  definitions?: IdToDefinitionUpdateSyncErrorMap;
};

// string represents entry error
export type UpdateEntrySyncErrors = string | IdToUpdateDataObjectSyncErrorMap;

export type IdToUpdateEntrySyncErrorMap = {
  [entryId: string]: UpdateEntrySyncErrors;
};

export type IdToUpdateDataObjectSyncErrorMap = {
  [dataObjectId: string]: DataObjectErrorFragment;
};

export type OfflineIdToCreateEntrySyncErrorMap = {
  [offlineEntryId: string]: CreateEntryErrorFragment;
};

export type IdToDefinitionUpdateSyncErrorMap = {
  [definitionId: string]: DefinitionErrorFragment;
};

export type UpdateSyncReturnVal = [
  OnlineExperienceIdToOfflineEntriesMap,
  SyncErrors,
  OnlineExperienceUpdatedMap,
];

export type SyncCreateReturnVal = [SyncErrors, OfflineIdToOnlineExperienceMap];

export interface SyncErrorsQueryResult {
  syncErrors: SyncErrors;
}
