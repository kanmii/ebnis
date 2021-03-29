const { resolve: resolvePath } = require("path");
const babelJest = require("babel-jest");

module.exports = babelJest.createTransformer({
  configFile: resolvePath(__dirname, "./_babel.config.js"),
});
