/* istanbul ignore file */
import { makeVar } from "@apollo/client";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  SyncError,
  SyncErrors,
  SyncErrorsQueryResult,
  SyncFlag,
} from "@eb/shared/src/utils/types";
import gql from "graphql-tag";

////////////////////////// START SYNC FLAG ////////////////////////////

export function getSyncFlag() {
  return syncFlagVar();
}

export function putSyncFlag(payload: SyncFlag) {
  const flag = { ...syncFlagVar() };

  syncFlagVar({
    ...flag,
    ...payload,
  });
}

export function putOfflineExperienceIdInSyncFlag(arg: [string, string]) {
  const data = { ...getSyncFlag() };
  const [onlineId, offlineId] = arg;

  data.onlineExperienceIdToOfflineId = {
    [onlineId]: offlineId,
  };

  syncFlagVar(data);
}

export function getAndRemoveOfflineExperienceIdFromSyncFlag(
  onlineExperienceId: string,
) {
  const data = { ...getSyncFlag() };
  const { onlineExperienceIdToOfflineId } = data;

  if (onlineExperienceIdToOfflineId) {
    const offlineId = onlineExperienceIdToOfflineId[onlineExperienceId];

    if (offlineId) {
      data.onlineExperienceIdToOfflineId = undefined;
      putSyncFlag(data);
      return offlineId;
    }
  }

  return null;
}

export const syncFlagVar = makeVar<SyncFlag>({
  canSync: true,
  isSyncing: false,
});

////////////////////////// END START SYNC FLAG ////////////////////////////

////////////////////////// START SYNC ERRORS ////////////////////////////

const SYNC_ERRORS_QUERY = gql`
  query {
    syncErrors @client
  }
`;

export function getSyncErrors() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<SyncErrorsQueryResult>({
    query: SYNC_ERRORS_QUERY,
  });

  return data ? data.syncErrors : ({} as SyncErrors);
}

export function writeSyncErrors(ledger: SyncErrors) {
  const { cache } = window.____ebnis;

  cache.writeQuery({
    query: SYNC_ERRORS_QUERY,
    data: {
      syncErrors: ledger,
    },
  });
}

/**
 * When called with 2 arguments === put
 * when called with 1 argument == remove
 */
export function putOrRemoveSyncError(id: string, data?: SyncError) {
  const ledger = { ...getSyncErrors() };

  if (data) {
    ledger[id] = data;
  } else {
    delete ledger[id];
  }

  writeSyncErrors(ledger);
}

export function getSyncError(id: string): SyncError | null {
  const ledger = getSyncErrors();
  return ledger[id] || null;
}

export const syncErrorsPolicy: FieldPolicy<SyncErrors> = {
  read(existing) {
    return existing || {};
  },

  merge(_existing, incoming) {
    return incoming;
  },
};

////////////////////////// END START SYNC ERRORS ////////////////////////////
