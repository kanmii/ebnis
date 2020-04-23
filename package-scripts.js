/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");
const pkg = require("./package.json");
const settings = require("./.env-cmdrc");
const {
  apiUrlReactEnv,
  regServiceWorkerReactEnv,
  noLogReactEnv,
} = require("./src/utils/env-variables");

const distFolderName = "build";
const distAbsPath = path.resolve(__dirname, `./${distFolderName}`);
const reactScript = "react-app-rewired";

const test = `env-cmd -e test yarn ${reactScript} test --runInBand`;
const testWatch = test + " --watch";
const testWatchCoverage = testWatch + " --coverage";

function buildFn(flag) {
  const reactBuild = `yarn ${reactScript} build`;
  const preBuild = `rimraf ${distFolderName}`;
  const startSw = "yarn start serviceWorker";

  let env;

  switch (flag) {
    case "prod":
      env = "prod";
      break;
    default:
      throw new Error("Please specify environment (e.g. 'prod') to build for!");
  }

  const envStmt = `env-cmd -e ${env}`;

  return `${preBuild} && \
  ${apiUrlReactEnv}=${settings.prod.API_URL} \
    ${regServiceWorkerReactEnv}=${settings.prod.register_service_worker} \
    ${noLogReactEnv}=true \
    ${envStmt} ${reactBuild} && \
  ${envStmt} ${startSw}
`;
}

const startServer = "yarn react-scripts start";

module.exports = {
  scripts: {
    dev: `REACT_APP_API_URL=${settings.dev.API_URL} env-cmd -e dev ${startServer}`,
    e2eDev: `REACT_APP_API_URL=${settings.e2eDev.API_URL} env-cmd -e e2eDev ${startServer}`,
    build: {
      deploy: buildFn("prod") + "  && yarn start netlify",
      serve: {
        prod: `${buildFn("prod")} yarn start serve`,
      },
      prod: buildFn("prod"),
    },
    test: {
      default: test,
      w: testWatch,
      wc: testWatchCoverage,
      c: "rimraf coverage && " + test + " --coverage",
    },
    serve: `serve -s ${distFolderName} -l ${settings.serve.port}`,
    serviceWorker: `node -e 'require("./package-scripts").serviceWorker()'`,
    netlify: `node -e 'require("./package-scripts").netlify()'`,
    cy: {
      open: "env-cmd -e e2eDev cypress open",
      run: "server-test ",
    },
    typeCheck: {
      default: "tsc --project .",
      cypress: "tsc --project ./cypress",
    },
    lint: "eslint . --ext .js,.jsx,.ts,.tsx",
    gqlTypes: {
      e: "env-cmd -e e2eDev yarn start fetchGqlTypes",
      d: "env-cmd -e dev yarn start fetchGqlTypes",
    },
    fetchGqlTypes: `node -e 'require("./package-scripts").fetchGqlTypes()'`,
  },
  serviceWorker() {
    const { copyWorkboxLibraries, injectManifest } = require("workbox-build");

    const workboxPath =
      "workbox-v" + pkg.devDependencies["workbox-build"].match(/(\d.+)/)[1];

    // remove unnecessary files generated by CRA
    shell.rm([
      `${distAbsPath}/service-worker.js`,
      `${distAbsPath}/static/js/*.LICENSE.txt`,
    ]);

    const swSrc = "service-worker.js";
    const swSrcAbsPath = path.resolve(__dirname, swSrc);
    const swTemplateSrc = path.resolve(__dirname, "service-worker.template.js");

    const swCode = fs
      .readFileSync(swTemplateSrc, "utf8")
      .replace(/%workboxPath%/g, workboxPath);

    fs.writeFileSync(swSrcAbsPath, swCode);

    copyWorkboxLibraries(distAbsPath);

    console.log(
      `\n*** copied workbox runtime libraries to "${path.resolve(
        distAbsPath,
        workboxPath,
      )}".`,
    );

    injectManifest({
      swSrc,
      swDest: `${distFolderName}/sw.js`,
      globDirectory: distFolderName,
      globPatterns: [
        "**/*.{js,css,png,svg,jpg,jpeg,ico,html,json}", //
      ],
      globIgnores: ["workbox-v*", "*.map", "precache-manifest.*"],
      // dontCacheBustURLsMatching: /(\.js$|\.css$|favicon.+ico$|icon-\d+.+png$)/,
    }).then(({ count, filePaths, size, warnings }) => {
      console.log(
        `\n*** ${count} files were preCached:\n\t${filePaths.join(
          "\t\n",
        )}\n*** total: ${size} bytes\n`,
      );

      if (warnings.length) {
        console.warn("--------WARNINGS-------\n", warnings, "\n");
      }

      shell.rm(swSrcAbsPath);
    });
  },
  netlify() {
    const NetlifyApi = require("netlify");
    const { siteId, token } = require("./.netlify/state.json");

    const netlifyClient = new NetlifyApi(token);

    console.log("\n***", "Deploying to netlify");

    netlifyClient
      .deploy(siteId, `./${distFolderName}`, {
        draft: false, // == production
      })
      .then((response) => {
        console.log(response);
      });
  },
  fetchGqlTypes() {
    const fetch = require("node-fetch");
    const exec = require("child_process").exec;

    shell.rm("-rf", "src/graphql/apollo-types");
    const endpoint = process.env.API_URL;

    exec(
      `./node_modules/.bin/apollo codegen:generate --endpoint=${endpoint} --tagName=gql --target=typescript --includes=src/graphql/*.ts --outputFlat=src/graphql/apollo-types`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variables: {},
            query: `
      {
        __schema {
          types {
            kind
            name
            possibleTypes {
              name
            }
          }
        }
      }
    `,
          }),
        })
          .then((result) => result.json())
          .then((result) => {
            // here we're filtering out any type information unrelated to unions or interfaces
            const filteredData = result.data.__schema.types.filter(
              (type) => type.possibleTypes !== null,
            );
            result.data.__schema.types = filteredData;
            fs.writeFile(
              "./src/graphql/apollo-types/fragment-types.json",
              JSON.stringify(result.data),
              (err) => {
                if (err) {
                  console.error("Error writing fragmentTypes file", err);
                } else {
                  console.log("Fragment types successfully extracted!");
                }
              },
            );
          });
      },
    );
  },
};
