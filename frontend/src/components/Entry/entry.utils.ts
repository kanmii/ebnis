import {
  DataStateContextEntry,
  DataDefinitionIdToNameMap,
} from "../DetailExperience/detailed-experience-utils";
import { UpdatingEntryPayload } from "../UpsertEntry/upsert-entry.utils";

type UpdateEntryPayload = UpdatingEntryPayload & {
  index: number;
};

export type ActivateUpdateEntryCb = (data: UpdateEntryPayload) => void;

export type CallerProps = {
  state: DataStateContextEntry;
  index: number;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  activateUpdateEntryCb: ActivateUpdateEntryCb;
};

export type Props = CallerProps;
