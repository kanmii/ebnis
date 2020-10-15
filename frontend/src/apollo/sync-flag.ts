/* istanbul ignore file */
import gql from "graphql-tag";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import { SyncFlag, SyncFlagQueryResult } from "../utils/sync-flag.types";

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
