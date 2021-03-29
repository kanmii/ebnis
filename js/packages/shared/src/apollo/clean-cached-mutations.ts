/* istanbul ignore file */

import { Any } from "../utils/types";

const KEY = "44da79d-ec9d-425d-a7a3-757765d79f59";
const PERIOD = 60 * 5 * 1000; // 5 minutes

export function cleanCachedMutations() {
  const now = new Date().getTime();
  const timeString = localStorage.getItem(KEY);

  if (!timeString) {
    localStorage.setItem(KEY, "" + now);
    return;
  }

  const lastTime = +timeString + PERIOD;

  if (now >= lastTime) {
    const cache = window.____ebnis.cache as Any;
    const dataClass = cache.data;
    const data = dataClass.data;

    delete data["DataObjectErrorMeta:null"];

    const rootMutation = data.ROOT_MUTATION;

    if (!rootMutation) {
      return;
    }

    for (const dataKey of Object.keys(rootMutation)) {
      if (!dataKey.startsWith("login(")) {
        delete rootMutation[dataKey];
      }
    }

    window.____ebnis.persistor.persist();

    localStorage.setItem(KEY, "" + new Date().getTime());
  }
}
