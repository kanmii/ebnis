/* eslint-disable react-hooks/rules-of-hooks*/
import {
  CreateDataDefinition,
  UpdateExperienceInput,
  UpdateDefinitionInput,
  DataTypes,
} from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { makeOfflineId, isOfflineId } from "../../utils/offlines";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY } from "@eb/cm/src/graphql/experience.gql";
import {
  upsertExperiencesInGetExperiencesMiniQuery,
  purgeEntry,
  floatExperienceToTheTopInGetExperiencesMiniQuery,
} from "../../apollo/update-get-experiences-list-view-query";
import {
  writeUnsyncedExperience,
  getUnsyncedExperience,
} from "../../apollo/unsynced-ledger";
import { CreateExperiencesVariables } from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import { v4 } from "uuid";
import { getCachedExperiencesConnectionListView } from "../../apollo/cached-experiences-list-view";
import {
  GetExperiencesConnectionListView_getExperiences_edges,
  GetExperiencesConnectionListView_getExperiences_edges_node,
} from "@eb/cm/src/graphql/apollo-types/GetExperiencesConnectionListView";
import {
  GetExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewVariables,
} from "@eb/cm/src/graphql/apollo-types/GetExperienceAndEntriesDetailView";
import {
  emptyGetEntries,
  toGetEntriesSuccessQuery,
} from "@eb/cm/src/graphql/utils.gql";
import immer from "immer";
import {
  writeCachedExperienceCompleteFragment,
  getCachedEntriesDetailViewSuccess,
  writeCachedEntriesDetailView,
  readExperienceCompleteFragment,
} from "../../apollo/get-detailed-experience-query";
import { DataDefinitionFragment } from "@eb/cm/src/graphql/apollo-types/DataDefinitionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { UnsyncedModifiedExperience } from "../../utils/unsynced-ledger.types";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import {
  stringifyDataObjectData,
  parseDataObjectData,
} from "../UpsertEntry/upsert-entry.utils";
import { EntryConnectionFragment } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { E2EWindowObject } from "../../utils/types";

////////////////////////// CREATE ////////////////////////////

export async function createOfflineExperience(
  variables: CreateExperiencesVariables,
  globals?: E2EWindowObject,
): Promise<string | ExperienceCompleteFragment> {
  const { input: inputs } = variables;
  const input = inputs[0];

  const existingExperiencesMini = getCachedExperiencesConnectionListView();

  const existingExperiences = existingExperiencesMini
    ? (existingExperiencesMini.edges as GetExperiencesConnectionListView_getExperiences_edges[])
    : ([] as GetExperiencesConnectionListView_getExperiences_edges[]);

  const exists = existingExperiences.find((e) => {
    const edge = e as GetExperiencesConnectionListView_getExperiences_edges;
    return (
      (edge.node as GetExperiencesConnectionListView_getExperiences_edges_node)
        .title === input.title
    );
  });

  if (exists) {
    return "has already been taken";
  }

  const today = new Date();
  const timestamp = today.toJSON();
  const experienceId = makeOfflineId(v4());

  const {
    dataDefinitions: createDataDefinitions,
    title,
    description = null,
  } = input;

  const dataDefinitions: DataDefinitionFragment[] = (createDataDefinitions as CreateDataDefinition[]).map(
    ({ name, type }, index) => {
      const id = experienceId + "--" + index;

      return {
        __typename: "DataDefinition",
        name,
        type,
        id,
        clientId: id,
      };
    },
  );

  const experience = {
    __typename: "Experience",
    id: experienceId,
    clientId: experienceId,
    insertedAt: timestamp,
    updatedAt: timestamp,
    description: description as string,
    title,
    dataDefinitions,
  } as ExperienceCompleteFragment;

  const { cache, persistor } = globals || window.____ebnis;

  cache.writeQuery<
    GetExperienceAndEntriesDetailView,
    GetExperienceAndEntriesDetailViewVariables
  >({
    query: GET_EXPERIENCE_AND_ENTRIES_DETAIL_VIEW_QUERY,
    data: {
      getExperience: experience,
      getEntries: emptyGetEntries,
    },
    variables: {
      experienceId,
      pagination: {
        first: 10,
      },
    },
  });

  upsertExperiencesInGetExperiencesMiniQuery([[experienceId, experience]]);

  writeUnsyncedExperience(experienceId, {
    isOffline: true,
  });

  await persistor.persist();

  return experience;
}

////////////////////////// END CREATE ////////////////////////////

////////////////////////// START UPDATE ////////////////////////////

export function updateExperienceOfflineFn(input: UpdateExperienceOfflineInput) {
  const { experienceId } = input;

  let experience = readExperienceCompleteFragment(experienceId);

  // istanbul ignore next:
  if (!experience) {
    return;
  }

  experience = {
    ...experience,
  };

  let unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    // istanbul ignore next:
    {}) as UnsyncedModifiedExperience;

  unsyncedExperience = {
    ...unsyncedExperience,
  };

  let entries = getCachedEntriesDetailViewSuccess(experienceId);
  entries = {
    ...entries,
  };

  let entriesUpdated = false;
  const immerUpdate: ImmerUpdate = [experience, unsyncedExperience, entries];

  const [
    updatedExperience,
    fromImmerUnsyncedExperience,
    fromImmerEntries,
  ] = immer<ImmerUpdate>(
    immerUpdate,
    ([proxy, immerUnsyncedExperience, immerEntries]) => {
      const modifiedOwnFields =
        immerUnsyncedExperience.ownFields ||
        // istanbul ignore next:
        {};

      const modifiedDefinitions =
        immerUnsyncedExperience.definitions ||
        // istanbul ignore next:
        {};

      const modifiedEntries =
        immerUnsyncedExperience.modifiedEntries ||
        // istanbul ignore next:
        {};

      const deletedEntries =
        immerUnsyncedExperience.deletedEntries ||
        // istanbul ignore next:
        [];

      const { edges: entriesEdges } = immerEntries;

      const {
        ownFields,
        updateDefinitions,
        updatedEntry,
        deletedEntry,
      } = input;

      const { title, description } =
        ownFields ||
        // istanbul ignore next:
        {};

      if (title) {
        proxy.title = title;
        modifiedOwnFields.title = true;
        immerUnsyncedExperience.ownFields = modifiedOwnFields;
      }

      if (description !== undefined) {
        proxy.description = description;
        modifiedOwnFields.description = true;
        immerUnsyncedExperience.ownFields = modifiedOwnFields;
      }

      let newEntryEdges: EntryConnectionFragment_edges[] = [];

      // entry must be updated before definitions.type update
      if (updatedEntry || deletedEntry) {
        (entriesEdges as EntryConnectionFragment_edges[]).forEach((edge) => {
          let shouldAppend = true;
          const entry = edge.node as EntryFragment;
          const { id: entryId } = entry;

          if (updatedEntry && updatedEntry.entry.id === entryId) {
            edge.node = updatedEntry.entry;

            const modifiedEntry = modifiedEntries[entryId] || {};

            updatedEntry.dataObjectsIds.forEach((dataObjectId) => {
              modifiedEntry[dataObjectId] = true;
            });

            modifiedEntries[entryId] = modifiedEntry;
            immerUnsyncedExperience.modifiedEntries = modifiedEntries;
            entriesUpdated = true;
          }

          if (deletedEntry && deletedEntry.id === entryId) {
            deletedEntries.push(entryId);
            immerUnsyncedExperience.deletedEntries = deletedEntries;
            purgeEntry(entry);
            shouldAppend = false;
            entriesUpdated = true;
          }

          if (shouldAppend) {
            newEntryEdges.push(edge);
          }
        });
      }

      // If we did not update entries and hence edges, we revert to default
      newEntryEdges = newEntryEdges.length
        ? newEntryEdges
        : (entriesEdges as EntryConnectionFragment_edges[]);

      if (updateDefinitions) {
        immerUnsyncedExperience.definitions = modifiedDefinitions;

        const idToDefinitionUpdateMap = updateDefinitions.reduce(
          (acc, d) => {
            acc[d.id] = d;
            return acc;
          },
          {} as {
            [definitionId: string]: UpdateDefinitionInput;
          },
        );

        const definitionIdToTypeMap: {
          [definitionId: string]: DataTypes;
        } = {};

        let hasTypeUpdate = false;

        proxy.dataDefinitions = proxy.dataDefinitions.map((d) => {
          const definition = {
            ...(d as DataDefinitionFragment),
          };

          const { id } = definition;
          const updates = idToDefinitionUpdateMap[id];

          if (updates) {
            const modifiedDefinition = modifiedDefinitions[id] || {};
            modifiedDefinitions[id] = modifiedDefinition;
            const { name, type } = updates;

            if (name) {
              definition.name = name;
              modifiedDefinition.name = true;
            }

            if (type) {
              definitionIdToTypeMap[id] = type;
              modifiedDefinition.type = true;
              definition.type = type;
              entriesUpdated = true;
              hasTypeUpdate = true;
            }

            return definition;
          }

          return definition;
        });

        // istanbul ignore else:
        if (hasTypeUpdate) {
          newEntryEdges.forEach((edge) => {
            const entry = edge.node as EntryFragment;

            entry.dataObjects.forEach((d) => {
              const dataObject = d as DataObjectFragment;
              const type = definitionIdToTypeMap[dataObject.definitionId];

              if (type) {
                const { data } = dataObject;
                const parsedData = parseDataObjectData(data);
                dataObject.data = stringifyDataObjectData(type, parsedData);
              }
            });
          });
        }
      }

      if (entriesUpdated) {
        immerEntries.edges = newEntryEdges;
      }
    },
  );

  if (!isOfflineId(experienceId)) {
    writeUnsyncedExperience(experienceId, fromImmerUnsyncedExperience);
  }

  if (entriesUpdated) {
    writeCachedEntriesDetailView(
      experienceId,
      toGetEntriesSuccessQuery(fromImmerEntries),
    );
  }

  floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);
  writeCachedExperienceCompleteFragment(updatedExperience);
  const { persistor } = window.____ebnis;
  persistor.persist();

  return updatedExperience;
}

export type UpdateExperienceOfflineInput = UpdateExperienceInput & {
  updatedEntry?: {
    entry: EntryFragment;
    dataObjectsIds: string[];
  };
  deletedEntry?: EntryFragment;
};

type ImmerUpdate = [
  ExperienceCompleteFragment,
  UnsyncedModifiedExperience,
  EntryConnectionFragment,
];

////////////////////////// END UPDATE ////////////////////////////
