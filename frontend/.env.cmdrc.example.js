module.exports = {
  dev: {
    API_URL: "http://localhost:4023",
    BROWSER: "none",
    EXTEND_ESLINT: true,
    TSC_COMPILE_ON_ERROR: true,
  },
  e2eDev: {
    PORT: "3022",
    API_URL: "http://localhost:4022",
    CYPRESS_API_URL: "http://localhost:4022",
    IS_E2E: "true",
    BROWSER: "none",
    EXTEND_ESLINT: true,
    TSC_COMPILE_ON_ERROR: true,
  },
  test: {
    API_URL: "http://localhost:4022",
    IS_UNIT_TEST: "true",
    NODE_ENV: "test",
  },
  prod: {
    API_URL: "http://localhost:4022",
    register_service_worker: "true",
    NODE_ENV: "production",
  },
  e2eRun: {
    API_URL: "http://localhost:4022",
    CYPRESS_API_URL: "http://localhost:4022",
    IS_E2E: "true",
    NO_LOG: "true",
    BROWSER: "none",
  },
  serve: {
    port: "3022",
  },
};
