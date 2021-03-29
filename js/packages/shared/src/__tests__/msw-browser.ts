import { graphql, setupWorker } from "msw";

export const mswGraphql = graphql;
export const mswBrowserWorker = setupWorker();
