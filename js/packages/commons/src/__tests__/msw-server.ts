import { setupServer } from "msw/node";

// Setup requests interception using the given handlers.
export const mswServer = setupServer();

export const mswServerListen = () => {
  return mswServer.listen({
    onUnhandledRequest: "warn",
  });
};
