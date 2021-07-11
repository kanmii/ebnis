/* eslint-disable react-hooks/rules-of-hooks*/
import { getCachedExperiencesConnectionListView } from "@eb/shared/src/apollo/cached-experiences-list-view";
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceDCFragment,
  readExperienceDFragment,
  writeCachedEntriesDetailView,
  writeExperienceDCFragment,
  writeGetExperienceDetailViewQueryToCache,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import {
  floatExperienceToTopInGetExperiencesListViewQuery,
  purgeEntry,
  upsertExperiencesInGetExperiencesListView,
} from "@eb/shared/src/apollo/experiences-list-cache-utils";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import { CreateExperiencesVariables } from "@eb/shared/src/graphql/apollo-types/CreateExperiences";
import { DataDefinitionFragment } from "@eb/shared/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import {
  GetExperiencesConnectionListView_getExperiences_edges,
  GetExperiencesConnectionListView_getExperiences_edges_node,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
import {
  CreateDataDefinition,
  CreateEntryInput,
  DataTypes,
  UpdateDefinitionInput,
  UpdateExperienceInput,
} from "@eb/shared/src/graphql/apollo-types/globalTypes";
import {
  emptyGetEntries,
  entriesToConnection,
  toGetEntriesSuccessQuery,
} from "@eb/shared/src/graphql/utils.gql";
import {
  parseDataObjectData,
  stringifyDataObjectData,
} from "@eb/shared/src/utils";
import { isOfflineId, makeOfflineId } from "@eb/shared/src/utils/offlines";
import { v4 } from "uuid";
import { UnsyncedModifiedExperience } from "./unsynced-ledger.types";
import {
  createOfflineEntryMutation,
  CreateOfflineEntryMutationVariables,
} from "./upsert-entry.resolvers";

////////////////////////// CREATE ////////////////////////////

export async function createOfflineExperience(
  variables: CreateExperiencesVariables,
): Promise<string | ExperienceDCFragment> {
  const { input: inputs } = variables;
  const input = inputs[0];

  const existingExperiencesListView = getCachedExperiencesConnectionListView();

  const existingExperiences = existingExperiencesListView
    ? (existingExperiencesListView.edges as GetExperiencesConnectionListView_getExperiences_edges[])
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
  const experienceId = input.id || makeOfflineId(v4());

  const {
    dataDefinitions: createDataDefinitions,
    title,
    description = null,
  } = input;

  const dataDefinitions: DataDefinitionFragment[] = (
    createDataDefinitions as CreateDataDefinition[]
  ).map(({ name, type, id }, index) => {
    const definitionId = id || experienceId + "--" + index;

    return {
      __typename: "DataDefinition",
      name,
      type,
      id: definitionId,
      clientId: definitionId,
    };
  });

  let experience: ExperienceDCFragment = {
    __typename: "Experience",
    id: experienceId,
    clientId: experienceId,
    insertedAt: timestamp,
    updatedAt: timestamp,
    description: description as string,
    title,
    dataDefinitions,
    comments: null,
  };

  const entriesInputs = input.entries;
  let entries: undefined | EntryFragment[] = undefined;

  if (entriesInputs) {
    const entriesInput = entriesInputs[0] as CreateEntryInput;
    const entryInput = {
      ...entriesInput,
      experienceId,
    };

    const result = await createOfflineEntryMutation(
      entryInput as CreateOfflineEntryMutationVariables,
      experience,
    );

    // TODO: deal with else?????
    if (result) {
      experience = result.experience;
      entries = [result.entry];
    }
  } else {
    //
  }

  updateCacheQueriesWithCreatedExperience(experience, entries);

  const { persistor } = window.____ebnis;

  writeUnsyncedExperience(experienceId, {
    isOffline: true,
  });

  await persistor.persist();

  return experience;
}

export type CreateOfflineExperienceInjectType = {
  createOfflineExperienceInject: typeof createOfflineExperience;
};

export function updateCacheQueriesWithCreatedExperience(
  experience: ExperienceDCFragment,
  entries?: EntryFragment[],
) {
  const { id: experienceId } = experience;

  writeExperienceDCFragment(experience);
  upsertExperiencesInGetExperiencesListView([[experienceId, experience]]);
  writeGetExperienceDetailViewQueryToCache(experience);

  if (entries) {
    const entriesConnection = entriesToConnection(entries);

    writeCachedEntriesDetailView(
      experienceId,
      toGetEntriesSuccessQuery(entriesConnection),
    );
  } else {
    writeCachedEntriesDetailView(experienceId, emptyGetEntries);
  }
}

////////////////////////// END CREATE ////////////////////////////

////////////////////////// START UPDATE ////////////////////////////

export function updateExperienceOfflineFn(input: UpdateExperienceOfflineInput) {
  const { experienceId } = input;

  let experience =
    readExperienceDCFragment(experienceId) ||
    readExperienceDFragment(experienceId);

  // istanbul ignore next:
  if (!experience) {
    return;
  }

  experience = { ...experience };

  let unsyncedExperience = (getUnsyncedExperience(experienceId) ||
    // istanbul ignore next:
    {}) as UnsyncedModifiedExperience;

  unsyncedExperience = { ...unsyncedExperience };

  let entries = getCachedEntriesDetailViewSuccess(experienceId);
  entries = { ...entries };

  let entriesUpdated = false;
  // const immerUpdate: ImmerUpdate = [experience, unsyncedExperience, entries];

  let modifiedOwnFields =
    unsyncedExperience.ownFields ||
    // istanbul ignore next:
    {};
  modifiedOwnFields = { ...modifiedOwnFields };

  let modifiedDefinitions =
    unsyncedExperience.definitions ||
    // istanbul ignore next:
    {};
  modifiedDefinitions = { ...modifiedDefinitions };

  let modifiedEntries =
    unsyncedExperience.modifiedEntries ||
    // istanbul ignore next:
    {};
  modifiedEntries = { ...modifiedEntries };

  let deletedEntries =
    unsyncedExperience.deletedEntries ||
    // istanbul ignore next:
    [];
  deletedEntries = { ...deletedEntries };

  const { edges: entriesEdges } = entries;

  const { ownFields, updateDefinitions, updatedEntry, deletedEntry } = input;

  const { title, description } =
    ownFields ||
    // istanbul ignore next:
    {};

  if (title) {
    experience.title = title;
    modifiedOwnFields.title = true;
    unsyncedExperience.ownFields = modifiedOwnFields;
  }

  if (description !== undefined) {
    experience.description = description;
    modifiedOwnFields.description = true;
    unsyncedExperience.ownFields = modifiedOwnFields;
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
        unsyncedExperience.modifiedEntries = modifiedEntries;
        entriesUpdated = true;
      }

      if (deletedEntry && deletedEntry.id === entryId) {
        deletedEntries.push(entryId);
        unsyncedExperience.deletedEntries = deletedEntries;
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
    unsyncedExperience.definitions = modifiedDefinitions;

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

    experience.dataDefinitions = experience.dataDefinitions.map((d) => {
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
    entries.edges = newEntryEdges;
  }

  if (!isOfflineId(experienceId)) {
    writeUnsyncedExperience(experienceId, unsyncedExperience);
  }

  if (entriesUpdated) {
    writeCachedEntriesDetailView(
      experienceId,
      toGetEntriesSuccessQuery(entries),
    );
  }

  floatExperienceToTopInGetExperiencesListViewQuery(experience);
  writeExperienceDCFragment(experience);
  const { persistor } = window.____ebnis;
  persistor.persist();

  return experience;
}

export type UpdateExperienceOfflineFnInjectType = {
  updateExperienceOfflineFnInject: typeof updateExperienceOfflineFn;
};

export type UpdateExperienceOfflineInput = UpdateExperienceInput & {
  updatedEntry?: {
    entry: EntryFragment;
    dataObjectsIds: string[];
  };
  deletedEntry?: EntryFragment;
};

////////////////////////// END UPDATE ////////////////////////////
