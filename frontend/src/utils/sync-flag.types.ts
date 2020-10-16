import { EntryFragment } from "../graphql/apollo-types/EntryFragment";

export interface SyncFlagQueryResult {
  syncFlag: SyncFlag;
}

export type SyncFlag = Readonly<{
  canSync: boolean;
  isSyncing: boolean;
}>;

export type OfflineIdToEntryMap = { [clientId: string]: EntryFragment };

// [OfflineId, onlineId]
export type OfflineExperienceIdToOnlineExperienceIdList = [string, string][];

export type OnSyncedData = {
  offlineIdToEntryMap: OfflineIdToEntryMap;
  offlineExperienceIdToOnlineExperienceIdList: OfflineExperienceIdToOnlineExperienceIdList;
};
