/* eslint-disable @typescript-eslint/no-explicit-any */
import { graphql } from "msw";
import { GetExperienceAndEntriesDetailView } from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";

export function getMswListExperiencesGql(
  data: GetExperienceAndEntriesDetailView,
) {
  return graphql.query("GetExperienceAndEntriesDetailView", (req, res, ctx) => {
    return res(ctx.data(data as any));
  });
}

export function getMswExperienceCommentsGql(data: any) {
  return graphql.query("GetExperienceComments", (req, res, ctx) => {
    return res(ctx.data(data as any));
  });
}
