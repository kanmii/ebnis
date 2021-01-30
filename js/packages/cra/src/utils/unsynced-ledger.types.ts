export interface UnsyncedLedger {
  [experienceId: string]: UnsyncedModifiedExperience;
}

export interface UnsyncedModifiedDefinition {
  name?: true;
  type?: true;
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
  deletedEntries?: string[];
  isOffline?: true;
}
