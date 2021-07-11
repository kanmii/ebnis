/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
import {
  SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
} from "@eb/shared/src/apollo/schema-keys";
import { makeApolloClient } from "@eb/shared/src/client";
import { RegisterUserInput } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { UserFragment } from "@eb/shared/src/graphql/apollo-types/UserFragment";
import { storeConnectionStatus } from "@eb/shared/src/utils/connections";
import { EbnisGlobals, StateValue } from "@eb/shared/src/utils/types";
import { CreateUserAttrs, CREATE_USER_ATTRS } from "./create-user-attrs";
import { loginMockUser } from "./login-mock-user";
import { registerUser } from "./register-user";

const serverUrl = Cypress.env("API_URL") as string;
const isCI = Cypress.env("CI") === "true";

function checkoutSession({ useMsw }: CheckoutSessionArgs = {}) {
  let formerGlobal = Cypress.env(StateValue.globalKey) as EbnisGlobals;

  if (formerGlobal) {
    const browserWorker = formerGlobal.mswBrowserWorker;

    if (browserWorker) {
      // stopping the browserWorker sometimes throws error
      try {
        browserWorker.resetHandlers();
        browserWorker.stop();
      } catch (error) {
        console.error("\n\nMSW browser worker error. It should be ignored");
        console.error(error);
      }
    }

    formerGlobal = null as any;
  }

  // clear previous envs
  Cypress.env(StateValue.globalKey, null);
  window.localStorage.clear();

  // When app start running, it will call apollo to purge the cache
  // (see function restoreCacheOrPurgeStorage) unless the `localStorage`
  // has set the `SCHEMA_VERSION_KEY`. Since we do not want data that has been
  // written by cypress to localStorage to be purged, we set the version key
  // as below:

  localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);

  const eb = {
    logApolloQueries: !isCI,
  } as EbnisGlobals;

  Cypress.env(StateValue.globalKey, eb);

  makeApolloClient({
    apiUrl: serverUrl,
    useMsw,
    ebnisGlobals: eb,
  });

  const browserWorker = eb.mswBrowserWorker;

  if (browserWorker) {
    browserWorker.start();
  }

  cy.request("GET", serverUrl + "/reset_db").then((response) => {
    expect(response.status).eq(200);
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
Cypress.Commands.add("loginMockUser", loginMockUser);

declare global {
  namespace Cypress {
    interface Chainable {
      checkoutSession: (args?: CheckoutSessionArgs) => Chainable<Promise<void>>;
      createUser: (data?: CreateUserAttrs) => Chainable<Promise<UserFragment>>;
      registerUser: (userData?: RegisterUserInput) => UserFragment | null;
      setConnectionStatus: (isConnected: boolean) => void;
      loginMockUser: () => UserFragment | null;
    }
  }
}

type CheckoutSessionArgs = {
  useMsw?: boolean;
};
