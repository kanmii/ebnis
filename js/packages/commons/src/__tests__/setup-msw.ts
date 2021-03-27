/* eslint-disable @typescript-eslint/no-var-requires */
import { EbnisGlobals, MswGraphql, MswSetupWorkerApi } from "../utils/types";

export function setUpMsw(ebnisGlobals: EbnisGlobals) {
  let mswBrowserWorker: MswSetupWorkerApi;
  let mswGraphql: MswGraphql;

  if (!ebnisGlobals.mswBrowserWorker) {
    const msw = require("./msw-browser");

    mswBrowserWorker = msw.mswBrowserWorker;
    mswGraphql = msw.mswGraphql;

    ebnisGlobals.mswBrowserWorker = mswBrowserWorker;
    ebnisGlobals.mswGraphql = mswGraphql;
  }

  return ebnisGlobals;
}
