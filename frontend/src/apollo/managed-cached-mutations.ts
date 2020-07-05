/* istanbul ignore file */

const KEY = "44da79d-ec9d-425d-a7a3-757765d79f59";
const PERIOD = 60 * 5 * 1000; // 5 minutes

export function manageCachedMutations() {
  const now = new Date().getTime();
  const timeString = localStorage.getItem(KEY);

  if (!timeString) {
    localStorage.setItem(KEY, "" + now);
    return;
  }

  const lastTime = +timeString + PERIOD;

  if (now >= lastTime) {
    const cache = window.____ebnis.cache as any;
    const dataClass = cache.data;
    const data = dataClass.data;

    for (const dataKey of Object.keys(data)) {
      if (dataKey.includes("ROOT_MUTATION.") && !dataKey.includes("login")) {
        delete data[dataKey];
        continue;
      }

      if (dataKey === "ROOT_MUTATION") {
        const rootMutation = data.ROOT_MUTATION;

        Object.keys(rootMutation).forEach((key) => {
          if (!key.includes("login")) {
            delete rootMutation[key];
          }
        });
      }
    }

    window.____ebnis.persistor.persist();

    localStorage.setItem(KEY, "" + new Date().getTime());
  }
}
