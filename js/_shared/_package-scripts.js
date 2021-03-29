const { resolve: resolvePath } = require("path");
const { existsSync } = require("fs");

const prettierIgnoreFile = resolvePath(__dirname, "../.prettierignore");
const rootPath = resolvePath(__dirname, "..");
const packagesPath = `${rootPath}/packages`;

module.exports = {
  scripts: {
    tc: {
      default: "tsc --noEmit true --project .",
      description: `typecheck this project`,
    },
    lint: {
      script: `eslint . \
        --ext .js,.jsx,.ts,.tsx \
        --ignore-pattern **build** \
        --ignore-pattern **__sapper__** \
        --max-warnings=0
      `,
      description: "eslint lint this project",
    },
    p: {
      script: `prettier \
        --ignore-path ${prettierIgnoreFile} \
        --write \
        .`,
      description: "prettify",
    },
    s: {
      script: `sort-package-json package.json`,
      description: `Sort package json`,
    },
  },
  rootPath,
  packagesPath,
  getFromRootOrPackage,
};

/**
 * @param {string} packageName
 * @param {string} path
 * @returns {string}
 */
function getFromRootOrPackage(packageName, path) {
  const pathFromRoot = `${rootPath}/${path}`;

  if (existsSync(pathFromRoot)) {
    return pathFromRoot;
  }

  return `${rootPath}/packages/${packageName}/${path}`;
}
