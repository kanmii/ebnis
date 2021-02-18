import { setupWorker, graphql } from "msw";

export const mswGraphql = graphql;
export const mswBrowserWorker = setupWorker();
