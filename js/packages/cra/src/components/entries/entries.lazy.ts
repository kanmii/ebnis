/* istanbul ignore file */
import { lazy } from "react";

export const UpsertEntry = lazy(
  () => import("../UpsertEntry/upsert-entry.component"),
);
