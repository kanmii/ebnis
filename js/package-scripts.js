/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve: resolvePath, join: joinPath } = require("path");
const { includePackage } = require("nps-utils");
const { readdirSync, existsSync } = require("fs");

const { CLIENT_APP, API_APP, WEB_URL, IS_E2E } = process.env;

const packagesPath = resolvePath(__dirname, "packages");

const deployApp = "cra";
const distAbsPath = joinPath(packagesPath, `${deployApp}/build`);

let devAppsCommands = "";

const packagesScripts = [
  ["commons", "cm"],
  ["cra", "cra"],
  ["cy", "cy"],
  ["jsx", "jsx"],
].reduce((acc, [packagePath, alias]) => {
  const script = resolvePath(packagesPath, packagePath, "package-scripts");

  if (existsSync(`${script}.js`)) {
    const packageScript = includePackage({ path: script });
    acc[alias] = packageScript;

    if (CLIENT_APP === packagePath || API_APP === packagePath) {
      // It is assumed that every package has a scripts.default
      // If we ever use a javascript backend, then we will use
      // concurrently package
      devAppsCommands += `${packageScript.default.script} `;
    }
  }

  return acc;
}, {});

if (devAppsCommands) {
  packagesScripts.d = {
    script: devAppsCommands,
    description: `Start development server`,
  };
}

const webUrl = WEB_URL;
const isE2E = IS_E2E === "true";

module.exports = {
  scripts: {
    ...packagesScripts,
    deploy: {
      netlify: `node -e 'require("./package-scripts").netlify()'`,
      l: {
        script: `yarn start ${deployApp}.build && yarn start ${deployApp}.serve`,
        description: `Test production build locally, manually,
          serving using 'yarn ${deployApp}.serve'`,
      },
      ler: {
        script: `start-server-and-test \
          'yarn start ${deployApp}.serve' ${webUrl} \
          'yarn start cy.pr'`,
        description: `local e2e run: start server and test on developer's
        machine: javascript app=production`,
      },
      leo: {
        script: `start-server-and-test \
          'yarn start ${deployApp}.serve' ${webUrl} \
          'yarn start cy.po'`,
        description: `local e2e open: start server and test on developer's
        machine: javascript app=production`,
      },
    },
    p: {
      script: `prettier --write .`,
      description: "prettify",
    },
    s: {
      script: `sort-package-json ./package.json \
          && sort-package-json ./packages/**/package.json`,
      description: `Sort package json`,
    },
  },
  netlify() {
    const NetlifyApi = require("netlify");

    const netlifyConfigFolder = isE2E
      ? `./.netlify-staging`
      : `./.netlify-production`;

    console.log("\n\nNetlify config folder is: ", netlifyConfigFolder, "\n\n");

    const { siteId } = require(`${netlifyConfigFolder}/state.json`);
    const token = process.env.NETLIFY_TOKEN;

    if (!token) {
      throw new Error(`\n"NETLIFY_TOKEN" environment variable required!\n`);
    }

    const netlifyClient = new NetlifyApi(token);

    console.log("\n***", "Deploying to netlify\n");

    netlifyClient
      .deploy(siteId, distAbsPath, {
        draft: false, // == production
      })
      .then((response) => {
        console.log(response);
      });
  },
};
