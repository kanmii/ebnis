/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  const {
    BACKEND_SERVER_URL = "",
    API_URL = "",
    API_URL_ALTERNATE,
    WEB_URL = "",
    CI,
    CYPRESS_BROWSER,
  } = process.env;

  config.baseUrl = WEB_URL;
  // let cypress choose its own PORT
  config.port = null;

  if (CYPRESS_BROWSER) {
    config.browsers = [CYPRESS_BROWSER];
  }

  const envs = config.env;

  envs.BACKEND_SERVER_URL = BACKEND_SERVER_URL;
  envs.API_URL = API_URL_ALTERNATE || API_URL;
  envs.CI = CI;

  return config;
};
