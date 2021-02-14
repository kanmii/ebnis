const path = require("path");
const { getLoader, loaderByName } = require("@craco/craco");

const absolutePath = path.join(__dirname, "../components");

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
        match.loader.include = include.concat[absolutePath];
      }
      return webpackConfig;
    },
  },
};
