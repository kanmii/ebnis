/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const shell = require("shelljs");

const apiUrl = process.env.API_URL;

module.exports = {
  scripts: {
    fgql: `node -e 'require("./package-scripts").fetchGqlTypes()'`,
    lint: {
      script: "eslint . --ext .js,.jsx,.ts,.tsx",
      description: "eslint lint this project",
    },
    tc: {
      default: "tsc --project .",
    },
  },
  fetchGqlTypes() {
    const fetch = require("node-fetch");
    const exec = require("child_process").exec;

    const outputFilename = "./src/graphql/apollo-types/fragment-types.json";

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

    shell.rm("-rf", "src/graphql/apollo-types");

    exec(
      `./node_modules/.bin/apollo client:codegen \
        --endpoint=${apiUrl} \
        --tagName=gql \
        --target=typescript \
        --includes=src/graphql/*.ts \
        --outputFlat=src/graphql/apollo-types
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

            fs.writeFile(outputFilename, JSON.stringify(unionTypes), (err) => {
              if (err) {
                console.error("Error writing fragmentTypes file", err);
              } else {
                console.log("Fragment types successfully extracted!");
              }
            });
          });
      },
    );
  },
};
