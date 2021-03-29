import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { DataContextEntry } from "../entries/entries.utils";
import { UpdatingPayload } from "../UpsertEntry/upsert-entry.utils";

type UpdateEntryPayload = UpdatingPayload & {
  index: number;
};

export type ActivateUpdateEntryCb = (data: UpdateEntryPayload) => void;

export type CallerProps = {
  state: DataContextEntry;
  index: number;
  activateUpdateEntryCb: ActivateUpdateEntryCb;
  entriesOptionsCb: (entry: EntryFragment) => void;
  menuActive: boolean;
  deleteEntryRequest: (entry: EntryFragment) => void;
};

export type Props = CallerProps;
