import gql from "graphql-tag";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";

const SYNCING_EXPERIENCES_LEDGER_QUERY = gql`
  query {
    syncingExperiencesLedger @client
  }
`;

function getSyncingExperiencesLedger() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<SyncingExperiencesLedgerQueryResult>({
    query: SYNCING_EXPERIENCES_LEDGER_QUERY,
  });

  return data ? data.syncingExperiencesLedger : {};
}

function writeSyncingExperiencesLedger(ledger: SyncingExperiencesLedger) {
  const { cache } = window.____ebnis;

  cache.writeQuery({
    query: SYNCING_EXPERIENCES_LEDGER_QUERY,
    data: {
      syncingExperiencesLedger: ledger,
    },
  });
}

/**
 * When called with 2 arguments === put
 * when called with 1 argument == remove
 */
export function putOrRemoveSyncingExperience(
  id: string,
  data?: SyncingExperience,
) {
  const ledger = { ...getSyncingExperiencesLedger() };

  if (data) {
    ledger[id] = data;
  } else {
    delete ledger[id];
  }

  writeSyncingExperiencesLedger(ledger);
}

export function getSyncingExperience(id: string): SyncingExperience | null {
  const ledger = getSyncingExperiencesLedger();
  return ledger[id] || null;
}

export const syncingExperiencesLedgerPolicy: FieldPolicy<SyncingExperiencesLedger> = {
  read(existing) {
    return existing || {};
  },

  merge(existing, incoming) {
    return incoming;
  },
};

interface SyncingExperiencesLedgerQueryResult {
  syncingExperiencesLedger: SyncingExperiencesLedger;
}

interface SyncingExperiencesLedger {
  [experienceId: string]: SyncingExperience;
}

export type SyncingExperience = {
  offlineExperienceId: string;
  newEntryClientId: string;
  entriesErrors?: CreateEntryErrorFragment[];
};
