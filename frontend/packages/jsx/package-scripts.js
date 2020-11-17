/* eslint-disable @typescript-eslint/no-var-requires */

module.exports = {
  scripts: {
    lint: {
      script: "eslint . --ext .js,.jsx,.ts,.tsx",
      description: "eslint lint this project",
    },
    tc: {
      default: "tsc --project .",
    },
  },
};
