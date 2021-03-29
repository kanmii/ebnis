/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const { resolve: resolvePath } = require("path");
const shell = require("shelljs");
const commonScripts = require("../../_shared/_package-scripts");

const apiUrl = process.env.API_URL;
const genClientOutputRelative = "./src/graphql/apollo-types";
const genClientOutput = resolvePath(__dirname, genClientOutputRelative);

module.exports = {
  scripts: {
    ...commonScripts.scripts,
    gc: {
      script: `node -e 'require("./package-scripts").fetchGqlTypes()' && \
            yarn prettier --write ${genClientOutput}`,
      description: `Generate client graphql typescript types`,
    },
  },
  fetchGqlTypes() {
    const fetch = require("node-fetch");
    const exec = require("child_process").exec;

    const unionTypesOutputFilename =
      "./src/graphql/apollo-types/fragment-types.json";

    const query = `
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
    `;

    shell.rm("-rf", genClientOutput);
    shell.mkdir("-p", genClientOutput);

    exec(
      `./node_modules/.bin/apollo client:codegen \
        --endpoint=${apiUrl} \
        --tagName=gql \
        --target=typescript \
        --includes=src/graphql/*.ts \
        --outputFlat=${genClientOutputRelative}
      `,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }

        console.log("\n");

        if (stdout) {
          console.log(`stdout:\n${stdout}`);
        }

        if (stderr) {
          console.log(`stderr:\n${stderr}`);
        }

        fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variables: {},
            query,
          }),
        })
          .then((result) => result.json())
          .then((result) => {
            // here we're filtering out any type information unrelated to unions or interfaces

            const unionTypes = result.data.__schema.types.reduce(
              (acc, { possibleTypes, name }) => {
                if (possibleTypes) {
                  acc[name] = possibleTypes.map(
                    ({ name: possibleTypeName }) => possibleTypeName,
                  );
                }

                return acc;
              },
              {},
            );

            fs.writeFile(
              unionTypesOutputFilename,
              JSON.stringify(unionTypes),
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
