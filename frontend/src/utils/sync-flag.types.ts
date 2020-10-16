import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";

export interface SyncFlagQueryResult {
  syncFlag: SyncFlag;
}

export type SyncFlag = Readonly<{
  canSync: boolean;
  isSyncing: boolean;
}>;

export type OfflineIdToEntryMap = { [clientId: string]: EntryFragment };

export type OfflineIdToOnlineExperienceMap = {
  [offlineId: string]: ExperienceFragment;
};

export type OnSyncedData = {
  offlineIdToEntryMap?: OfflineIdToEntryMap;
  offlineIdToOnlineExperienceMap?: OfflineIdToOnlineExperienceMap;
};
