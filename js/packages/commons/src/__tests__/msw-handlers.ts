/* eslint-disable @typescript-eslint/no-explicit-any */
/* istanbul ignore file */
import { ApolloError } from "@apollo/client/core";
import { graphql } from "msw";
import { GetExperienceAndEntriesDetailView } from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { GetExperienceComments } from "../graphql/apollo-types/GetExperienceComments";
import { UpdateExperiencesOnline } from "../graphql/apollo-types/UpdateExperiencesOnline";

const { query, mutation } = graphql;

export function getMswListExperiencesGql(
  data: Partial<GetExperienceAndEntriesDetailView> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperienceAndEntriesDetailView", data);
}

export function getMswExperienceCommentsGql(
  data: Partial<GetExperienceComments> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperienceComments", data);
}

export function updateMswExperiencesGql(
  data: Partial<UpdateExperiencesOnline> | ApolloError,
) {
  return execGraphqlOperation(mutation, "UpdateExperiencesOnline", data);
}

function execGraphqlOperation<TData>(
  operationFunc: Query | Mutation,
  operationName: string,
  data: TData | ApolloError,
) {
  return operationFunc<TData>(operationName, (req, res, ctx) => {
    if (data instanceof ApolloError) {
      const { graphQLErrors, networkError } = data;

      if (graphQLErrors) {
        return res(ctx.errors(graphQLErrors as any));
      }

      if (networkError) {
        return res.networkError(networkError.message);
      }
    }

    return res(ctx.data(data as any));
  });
}

type Query = typeof query;
type Mutation = typeof mutation;
