// const rewireReactHotLoader = require("react-app-rewire-hot-loader");

module.exports = function override(config, env) {
  // config = rewireReactHotLoader(config, env);

  // Let Babel compile outside of src/.
  // Solves: Module parse failed: Unexpected token
  // when we try to import from mono repo @ebnis/commons
  const tsRule = config.module.rules[1].oneOf[2];
  tsRule.include = undefined;
  tsRule.exclude = /node_modules/;

  return config;
};
