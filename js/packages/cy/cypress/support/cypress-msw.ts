import {
  CYPRESS_APOLLO_KEY,
  EbnisGlobals,
  MswSetupWorkerApi,
} from "@eb/cm/src/utils/types";
import { setUpMsw } from "@eb/cm/src/__tests__/setup-msw";

export function getMswServer(ebnisGlobals?: EbnisGlobals) {
  let server = (null as unknown) as MswSetupWorkerApi;

  ebnisGlobals =
    ebnisGlobals || (Cypress.env(CYPRESS_APOLLO_KEY) as EbnisGlobals);

  if (ebnisGlobals && ebnisGlobals.mswGraphql) {
    server = ebnisGlobals.mswBrowserWorker as MswSetupWorkerApi;
  }

  return server;
}

export function useCypressMsw(...handlers: UseParameters) {
  const server = getMswServer();
  server.use(...handlers);
}

export function startMswServer(ebnisGlobals: EbnisGlobals) {
  setUpMsw(ebnisGlobals);

  if (ebnisGlobals.mswBrowserWorker) {
    const { mswBrowserWorker } = ebnisGlobals;
    mswBrowserWorker.start();
  }
}

type UseParameters = Parameters<MswSetupWorkerApi["use"]>;
