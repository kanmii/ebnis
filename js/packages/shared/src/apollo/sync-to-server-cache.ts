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

// We will keep a memo of an online experience ID and the offline ID from which
// it is synced. The goal is to use the online ID to retrieve the offline ID
// when user visits the online experience page - we can then purge the offline
// experience from the cache.

export function mapOnlineExperienceIdToOfflineIdInSyncFlag(
  arg: [string, string],
) {
  const data = { ...getSyncFlag() };
  const [onlineId, offlineId] = arg;

  data.onlineExperienceIdToOfflineId = {
    [onlineId]: offlineId,
  };

  syncFlagVar(data);
}

export type MapOnlineExperienceIdToOfflineIdInSyncFlagInjectType = {
  mapOnlineExperienceIdToOfflineIdInSyncFlagInject: typeof mapOnlineExperienceIdToOfflineIdInSyncFlag;
};

// User is viewing an online experience page. We check if there an offline ID
// associated with this online experience. If there is one, we return the
// associated offline ID to caller (so caller can purge the offline experience
// from the cache), we finally remove the ledger entry for the online/offline
// ID so that next time user visits the page, there will be nothing to do here

export function getAndRemoveOfflineExperienceIdFromSyncFlag(
  onlineExperienceId: string,
) {
  const data = { ...getSyncFlag() };
  const { onlineExperienceIdToOfflineId } = data;

  if (onlineExperienceIdToOfflineId) {
    const offlineId = onlineExperienceIdToOfflineId[onlineExperienceId];

    if (offlineId) {
      // Stop tracking the online experience ID to offline ID map as it has
      // been synced

      data.onlineExperienceIdToOfflineId = undefined;
      putSyncFlag(data);

      // We return the ID to caller because caller will need to clean up the
      // offline experience associated with this ID from the cache

      return offlineId;
    }
  }

  return null;
}

export type GetAndRemoveOfflineExperienceIdFromSyncFlagInjectType = {
  getAndRemoveOfflineExperienceIdFromSyncFlagInject: typeof getAndRemoveOfflineExperienceIdFromSyncFlag;
};

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

export type GetSyncErrorsFn = {
  getSyncErrorsFn: typeof getSyncErrors;
};

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

export type GetSyncErrorInjectType = {
  getSyncErrorInject: typeof getSyncError;
};

export const syncErrorsPolicy: FieldPolicy<SyncErrors> = {
  read(existing) {
    return existing || {};
  },

  merge(_existing, incoming) {
    return incoming;
  },
};

////////////////////////// END START SYNC ERRORS ////////////////////////////
