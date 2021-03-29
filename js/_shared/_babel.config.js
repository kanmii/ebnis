const { isReact, isTest } = require("../packages/shared/src/env");

module.exports = (api) => {
  // if you don't do this, babel will complain about caching in development
  api.cache(!isTest);

  const plugins = [];

  const presets = [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
    "@babel/preset-typescript",
  ];

  if (isReact) {
    presets.push("@babel/preset-react");
  }

  return {
    presets,
    plugins,
  };
};
