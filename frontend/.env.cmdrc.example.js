module.exports = {
  e2eDev: {
    PORT: "3022",
    API_URL: "http://localhost:4022",
    CYPRESS_API_URL: "http://localhost:4022",
    IS_E2E: "true",
    BROWSER: "none",
    EXTEND_ESLINT: true,
    TSC_COMPILE_ON_ERROR: true,
  },
  prod: {
    REACT_APP_API_URL: "http://localhost:6021",
    REACT_APP_REGISTER_SERVICE_WORKER: true,
    API_URL: "http://localhost:4022",
    REGISTER_SERVICE_WORKER: "true",
    NODE_ENV: "production",
    NETLIFY_TOKEN: "abc", // Fpr deployment to netlify
    PORT: "4024", // will be used by 'yarn serve' if testing production locally
  },
  e2eRun: {
    API_URL: "http://localhost:4022",
    CYPRESS_API_URL: "http://localhost:4022",
    IS_E2E: "true",
    NO_LOG: "true",
    BROWSER: "none",
  },
};
