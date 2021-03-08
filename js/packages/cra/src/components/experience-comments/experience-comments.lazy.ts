/* istanbul ignore file */
import { lazy } from "react";

export const UpsertComment = lazy(
  () => import("../UpsertComment/upsert-comment.component"),
);
