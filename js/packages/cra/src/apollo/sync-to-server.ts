import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences,
} from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import { DataDefinitionFragment } from "@eb/cm/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import {
  CreateDataDefinition,
  CreateDataObject,
  CreateEntryInput,
  CreateExperienceInput,
  UpdateDefinitionInput,
  UpdateEntryInput,
  UpdateExperienceInput,
  UpdateExperienceOwnFieldsInput,
} from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  SyncToServer,
  SyncToServerVariables,
} from "@eb/cm/src/graphql/apollo-types/SyncToServer";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
  UpdateExperiencesOnline_updateExperiences,
} from "@eb/cm/src/graphql/apollo-types/UpdateExperiencesOnline";
import {
  CREATE_EXPERIENCES_MUTATION,
  SYNC_TO_SERVER_MUTATION,
  UPDATE_EXPERIENCES_ONLINE_MUTATION,
} from "@eb/cm/src/graphql/experience.gql";
import {
  BroadcastMessageType,
  OfflineIdToOnlineExperienceMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnlineExperienceUpdatedMap,
  SyncCreateReturnVal,
  SyncErrors,
  SyncFlag,
  UpdateSyncReturnVal,
} from "@eb/cm/src/utils/types";
import { broadcastMessage } from "../utils/broadcast-channel-manager";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import { createExperiencesManualUpdate } from "./create-experiences-manual-update";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceCompleteFragment,
} from "./get-detailed-experience-query";
import {
  getSyncErrors,
  getSyncFlag,
  putSyncFlag,
  writeSyncErrors,
} from "./sync-to-server-cache";
import { getUnsyncedLedger } from "./unsynced-ledger";
import { updateExperiencesManualCacheUpdate } from "./update-experiences-manual-cache-update";

const WAIT_INTERVAL = 1 * 1000 * 60; // 1 minute

export async function syncToServer() {
  const result = getSyncFlag();
  let canSync = result.canSync;
  const isSyncing = result.isSyncing;

  if (!canSync) {
    putSyncFlag({
      isSyncing: false,
    } as SyncFlag);

    setTimeout(() => {
      syncToServer();
    }, WAIT_INTERVAL);

    return;
  }

  if (isSyncing) {
    return;
  }

  putSyncFlag({ isSyncing: true } as SyncFlag);

  const unsyncedLedger = getUnsyncedLedger();

  if (!Object.keys(unsyncedLedger).length) {
    putSyncFlag({ isSyncing: false } as SyncFlag);
    return;
  }

  const oldSyncErrors = getSyncErrors();

  const [updateInput, createInput] = Object.entries(unsyncedLedger).reduce(
    (acc, [experienceId, ledger]) => {
      if (oldSyncErrors[experienceId]) {
        return acc;
      }

      const [updateInputs, createInputs] = acc;

      const experience = readExperienceCompleteFragment(
        experienceId,
      ) as ExperienceCompleteFragment;

      if (isOfflineId(experienceId)) {
        const input = experienceToCreateInput(experience);
        createInputs.push(input);
      } else {
        const input = { experienceId } as UpdateExperienceInput;
        updateInputs.push(input);

        const {
          ownFields,
          definitions,
          modifiedEntries = {},
          deletedEntries,
        } = ledger;

        if (ownFields) {
          const ownFieldsInput = {} as UpdateExperienceOwnFieldsInput;
          input.ownFields = ownFieldsInput;

          Object.keys(ownFields).forEach((k) => {
            const key = k as "description" | "title";
            ownFieldsInput[key] = experience[key];
          });
        }

        if (definitions) {
          const idToDefinitionMap = experience.dataDefinitions.reduce(
            (acc, d) => {
              const definition = d as DataDefinitionFragment;
              acc[definition.id] = definition;
              return acc;
            },
            {} as { [definitionId: string]: DataDefinitionFragment },
          );

          input.updateDefinitions = Object.entries(definitions).map(
            ([definitionId, { name, type }]) => {
              const definition = idToDefinitionMap[definitionId];
              const input = { id: definitionId } as UpdateDefinitionInput;

              if (name) {
                input.name = definition.name;
              }

              if (type) {
                input.type = definition.type;
              }

              return input;
            },
          );
        }

        const newEntriesInput: CreateEntryInput[] = [];
        const updateEntriesInput: UpdateEntryInput[] = [];

        const edges = getCachedEntriesDetailViewSuccess(experienceId)
          .edges as EntryConnectionFragment_edges[];

        edges.forEach((edge) => {
          const entry = edge.node as EntryFragment;
          const { id } = entry;

          if (isOfflineId(id)) {
            newEntriesInput.push(entryToCreateInput(entry));
          } else {
            const modified = modifiedEntries[id];

            if (modified) {
              const input = {
                entryId: id,
              } as UpdateEntryInput;

              updateEntriesInput.push(input);

              const idToDataObjectMap = entry.dataObjects.reduce((acc, d) => {
                const dataObject = d as DataObjectFragment;
                acc[dataObject.id] = dataObject;
                return acc;
              }, {} as { [key: string]: DataObjectFragment });

              input.dataObjects = Object.keys(modified).map((dataObjectId) => {
                const x = idToDataObjectMap[dataObjectId];
                return {
                  id: dataObjectId,
                  data: x.data,
                };
              });
            }
          }

          return acc;
        });

        if (newEntriesInput.length) {
          input.addEntries = newEntriesInput;
        }

        if (updateEntriesInput.length) {
          input.updateEntries = updateEntriesInput;
        }

        if (deletedEntries) {
          input.deleteEntries = deletedEntries;
        }
      }

      return acc;
    },
    [[], []] as Variables,
  );

  // let's check again to ensure someone has not set
  // syncFlag since last time
  canSync = getSyncFlag().canSync;

  if (!canSync) {
    putSyncFlag({
      isSyncing: false,
    } as SyncFlag);

    setTimeout(() => {
      syncToServer();
    }, WAIT_INTERVAL);

    return;
  }

  const { client, cache, persistor } = window.____ebnis;

  let updateResult = (undefined as unknown) as UpdateExperiencesOnline_updateExperiences;
  let createResult = (undefined as unknown) as CreateExperiences_createExperiences[];

  try {
    if (updateInput.length && createInput.length) {
      const result = await client.mutate<SyncToServer, SyncToServerVariables>({
        mutation: SYNC_TO_SERVER_MUTATION,
        variables: {
          updateInput,
          createInput,
        },
      });

      const x = result && result.data && result.data;
      if (x) {
        const { createExperiences, updateExperiences } = x;

        if (updateExperiences) {
          updateResult = updateExperiences;
        }

        if (createExperiences) {
          createResult = createExperiences;
        }
      }
    } else if (updateInput.length) {
      const result = await client.mutate<
        UpdateExperiencesOnline,
        UpdateExperiencesOnlineVariables
      >({
        mutation: UPDATE_EXPERIENCES_ONLINE_MUTATION,
        variables: {
          input: updateInput,
        },
      });

      updateResult = (result &&
        result.data &&
        result.data
          .updateExperiences) as UpdateExperiencesOnline_updateExperiences;
    } else if (createInput.length) {
      const result = await client.mutate<
        CreateExperiences,
        CreateExperiencesVariables
      >({
        mutation: CREATE_EXPERIENCES_MUTATION,
        variables: {
          input: createInput,
        },
      });

      createResult = (result &&
        result.data &&
        result.data.createExperiences) as CreateExperiences_createExperiences[];
    }
  } catch (error) {
    //
  }

  let onlineExperienceIdToOfflineEntriesMap:
    | OnlineExperienceIdToOfflineEntriesMap
    | undefined = undefined;

  let syncErrors: SyncErrors | undefined = undefined;

  let offlineIdToOnlineExperienceMap:
    | OfflineIdToOnlineExperienceMap
    | undefined = undefined;

  let onlineExperienceUpdatedMap:
    | OnlineExperienceUpdatedMap
    | undefined = undefined;

  if (updateResult) {
    const result = updateExperiencesManualCacheUpdate(cache, {
      data: {
        updateExperiences: updateResult,
      },
    }) as UpdateSyncReturnVal;

    if (result) {
      onlineExperienceIdToOfflineEntriesMap = result[0];
      syncErrors = result[1];
      onlineExperienceUpdatedMap = result[2];
    }
  }

  if (createResult) {
    const result = createExperiencesManualUpdate(cache, {
      data: {
        createExperiences: createResult,
      },
    }) as SyncCreateReturnVal;

    if (result) {
      syncErrors = {
        ...syncErrors,
        ...result[0],
      };

      offlineIdToOnlineExperienceMap = result[1];
    }
  }

  putSyncFlag({ isSyncing: false } as SyncFlag);

  if (syncErrors) {
    writeSyncErrors(syncErrors);
  }

  await persistor.persist();

  if (updateResult || createResult) {
    broadcastMessage(
      {
        type: BroadcastMessageType.syncDone,
        payload: {
          offlineIdToOnlineExperienceMap,
          syncErrors,
          onlineExperienceIdToOfflineEntriesMap,
          onlineExperienceUpdatedMap,
        },
      },
      {
        plusSelf: true,
      },
    );
  }
}

function experienceToCreateInput(experience: ExperienceCompleteFragment) {
  const { id: experienceId, description, title, dataDefinitions } = experience;

  const createExperienceInput = {
    clientId: experienceId,
    description: description,
    title: title,
    insertedAt: experience.insertedAt,
    updatedAt: experience.updatedAt,
    dataDefinitions: (dataDefinitions as DataDefinitionFragment[]).map((d) => {
      const input = {
        clientId: d.id,
        name: d.name,
        type: d.type,
      } as CreateDataDefinition;
      return input;
    }),
  } as CreateExperienceInput;

  const createEntriesInput = entriesConnectionToCreateInput(
    getCachedEntriesDetailViewSuccess(experienceId),
  );

  // istanbul ignore else:
  if (createEntriesInput.length) {
    createExperienceInput.entries = createEntriesInput;
  }

  return createExperienceInput;
}

function entryToCreateInput(entry: EntryFragment) {
  return {
    clientId: entry.id,
    experienceId: entry.experienceId,
    insertedAt: entry.insertedAt,
    updatedAt: entry.updatedAt,
    dataObjects: (entry.dataObjects as DataObjectFragment[]).map((d) => {
      const input = {
        clientId: d.id,
        data: d.data,
        definitionId: d.definitionId,
        insertedAt: d.insertedAt,
        updatedAt: d.updatedAt,
      } as CreateDataObject;
      return input;
    }),
  } as CreateEntryInput;
}

function entriesConnectionToCreateInput(entries: EntryConnectionFragment) {
  return ((entries.edges ||
    // istanbul ignore next:
    []) as EntryConnectionFragment_edges[]).map((edge) => {
    return entryToCreateInput(edge.node as EntryFragment);
  });
}

type Variables = [UpdateExperienceInput[], CreateExperienceInput[]];
