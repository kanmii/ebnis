/* eslint-disable @typescript-eslint/no-var-requires */

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
    default: {
      script: `${cypressPreEnv} cypress open \
           ${cypressPostEnvOpen}`,
      description: `e2e test with frontend in dev mode/electron unless
      browser specified`,
    },
    r: {
      script: `${cypressPreEnv} cypress run ${cypressPostEnv}`,
      description: "e2e: cypress 'run' frontend in development",
    },
    pr: {
      script: `NODE_ENV=production ${cypressPreEnv} \
          cypress run ${cypressPostEnv}`,
      description: "e2e: cypress 'run', frontend in production",
    },
    po: {
      script: `NODE_ENV=production ${cypressPreEnv} \
          cypress open ${cypressPostEnvOpen}`,
      description: "e2e: cypress 'open', frontend in production",
    },
    tc: {
      default: "tsc --project .",
    },
    lint: {
      script: "eslint . --ext .js,.jsx,.ts,.tsx",
      description: "eslint lint this project",
    },
  },
};
