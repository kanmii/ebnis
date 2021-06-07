// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const { getLoader, loaderByName } = require("@craco/craco");
const { packagesPath } = require("../../_shared/_package-scripts");

const sharedPackagePath = `${packagesPath}/shared`;
const jsxPackagePath = `${packagesPath}/jsx`;

const _postcss = require(`${sharedPackagePath}/postcss.config.js`);
const postcss = {
  ..._postcss,
};

postcss.plugins = postcss.pluginStrings.reduce((acc, plugin) => {
  acc.push(require(plugin));
  return acc;
}, []);

module.exports = {
  style: {
    postcss,
  },
  typescript: {
    enableTypeChecking: false,
  },
  eslint: {
    enable: false,
  },
  webpack: {
    alias: {},
    plugins: [],
    configure: (webpackConfig) => {
      const { isFound, match } = getLoader(
        webpackConfig,
        loaderByName("babel-loader"),
      );
      if (isFound) {
        const include = Array.isArray(match.loader.include)
          ? match.loader.include
          : [match.loader.include];

        match.loader.include = include.concat(
          sharedPackagePath,
          jsxPackagePath,
        );
      }
      return webpackConfig;
    },
  },
};
