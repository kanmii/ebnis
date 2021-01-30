/* eslint-disable @typescript-eslint/no-var-requires */

const commonScripts = require("../../js-shared/_package-scripts");

const apiUrl = process.env.API_URL;
const webUrl = process.env.WEB_URL;
const cypressBrowser = process.env.CYPRESS_BROWSER
  ? ` --browser ${process.env.CYPRESS_BROWSER}`
  : "";
const cypressPreEnv = `CYPRESS_BASE_URL=${webUrl}`;
const cypressPostEnv = `--env API_URL=${apiUrl}`;
const cypressPostEnvOpen = `${cypressPostEnv} ${cypressBrowser}`;

module.exports = {
  scripts: {
    ...commonScripts.scripts,
    default: {
      script: `${cypressPreEnv} cypress open \
           ${cypressPostEnvOpen}`,
      description: `e2e test with javascript app in dev mode/electron unless
      browser specified`,
    },
    r: {
      script: `${cypressPreEnv} cypress run ${cypressPostEnv}`,
      description: "e2e: cypress 'run' javascript app in development",
    },
    pr: {
      script: `NODE_ENV=production ${cypressPreEnv} \
          cypress run ${cypressPostEnv}`,
      description: "e2e: cypress 'run', javascript app in production",
    },
    po: {
      script: `NODE_ENV=production ${cypressPreEnv} \
          cypress open ${cypressPostEnvOpen}`,
      description: "e2e: cypress 'open', javascript app in production",
    },
  },
};
