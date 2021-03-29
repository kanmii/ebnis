// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const { getLoader, loaderByName } = require("@craco/craco");
const { packagesPath } = require("../../_shared/_package-scripts");

const jsxPackagePath = `${packagesPath}/jsx`;

module.exports = {
  style: {
    postcss: {
      plugins: [
        require("postcss-advanced-variables"),
        require("postcss-extend-rule"),
        require("postcss-nested"),
        require("tailwindcss"),
        require("autoprefixer"),
      ],
    },
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
        match.loader.include = include.concat[jsxPackagePath];
      }
      return webpackConfig;
    },
  },
};
