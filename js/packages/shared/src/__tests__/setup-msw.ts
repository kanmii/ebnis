import { EbnisGlobals, MswGraphql, MswSetupWorkerApi } from "../utils/types";

export function setUpMsw(globals: EbnisGlobals) {
  let mswBrowserWorker: MswSetupWorkerApi;
  let mswGraphql: MswGraphql;

  if (!globals.mswBrowserWorker) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const msw = require("./msw-browser");

    mswBrowserWorker = msw.mswBrowserWorker;
    mswGraphql = msw.mswGraphql;

    globals.mswBrowserWorker = mswBrowserWorker;
    globals.mswGraphql = mswGraphql;
  }

  return globals;
}
