/* istanbul ignore file */
import { apiUrlReactEnv } from "./env-variables";

export function getBackendUrls(uri?: string) {
  const apiUrl = uri || process.env[apiUrlReactEnv];

  if (!apiUrl) {
    throw new Error(
      `You must set the "${apiUrlReactEnv}" environment variable`,
    );
  }

  const url = new URL(apiUrl);

  return {
    apiUrl: url.href,
    websocketUrl: url.href.replace("http", "ws").replace(/\/?$/, "/socket"),
    root: url.origin,
  };
}
