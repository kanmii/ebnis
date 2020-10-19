/* istanbul ignore file */
import { makeVar } from "@apollo/client";
import { DeletedVal, CancelledVal, RequestedVal } from "../utils/types";

export function putOrRemoveDeleteExperienceLedger(
  payload?: DeletedExperienceLedgerAction & {
    id: string;
  },
) {
  if (!payload) {
    deleteExperienceVar(null);

    return null;
  }

  const deleteExperience = payload as DeletedExperienceLedger;
  deleteExperience.howLongAgo = new Date().getTime();
  deleteExperienceVar(deleteExperience);
  return null;
}

export function getDeleteExperienceLedger(
  id?: string,
): DeletedExperienceLedger | null {
  const deleted = deleteExperienceVar();

  if (!deleted || !id) {
    return deleted;
  }

  if (id === deleted.id) {
    return deleted as DeletedExperienceLedger;
  }

  return putOrRemoveDeleteExperienceLedger();
}

export const deleteExperienceVar = makeVar<null | DeletedExperienceLedger>(
  null,
);

interface DeleteExperienceQueryResult {
  deleteExperience: DeletedExperienceLedger;
}

type DeletedExperienceLedgerRequired = {
  id: string;
  howLongAgo: number;
};

export type DeletedExperienceLedger = DeletedExperienceLedgerRequired &
  DeletedExperienceLedgerAction;

type DeletedExperienceLedgerRequest = {
  key: RequestedVal;
};

export type DeletedExperienceLedgerDeleted = {
  key: DeletedVal;
  title: string;
};

export type DeletedExperienceLedgerCancelled = {
  key: CancelledVal;
  title: string;
};

type DeletedExperienceLedgerAction =
  | DeletedExperienceLedgerRequest
  | DeletedExperienceLedgerCancelled
  | DeletedExperienceLedgerDeleted;
