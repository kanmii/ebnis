/* istanbul ignore file */
import gql from "graphql-tag";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  UnsyncedLedger,
  UnsyncedLedgerItem,
  UnsyncableEntriesErrors,
  UnsyncedModifiedExperience,
  RemoveUnsyncableEntriesErrors,
} from "../utils/unsynced-ledger.types";

const UNSYNCED_LEDGER_QUERY = gql`
  query {
    unsyncedLedger @client
  }
`;

export function writeUnsyncedExperience(id: string, data: UnsyncedLedgerItem) {
  const unsyncedLedger = { ...getUnsyncedLedger() };

  if (data === true || Object.keys(data).length) {
    unsyncedLedger[id] = data;
  } else {
    delete unsyncedLedger[id];
  }

  writeUnsyncedLedger(unsyncedLedger);
}

export function getUnsyncedExperience(id: string): UnsyncedLedgerItem | null {
  const unsyncedLedger = getUnsyncedLedger();
  return unsyncedLedger[id] || null;
}

export function removeUnsyncedExperience(id: string) {
  const unsyncedLedger = { ...getUnsyncedLedger() };
  delete unsyncedLedger[id];
  writeUnsyncedLedger(unsyncedLedger);
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
      // unsyncedLedger: JSON.stringify(unsyncedLedger),
      unsyncedLedger,
    },
  });
}

function getUnsyncedLedger() {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<UnsyncedLedgerQueryResult>({
    query: UNSYNCED_LEDGER_QUERY,
  });

  const unsyncedLedger = data && data.unsyncedLedger;

  // return unsyncedLedger ? JSON.parse(unsyncedLedger) : {};
  return unsyncedLedger || {};
}

export function putAndRemoveUnSyncableEntriesErrorsLedger(
  experienceId: string,
  newLedgerItems: UnsyncableEntriesErrors | RemoveUnsyncableEntriesErrors = {},
) {
  const unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    {}) as UnsyncedModifiedExperience;

  let entriesErrors = (unsyncedExperience.entriesErrors ||
    {}) as UnsyncableEntriesErrors;

  entriesErrors = { ...entriesErrors };

  Object.entries(newLedgerItems).forEach(([k, v]) => {
    if (v === null) {
      delete entriesErrors[k];
    } else {
      entriesErrors[k] = v;
    }
  });

  if (Object.keys(entriesErrors).length) {
    unsyncedExperience.entriesErrors = entriesErrors;
    unsyncedExperience.newEntries = true;
  } else {
    delete unsyncedExperience.entriesErrors;
  }

  writeUnsyncedExperience(experienceId, unsyncedExperience);
}

export function getUnSyncEntriesErrorsLedger(
  experienceId: string,
): UnsyncableEntriesErrors | null {
  const unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    {}) as UnsyncedModifiedExperience;

  return unsyncedExperience.entriesErrors || null;
}

interface UnsyncedLedgerQueryResult {
  unsyncedLedger: UnsyncedLedger;
}

export const unsyncedLedgerPolicy: FieldPolicy<UnsyncedLedger> = {
  read(existing) {
    return existing || {};
  },
};
