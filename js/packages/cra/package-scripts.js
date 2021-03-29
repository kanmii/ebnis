/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { scripts: commonScripts } = require("../../_shared/_package-scripts");

const distFolderName = "build";
const distAbsPath = path.resolve(__dirname, `./${distFolderName}`);
const reactScript = "craco ";
// const reactScript = "react-scripts";

const env = process.env;
const apiUrl = env.API_URL_ALTERNATE || env.API_URL || "";
const webUrl = env.WEB_URL || "";

const allEnvs = `
  SKIP_PREFLIGHT_CHECK=true \
  REACT_APP_API_URL=${apiUrl} \
  REACT_APP_FRONTEND_APP=cra
`.trim();

// TSC_COMPILE_ON_ERROR=true \
const devEnvs = `
  ${allEnvs} \
  FAST_REFRESH=false \
  BROWSER=none
`.trim();

const test_envs = `
  ${allEnvs} \
  IS_UNIT_TEST=true \
  NODE_ENV=test
`.trim();

const test = `
  ${test_envs} \
  ${reactScript} test \
    --runInBand \
    --pass-with-no-tests
`.trim();

const debugTest = `
    ${test_envs} ${reactScript} \
    --inspect-brk \
    test \
      --runInBand \
      --no-cache \
      --detectOpenHandles
`.trim();

module.exports = {
  scripts: {
    ...commonScripts,
    dev: {
      script: `${devEnvs} ${reactScript} start`,
      description: `Start create react app server for development`,
    },
    build: {
      default: {
        script: `shx rm -rf ${distFolderName} && \
          ${reactScript} build
        `,
        description: "Build the app for production",
      },
    },
    serve: {
      script: `yarn serve --single ${distAbsPath} --listen ${webUrl.replace(
        "http",
        "tcp",
      )}`,
      description: `Serve the app that has been built for production from
        ${webUrl}`,
    },
    t: {
      default: {
        script: test,
        description: "Test and watch create react app",
      },
      t: {
        script: `CI=true \
          ${test} \
            --forceExit`,
      },
      d: {
        script: `CI=true ${debugTest}`,
        description: `Debug create react app test`,
      },
      dw: {
        script: `${debugTest} `,
        description: `Debug and watch create react app test`,
      },
      c: {
        script: `shx rm -rf coverage && \
          CI=true ${test} --runInBand --coverage --forceExit`,
        description: "Test create react app with coverage",
      },
      cw: {
        script: `${test} --coverage`,
        description: "Test create react app with watch and coverage",
      },
    },
  },
};
