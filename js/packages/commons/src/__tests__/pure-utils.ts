/* eslint-disable @typescript-eslint/no-explicit-any */
export async function waitForCount<T>(
  callbackfn: (t: any) => T | Promise<T>,
  maxExecutionCount = 10,
  timeout = 50,
  ...callbackArgs: any
): Promise<T> {
  const result = await callbackfn(callbackArgs);

  if (result) {
    return result;
  }

  const d = deferred<T>();
  let count = 1;

  function execute() {
    setTimeout(async () => {
      const result = await callbackfn(callbackArgs);

      if (result) {
        d.resolve(result);
        return;
      }

      if (++count <= maxExecutionCount) {
        execute();
      }
    }, timeout);
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
