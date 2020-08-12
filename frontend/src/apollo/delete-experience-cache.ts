/* istanbul ignore file */
import gql from "graphql-tag";
import { makeVar } from "@apollo/client";
import { DeletedVal, CancelledVal, RequestedVal } from "../utils/types";

export const deleteExperienceVar = makeVar<null | DeletedExperienceLedger>(
  null,
);

const DELETE_EXPERIENCES_QUERY = gql`
  query {
    deleteExperience @client
  }
`;

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
  const { cache } = window.____ebnis;

  const data = cache.readQuery<DeleteExperienceQueryResult>({
    query: DELETE_EXPERIENCES_QUERY,
  });

  const deleted = data && data.deleteExperience;

  if (!deleted || !id) {
    return deleted;
  }

  if (id === deleted.id) {
    return deleted as DeletedExperienceLedger;
  }

  return putOrRemoveDeleteExperienceLedger();
}

interface DeleteExperienceQueryResult {
  deleteExperience: DeletedExperienceLedger;
}

type DeletedExperienceLedgerRequired = {
  id: string;
  howLongAgo: number;
};

type DeletedExperienceLedger = DeletedExperienceLedgerRequired &
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
