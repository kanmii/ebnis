/* istanbul ignore file */
import gql from "graphql-tag";
import { DeletedVal, CancelledVal, RequestedVal } from "../utils/types";

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
  const { cache } = window.____ebnis;

  if (!payload) {
    cache.writeData({
      data: {
        deleteExperience: "null",
      },
    });

    return null;
  }

  const deleteExperience = payload as DeletedExperienceLedger;
  deleteExperience.howLongAgo = new Date().getTime();

  cache.writeData({
    data: {
      deleteExperience: JSON.stringify(deleteExperience),
    },
  });

  return null;
}

export function getDeleteExperienceLedger(
  id?: string,
): DeletedExperienceLedger | null {
  const { cache } = window.____ebnis;

  const data = cache.readQuery<DeleteExperienceQueryResult>({
    query: DELETE_EXPERIENCES_QUERY,
  });

  const deleted =
    data && data.deleteExperience && JSON.parse(data.deleteExperience);

  if (!deleted || !id) {
    return deleted;
  }

  if (id === deleted.id) {
    return deleted as DeletedExperienceLedger;
  }

  return putOrRemoveDeleteExperienceLedger();
}

interface DeleteExperienceQueryResult {
  deleteExperience: string;
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
