const { resolve: resolvePath } = require("path");

const { getFromRootOrPackage } = require("./_package-scripts");

const { isReact } = require("../packages/shared/src/env");

const jestBabelTransform = resolvePath(__dirname, "./jest-babel-transform.js");

const setupFiles = [];
let testEnvironment = "node";

if (isReact) {
  setupFiles.push(
    getFromRootOrPackage("jsx", "node_modules/react-app-polyfill/jsdom.js"),
  );

  testEnvironment = "jsdom";
}

module.exports = {
  displayName: "",
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    "!src/register-service-worker.*",
    "!src/react-app-env.d.ts",
  ],
  coverageDirectory: "coverage",
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
  },
  moduleFileExtensions: ["js", "ts", "tsx", "jsx"],
  testEnvironment,
  testMatch: [
    "<rootDir>/src/__tests__/**/*.{js,jsx,ts,tsx}",
    // "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  setupFiles,
  transformIgnorePatterns: [
    "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
  transform: {
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": jestBabelTransform,
    "^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)": "identity-obj-proxy",
  },
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules.*",
    "<rootDir>/package.+",
    "<rootDir>/build/",
    "<rootDir>/.+.config.js",
    "<rootDir>/coverage/",
    "<rootDir>/public/",
    "<rootDir>/reportWebVitals.+",
    "<rootDir>/service-worker.+",
    "<rootDir>/serviceWorkerRegistration.*",
    "__data__.*\\.json",
  ],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
  roots: ["<rootDir>", "<rootDir>/../shared/src/"],
};
