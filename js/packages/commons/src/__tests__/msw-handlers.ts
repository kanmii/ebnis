/* eslint-disable @typescript-eslint/no-explicit-any */
/* istanbul ignore file */
import { ApolloError } from "@apollo/client/core";
import { graphql } from "msw";
import { GetExperienceAndEntriesDetailView } from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { GetExperienceComments } from "../graphql/apollo-types/GetExperienceComments";
import { GetExperiencesConnectionListView } from "../graphql/apollo-types/GetExperiencesConnectionListView";
import { LoginMutation } from "../graphql/apollo-types/LoginMutation";
import { PreFetchExperiences } from "../graphql/apollo-types/PreFetchExperiences";
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

export function loginMsw(data: Partial<LoginMutation> | ApolloError) {
  return execGraphqlOperation(mutation, "LoginMutation", data);
}

export function getMswPreFetchExperiences(
  data: Partial<PreFetchExperiences> | ApolloError,
) {
  return execGraphqlOperation(query, "PreFetchExperiences", data);
}

export function getMswExperienceConnectionListView(
  data: Partial<GetExperiencesConnectionListView> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperiencesConnectionListView", data);
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
