/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars*/
import { RegisterUserInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { UserFragment } from "@eb/cm/src/graphql/apollo-types/UserFragment";
import { buildClientCache } from "@eb/cra/src/apollo/setup";
import { storeConnectionStatus } from "@eb/cra/src/utils/connections";
import { CreateUserAttrs, CREATE_USER_ATTRS } from "./create-user-attrs";
import { getMswServer, startMswServer } from "./cypress-msw";
import { loginMockUser } from "./login-mock-user";
import { registerUser } from "./register-user";

const serverUrl = Cypress.env("API_URL") as string;

function checkoutMockSession() {
  window.localStorage.clear();

  const msw = getMswServer();

  if (msw) {
    msw.resetHandlers();
  }

  const ebnisGlobals = buildClientCache({
    uri: serverUrl,
    newE2eTest: true,
    useMsw: true,
  });

  startMswServer(ebnisGlobals);
}

function checkoutSession() {
  window.localStorage.clear();

  const ebnisGlobals = buildClientCache({
    uri: serverUrl,
    newE2eTest: true,
  });

  const msw = getMswServer(ebnisGlobals);

  if (msw) {
    msw.resetHandlers();
    msw.stop();
  }

  cy.request("GET", serverUrl + "/reset_db").then((response) => {
    expect(response.body).to.equal("ok");
  });
}

function createUser(userData: CreateUserAttrs = CREATE_USER_ATTRS) {
  return cy
    .request("POST", serverUrl + "/create_user", { user: userData })
    .then((response) => {
      return response.body as UserFragment;
    });
}

function setConnectionStatus(isConnected: boolean) {
  storeConnectionStatus(isConnected, "manual");
}

Cypress.Commands.add("checkoutSession", checkoutSession);
Cypress.Commands.add("createUser", createUser);
Cypress.Commands.add("registerUser", registerUser);
Cypress.Commands.add("setConnectionStatus", setConnectionStatus);
Cypress.Commands.add("checkoutMockSession", checkoutMockSession);
Cypress.Commands.add("loginMockUser", loginMockUser);

declare global {
  interface Window {
    Cypress: {
      env: <T>(k?: string, v?: T) => void | T;
    };
  }

  namespace Cypress {
    /* eslint-disable-next-line */
    interface Chainable {
      checkoutSession: () => Chainable<Promise<void>>;
      createUser: (data?: CreateUserAttrs) => Chainable<Promise<UserFragment>>;
      registerUser: (userData?: RegisterUserInput) => UserFragment | null;
      setConnectionStatus: (isConnected: boolean) => void;
      checkoutMockSession: () => Chainable<Promise<void>>;
      loginMockUser: () => UserFragment | null;
    }
  }
}
