/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve: resolvePath } = require("path");
const { includePackage } = require("nps-utils");
const { existsSync } = require("fs");

const commonScripts = require("./_shared/_package-scripts");
const packagesPath = resolvePath(__dirname, "packages");

const p = {
  shared: "shared",
  cra: "cra",
  cy: "cypress",
  jsx: "jsx",
};

const packagesScripts = Object.entries(p).reduce(
  (acc, [alias, packagePath]) => {
    const script = resolvePath(packagesPath, packagePath, "package-scripts");

    if (existsSync(`${script}.js`)) {
      const packageScript = includePackage({ path: script });
      acc[alias || packagePath] = packageScript;
    }

    return acc;
  },
  {},
);

module.exports = {
  scripts: {
    ...commonScripts.scripts,
    ...packagesScripts,
    tc: {
      script: `yarn start \
        cra.tc \
        shared.tc \
        jsx.tc \
        cy.tc
      `,
      description: "type check project packages in turn",
    },
    lint: {
      script: `yarn start \
        cra.lint \
        shared.lint \
        jsx.lint \
        cy.lint
      `,
      description: "type check project packages in turn",
    },
    test: {
      script: `yarn start \
        jsx.t.t
      `,
      description: "run tests",
    },
    s: {
      script: `sort-package-json \
        ./package.json \
        ./packages/*/package.json
      `,
      description: `Sort package json`,
    },
    all: {
      script: `yarn start s p lint tc`,
      description: "sort prettier lint typecheck",
    },
  },
};
