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
// @ts-check
const webpackPreprocessor = require("@cypress/webpack-preprocessor");

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  const webpackOptions = {
    resolve: {
      extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: "./node_modules/react-scripts/node_modules/babel-loader",
              options: {
                presets: [
                  "./node_modules/babel-preset-react-app/node_modules/@babel/preset-typescript",
                ],
              },
            },
          ],
        },
      ],
    },
  };

  const options = {
    webpackOptions,
    watchOptions: {},
  };

  on("file:preprocessor", webpackPreprocessor(options));
};
