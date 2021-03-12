import { DataStateContextEntry } from "../DetailExperience/detailed-experience-utils";
import { UpdatingPayload } from "../UpsertEntry/upsert-entry.utils";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";

type UpdateEntryPayload = UpdatingPayload & {
  index: number;
};

export type ActivateUpdateEntryCb = (data: UpdateEntryPayload) => void;

export type CallerProps = {
  state: DataStateContextEntry;
  index: number;
  activateUpdateEntryCb: ActivateUpdateEntryCb;
  entriesOptionsCb: (entry: EntryFragment) => void;
  menuActive: boolean;
  deleteEntryRequest: (entry: EntryFragment) => void;
};

export type Props = CallerProps;
