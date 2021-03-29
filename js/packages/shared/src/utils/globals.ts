import { isDevEnv } from "../env";
import { EbnisGlobals, StateValue } from "./types/index";

export function hasCypress() {
  return "undefined" !== typeof window && !!window.Cypress;
}

export function isBrowser() {
  return "undefined" !== typeof window;
}

export function getOrMakeGlobals() {
  let globals = {
    logApolloQueries: isDevEnv,
  } as EbnisGlobals;

  if (isBrowser()) {
    const cachedGlobal = hasCypress()
      ? // attempt to get from cypress
        (window.Cypress.env(StateValue.globalKey) as EbnisGlobals)
      : // attempt to get from global window
        window.____ebnis;

    if (cachedGlobal) {
      globals = cachedGlobal;
    } else {
      // no cached globals? Attach new globals to global window
      window.____ebnis = globals;
    }
  } else {
    // ssr
    const cachedGlobal = process.____ebnis;

    if (cachedGlobal) {
      globals = cachedGlobal;
    }
  }

  return globals;
}

export function setGlobals(globals: EbnisGlobals) {
  if (isBrowser()) {
    window.____ebnis = globals;
  }

  return globals;
}

export function getApiUrl() {
  return (process.env.API_URL_INTERNAL ||
    process.env.REACT_APP_API_URL ||
    process.env.API_URL) as string;
}

export function getBackendUrls(uri?: string) {
  const apiUrl = uri || getApiUrl();

  if (!apiUrl) {
    throw new Error(
      `You must set the "REACT_APP_API_URL" environment variable`,
    );
  }

  const url = new URL(apiUrl);

  return {
    apiUrl: url.href,
    websocketUrl: url.href.replace("http", "ws").replace(/\/?$/, "/socket"),
    root: url.origin,
  };
}
