export interface SyncFlagQueryResult {
  syncFlag: SyncFlag;
}

export type SyncFlag = Readonly<{
  canSync: boolean;
  isSyncing: boolean;
}>;
