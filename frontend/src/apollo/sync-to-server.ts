import { getUnsyncedLedger } from "./unsynced-ledger";
import { getSyncFlag, putSyncFlag } from "./sync-flag";
import { SyncFlag } from "../utils/sync-flag.types";
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
} from "../components/NewEntry/new-entry.helpers";
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
import { writeUpdatedExperienceToCache } from "./write-updated-experiences-to-cache";
import { windowChangeUrl, ChangeUrlType } from "../utils/global-window";
import { makeDetailedExperienceRoute } from "../utils/urls";

const WAIT_INTERVAL = 5 * 1000 * 60; // 5 minutes

export async function syncToServer(location: Location) {
  let canSync = getSyncFlag().canSync;

  if (!canSync) {
    setTimeout(() => {
      syncToServer(location);
    }, WAIT_INTERVAL);

    putSyncFlag({ isSyncing: false } as SyncFlag);

    return;
  }

  putSyncFlag({ isSyncing: true } as SyncFlag);

  const unsyncedLedger = getUnsyncedLedger();

  if (!Object.keys(unsyncedLedger).length) {
    putSyncFlag({ isSyncing: false } as SyncFlag);
    return;
  }

  const [updateInput, createInput] = Object.entries(unsyncedLedger).reduce(
    (acc, [experienceId, ledger]) => {
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

  canSync = getSyncFlag().canSync;

  if (!canSync) {
    setTimeout(() => {
      syncToServer(location);
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
    } else {
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

  await persistor.persist();

  const { pathname } = location;

  if (updateResult) {
    writeUpdatedExperienceToCache(cache, {
      data: {
        updateExperiences: updateResult,
      },
    });
  }

  if (createResult) {
    const map = createExperiencesManualUpdate(cache, {
      data: {
        createExperiences: createResult,
      },
    });

    if (map) {
      map.forEach(([offlineId, onlineId]) => {
        if (pathname.includes(offlineId)) {
          putSyncFlag({ isSyncing: false } as SyncFlag);

          windowChangeUrl(
            makeDetailedExperienceRoute(onlineId),
            ChangeUrlType.replace,
          );

          return;
        }
      });
    }
  }

  putSyncFlag({ isSyncing: false } as SyncFlag);
  windowChangeUrl(pathname, ChangeUrlType.reload);
}

type Variables = [UpdateExperienceInput[], CreateExperienceInput[]];
