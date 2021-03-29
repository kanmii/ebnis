import { ComponentTimeoutsMs } from "../utils/timers";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function waitForCount<T>(
  callbackfn: (...t: any) => T | Promise<T>,
  { retries = 2, interval = 50, callbackArgs = [] } = {},
): Promise<T> {
  const result = await callbackfn(...callbackArgs);

  if (result) {
    return result;
  }

  const d = deferred<T>();
  let count = 1;

  function execute() {
    setTimeout(async () => {
      const result = await callbackfn(...callbackArgs);

      if (result) {
        d.resolve(result);
        return;
      }

      if (++count <= retries) {
        execute();
      }
    }, interval);
  }

  execute();

  return d.promise;
}

function deferred<T>() {
  let resolve: any;
  let reject: any;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: [0],
  closeNotification: 0,
};
