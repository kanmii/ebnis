import {
  DataStateContextEntry,
  DataDefinitionIdToNameMap,
} from "../DetailExperience/detailed-experience-utils";
import { UpdatingEntryPayload } from "../UpsertEntry/upsert-entry.utils";
import { EntryFragment } from "@ebnis/commons/src/graphql/apollo-types/EntryFragment";

type UpdateEntryPayload = UpdatingEntryPayload & {
  index: number;
};

export type ActivateUpdateEntryCb = (data: UpdateEntryPayload) => void;

export type CallerProps = {
  state: DataStateContextEntry;
  index: number;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  activateUpdateEntryCb: ActivateUpdateEntryCb;
  entriesOptionsCb: (entry: EntryFragment) => void;
  menuActive: boolean;
  deleteEntryRequest: (entry: EntryFragment) => void;
};

export type Props = CallerProps;
