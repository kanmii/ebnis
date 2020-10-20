import {
  CreateEntryInput,
  CreateDataObject,
  CreateExperienceInput,
  CreateDataDefinition,
} from "../../graphql/apollo-types/globalTypes";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import { getEntriesQuerySuccess } from "../../apollo/get-detailed-experience-query";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";

export function experienceToCreateInput(experience: ExperienceFragment) {
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
    getEntriesQuerySuccess(experienceId),
  );

  // istanbul ignore else:
  if (createEntriesInput.length) {
    createExperienceInput.entries = createEntriesInput;
  }

  return createExperienceInput;
}

export function entryToCreateInput(entry: EntryFragment) {
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
