/* istanbul ignore file */
import gql from "graphql-tag";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  SyncFlag,
  SyncFlagQueryResult,
  SyncError,
  SyncErrors,
  SyncErrorsQueryResult,
} from "../utils/sync-to-server.types";

////////////////////////// START SYNC FLAG ////////////////////////////

const SYNC_FLAG = gql`
  query {
    syncFlag @client
  }
`;

export function getSyncFlag() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<SyncFlagQueryResult>({
    query: SYNC_FLAG,
  });

  return (data && data.syncFlag) || ({} as SyncFlag);
}

export function putSyncFlag(payload: { [key in keyof SyncFlag]: boolean }) {
  const { cache } = window.____ebnis;
  cache.writeQuery({
    query: SYNC_FLAG,
    data: {
      syncFlag: payload,
    },
  });
}

export const syncFlagPolicy: FieldPolicy<SyncFlag> = {
  read(existing) {
    return (
      existing || {
        canSync: true,
        isSyncing: false,
      }
    );
  },

  merge(existing, incoming) {
    return { ...existing, ...incoming };
  },
};

////////////////////////// END START SYNC FLAG ////////////////////////////

////////////////////////// START SYNC ERRORS ////////////////////////////

const SYNC_ERRORS_QUERY = gql`
  query {
    syncErrors @client
  }
`;

function getSyncErrors() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<SyncErrorsQueryResult>({
    query: SYNC_ERRORS_QUERY,
  });

  return data ? data.syncErrors : {};
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

  merge(existing, incoming) {
    return incoming;
  },
};

////////////////////////// END START SYNC ERRORS ////////////////////////////
