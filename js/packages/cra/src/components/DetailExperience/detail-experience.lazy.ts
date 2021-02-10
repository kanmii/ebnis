/* istanbul ignore file */
import { lazy } from "react";

export const UpsertEntry = lazy(
  () => import("../UpsertEntry/upsert-entry.component"),
);

export const UpsertComment = lazy(
  () => import("../UpsertComment/upsert-comment.component"),
);
