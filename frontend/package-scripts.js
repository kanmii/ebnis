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
const isE2E = process.env.IS_E2E === "true";

module.exports = {
  scripts: {
    cra: includePackage({ path: makePackagePath("cra") }),
    cy: includePackage({ path: makePackagePath("cy") }),
    cm: includePackage({ path: makePackagePath("commons") }),
    jsx: includePackage({ path: makePackagePath("jsx") }),
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
        machine: frontend=production`,
      },
      leo: {
        script: `start-server-and-test \
          'yarn start ${deployApp}.serve' ${webUrl} \
          'yarn start cy.po'`,
        description: `local e2e open: start server and test on developer's
        machine: frontend=production`,
      },
    },
    pretty: {
      script: `prettier --write .`,
      description: "prettify",
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
