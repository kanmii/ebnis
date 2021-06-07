/* eslint-disable @typescript-eslint/no-var-requires */
const { packagesPath } = require("../../_shared/_package-scripts");
const sharedPackagePath = `${packagesPath}/shared`;
const jsxPackagePath = `${packagesPath}/jsx`;

module.exports = {
  mode: "jit",
  purge: [
    `${sharedPackagePath}/src/**/*.{js,ts,jsx,tsx}`,
    `${jsxPackagePath}/src/**/*.{js,ts,jsx,tsx}`,
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
