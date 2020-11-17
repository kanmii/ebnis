/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { includePackage } = require("nps-utils");

const packagesPath = path.resolve(".", "packages");

const deployApp = "cra";
const distAbsPath = path.join(packagesPath, `${deployApp}/build`);

function makePackagePath(packageName) {
  return path.resolve(packagesPath, packageName, "package-scripts");
}

const webUrl = process.env.WEB_URL;

module.exports = {
  scripts: {
    cra: includePackage({ path: makePackagePath("cra") }),
    cy: includePackage({ path: makePackagePath("cy") }),
    cm: includePackage({ path: makePackagePath("commons") }),
    deploy: {
      netlify: `node -e 'require("./package-scripts").netlify()'`,
      l: {
        script: `yarn start ${deployApp}.build && yarn start ${deployApp}.serve`,
        description: `Test production build locally, manually,
          serving using 'yarn ${deployApp}.serve'`,
      },
      le: {
        script: `start-server-and-test \
          'yarn start ${deployApp}.serve' ${webUrl} \
          'yarn start cy.hp'`,
        description: `local e2e: start server and test on developer's machine:
            frontend=production`,
      },
    },
    pretty: {
      script: `prettier --write .`,
      description: "prettify",
    },
  },
  netlify() {
    const NetlifyApi = require("netlify");
    const { siteId } = require("./.netlify/state.json");
    const token = process.env.NETLIFY_TOKEN;

    if (!token) {
      throw new Error(`\n"NETLIFY_TOKEN" environment variable required!\n`);
    }

    const netlifyClient = new NetlifyApi(token);

    console.log("\n***", "Deploying to netlify");

    netlifyClient
      .deploy(siteId, distAbsPath, {
        draft: false, // == production
      })
      .then((response) => {
        console.log(response);
      });
  },
};
