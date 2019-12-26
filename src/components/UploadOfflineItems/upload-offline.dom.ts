import { CreationMode } from "./upload-offline.utils";

export const domPrefix = "upload-offline";

export function makeExperienceComponentId(id: Id, mode: CreationMode) {
  return `${domPrefix}-${mode}-experience-title-${id}`;
}

export const createdOnlineExperiencesContainerId = `${domPrefix}-created-online-experiences-container`;

export const createdOfflineExperiencesContainerId = `${domPrefix}-created-offline-experiences-container`;

const experienceUploadStatusClassNamePrefix = "upload-experience-status--";

export function makeExperienceUploadStatusClassNames(
  didSucceed?: boolean,
  hasError?: boolean,
) {
  if (didSucceed) {
    return [
      experienceUploadStatusClassNamePrefix + "success",
      "experience-title--success",
    ];
  }

  if (hasError) {
    return [
      experienceUploadStatusClassNamePrefix + "error",
      "experience-title--error",
    ];
  }

  return ["", ""];
}

export function makeUploadStatusIconId(id: Id, status: "success" | "error") {
  return `${domPrefix}-upload-status-${status}-icon-${id}`;
}

type Id = string | number;
