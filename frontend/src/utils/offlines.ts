export const OFFLINE_ID_PREFIX = "eu-"; // ebnis-unsaved

export function makeOfflineId(id?: string | number) {
  if (!id) {
    id = new Date().getTime();
  }

  return OFFLINE_ID_PREFIX + id;
}

export function getIdFromOfflineId(offlineId: string) {
  const [, id] = offlineId.split("-");
  return id;
}

export function isOfflineId(id?: string) {
  return id ? id.startsWith(OFFLINE_ID_PREFIX) : false;
}

export function makeOfflineEntryIdFromExperience(
  experienceId: string,
  index: number,
) {
  experienceId = experienceId + "--" + index;

  const id = isOfflineId(experienceId)
    ? experienceId
    : makeOfflineId(experienceId);
  return id;
}

export function makeOfflineDataObjectIdFromEntry(
  entryId: string,
  index: number,
) {
  const dataObjectId = `${entryId}--${index}`;
  return dataObjectId;
}
