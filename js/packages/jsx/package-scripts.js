const {
  scripts,
  getFromRootOrPackage,
} = require("../../_shared/_package-scripts");

const jest = getFromRootOrPackage("jsx", "node_modules/.bin/jest");

const env = process.env;
const FRONT_END_APP = env.FRONT_END_APP || "cra";

const envs = `
  NODE_ENV=test \
  REACT_APP_FRONTEND_APP=${FRONT_END_APP}
`.trim();

const testScript = `
    ${envs} \
    ${jest} \
      --runInBand \
      --pass-with-no-tests
`.trim();

module.exports = {
  scripts: {
    ...scripts,
    t: {
      default: {
        script: `${testScript} --watch`,
        description: `run test in watch mode`,
      },
      t: {
        script: `${testScript}`,
        description: `run test in none watch mode`,
      },
      c: {
        script: `${testScript} --coverage`,
        description: `test with coverage`,
      },
      d: {
        script: `${envs} \
          node
            --inspect-brk \
            ${jest} \
              --runInBand \
              --pass-with-no-tests
              --no-cache \
              --detectOpenHandles`,
        description: `debug test`,
      },
    },
  },
};
