import { uuid } from "uuidv4";

export const SESSION_ID_KEY = "L6HWFId2pNH3N2TvdW97pu5rVEeSV7LhAChcxq5t/HVP";

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_ID_KEY);

  if (!id) {
    id = uuid();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }

  return id;
}
