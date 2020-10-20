import { getUnsyncedLedger } from "./unsynced-ledger";
import {
  getSyncFlag,
  putSyncFlag,
  writeSyncErrors,
  getSyncErrors,
} from "./sync-to-server-cache";
import {
  SyncFlag,
  OfflineIdToOnlineExperienceMap,
  SyncErrors,
  UpdateSyncReturnVal,
  OnlineExperienceIdToOfflineEntriesMap,
  SyncCreateReturnVal,
  OnlineExperienceUpdatedMap,
} from "../utils/sync-to-server.types";
import {
  UpdateExperienceInput,
  CreateExperienceInput,
  UpdateDefinitionInput,
  CreateEntryInput,
  UpdateEntryInput,
} from "../graphql/apollo-types/globalTypes";
import { isOfflineId } from "../utils/offlines";
import {
  readExperienceFragment,
  getEntriesQuerySuccess,
} from "./get-detailed-experience-query";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  experienceToCreateInput,
  entryToCreateInput,
} from "../components/UpsertEntry/upsert-entry.helpers";
import { DataDefinitionFragment } from "../graphql/apollo-types/DataDefinitionFragment";
import { EntryConnectionFragment_edges } from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";
import {
  SyncToServer,
  SyncToServerVariables,
} from "../graphql/apollo-types/SyncToServer";
import {
  SYNC_TO_SERVER_MUTATION,
  UPDATE_EXPERIENCES_ONLINE_MUTATION,
  CREATE_EXPERIENCES_MUTATION,
} from "../graphql/experience.gql";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
  UpdateExperiencesOnline_updateExperiences,
} from "../graphql/apollo-types/UpdateExperiencesOnline";
import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences,
} from "../graphql/apollo-types/CreateExperiences";
import { createExperiencesManualUpdate } from "./create-experiences-manual-update";
import { updateExperiencesManualCacheUpdate } from "./update-experiences-manual-cache-update";
import { broadcastMessage } from "../utils/observable-manager";
import { BroadcastMessageType } from "../utils/types";

const WAIT_INTERVAL = 1 * 1000 * 60; // 1 minute

export async function syncToServer() {
  let { canSync, isSyncing } = getSyncFlag();

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

  let oldSyncErrors = getSyncErrors();

  const [updateInput, createInput] = Object.entries(unsyncedLedger).reduce(
    (acc, [experienceId, ledger]) => {
      if (oldSyncErrors[experienceId]) {
        return acc;
      }

      const [updateInputs, createInputs] = acc;

      const experience = readExperienceFragment(
        experienceId,
      ) as ExperienceFragment;

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
          const ownFieldsInput = {};
          input.ownFields = ownFieldsInput;

          Object.keys(ownFields).forEach((key) => {
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

        const edges = getEntriesQuerySuccess(experienceId)
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

          acc[entry.id] = entry;
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
  } catch (error) {}

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

type Variables = [UpdateExperienceInput[], CreateExperienceInput[]];
