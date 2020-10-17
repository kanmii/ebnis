/* istanbul ignore file */
import gql from "graphql-tag";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  UnsyncedLedger,
  UnsyncedModifiedExperience,
} from "../utils/unsynced-ledger.types";

const UNSYNCED_LEDGER_QUERY = gql`
  query {
    unsyncedLedger @client
  }
`;

export function writeUnsyncedExperience(
  id: string,
  data: UnsyncedModifiedExperience,
) {
  const unsyncedLedger = { ...getUnsyncedLedger() };

  if (Object.keys(data).length) {
    unsyncedLedger[id] = data;
  } else {
    delete unsyncedLedger[id];
  }

  writeUnsyncedLedger(unsyncedLedger);
}

export function getUnsyncedExperience(
  id: string,
): UnsyncedModifiedExperience | null {
  const unsyncedLedger = getUnsyncedLedger();
  return unsyncedLedger[id] || null;
}

export function removeUnsyncedExperiences(ids: string[]) {
  const unsyncedLedger = { ...getUnsyncedLedger() };

  ids.forEach((id) => {
    delete unsyncedLedger[id];
  });

  writeUnsyncedLedger(unsyncedLedger);
}

function writeUnsyncedLedger(unsyncedLedger: UnsyncedLedger) {
  const { cache } = window.____ebnis;
  cache.writeQuery({
    query: UNSYNCED_LEDGER_QUERY,
    data: {
      unsyncedLedger,
    },
  });
}

export function getUnsyncedLedger() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<UnsyncedLedgerQueryResult>({
    query: UNSYNCED_LEDGER_QUERY,
  });

  const unsyncedLedger = data && data.unsyncedLedger;

  return unsyncedLedger || {};
}

interface UnsyncedLedgerQueryResult {
  unsyncedLedger: UnsyncedLedger;
}

export const unsyncedLedgerPolicy: FieldPolicy<UnsyncedLedger> = {
  read(existing) {
    return existing || {};
  },

  merge(existing, incoming) {
    return incoming;
  },
};
