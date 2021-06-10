const { packagesPath } = require("../../_shared/_package-scripts");

const sharedPackagePath = `${packagesPath}/shared`;
const _config = require(`${sharedPackagePath}/tailwind.config.js`);

const config = {
  ..._config,
};

config.purge = [
  ...config.purge,
  "./src/**/*.{js,jsx,ts,tsx}",
  "./public/index.html",
];

module.exports = config;
