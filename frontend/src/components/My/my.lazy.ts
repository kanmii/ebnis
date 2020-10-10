/* istanbul ignore file */
import { lazy } from "react";

export const NewExperience = lazy(() =>
  import("../UpsertExperience/upsert-experience.component"),
);
