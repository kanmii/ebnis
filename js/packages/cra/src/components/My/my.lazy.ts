/* istanbul ignore file */
import { lazy } from "react";

export const UpsertExperience = lazy(
  () => import("../UpsertExperience/upsert-experience.default"),
);

export type UpsertExperienceInjectType = {
  UpsertExperienceInject: typeof UpsertExperience;
};
