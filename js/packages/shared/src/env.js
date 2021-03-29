const NODE_ENV = process.env.NODE_ENV;
const isDevEnv = NODE_ENV === "development";

const FRONTEND_APP =
  process.env.REACT_APP_FRONTEND_APP ||
  process.env.NEXT_PUBLIC_FRONTEND_APP ||
  process.env.FRONTEND_APP;

module.exports = {
  FRONTEND_APP,
  isDevEnv,
  isReact: FRONTEND_APP === "cra",
  isSSR: FRONTEND_APP === "nextjs",
  isTest: NODE_ENV === "test",
};
