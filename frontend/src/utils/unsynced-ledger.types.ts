export interface UnsyncedLedger {
  [experienceId: string]: UnsyncedLedgerItem;
}

export type UnsyncedLedgerItem =
  | IsNewOfflineExperience
  | UnsyncedModifiedExperience;

export interface UnsyncedModifiedDefinition {
  name?: true;
  // type?: true;
}

export interface UnsyncedModifiedExperience {
  ownFields?: {
    title?: true;
    description?: true;
  };
  definitions?: {
    [definitionId: string]: UnsyncedModifiedDefinition;
  };
  newEntries?: true;
  modifiedEntries?: {
    [entryId: string]: {
      [dataObjectId: string]: true;
    };
  };
  entriesErrors?: UnsyncableEntriesErrors;
}

export interface UnsyncableEntriesErrors {
  [entryClientId: string]: UnsyncableEntryError;
}

export interface RemoveUnsyncableEntriesErrors {
  [entryClientId: string]: null;
}

// [index/label, [errorKey, errorValue][]][]
export type UnsyncableEntryError = [string | number, [string, string][]][];

type IsNewOfflineExperience = true;
