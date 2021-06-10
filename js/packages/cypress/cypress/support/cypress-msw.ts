import {
  EbnisGlobals,
  MswSetupWorkerApi,
  StateValue,
} from "@eb/shared/src/utils/types";

export function getMswServer() {
  const globals = Cypress.env(StateValue.globalKey) as EbnisGlobals;
  return globals.mswBrowserWorker;
}

export function useCypressMsw(...handlers: UseParameters) {
  const server = getMswServer();
  server.use(...handlers);
}

type UseParameters = Parameters<MswSetupWorkerApi["use"]>;
