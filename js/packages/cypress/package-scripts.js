/* eslint-disable @typescript-eslint/no-var-requires */

const { scripts: commonScripts } = require("../../_shared/_package-scripts");

module.exports = {
  scripts: {
    ...commonScripts,
    default: {
      script: `cypress open`,
      description: `cypress test in non headless browser`,
    },
    r: {
      script: `CI=true cypress run`,
      description: `cypress test in headless browser`,
    },
  },
};
