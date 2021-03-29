/* eslint-disable @typescript-eslint/no-explicit-any */
/* istanbul ignore file */
import { ApolloError } from "@apollo/client/core";
import { graphql } from "msw";
import { CreateExperiences } from "../graphql/apollo-types/CreateExperiences";
import { DeleteExperiences } from "../graphql/apollo-types/DeleteExperiences";
import { GetEntriesDetailView } from "../graphql/apollo-types/GetEntriesDetailView";
import { GetExperienceAndEntriesDetailView } from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { GetExperienceComments } from "../graphql/apollo-types/GetExperienceComments";
import { GetExperiencesConnectionListView } from "../graphql/apollo-types/GetExperiencesConnectionListView";
import { LoginMutation } from "../graphql/apollo-types/LoginMutation";
import { PreFetchExperiences } from "../graphql/apollo-types/PreFetchExperiences";
import { UpdateExperiencesOnline } from "../graphql/apollo-types/UpdateExperiencesOnline";

const { query, mutation } = graphql;

export function getExperienceAndEntriesDetailViewGqlMsw(
  data: Partial<GetExperienceAndEntriesDetailView> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperienceAndEntriesDetailView", data);
}

export function getEntriesDetailViewGqlMsw(
  data: Partial<GetEntriesDetailView> | ApolloError,
) {
  return execGraphqlOperation(query, "GetEntriesDetailView", data);
}

export function getExperienceCommentsGqlMsw(
  data: Partial<GetExperienceComments> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperienceComments", data);
}

export function updateExperiencesMswGql(
  data: Partial<UpdateExperiencesOnline> | ApolloError,
) {
  return execGraphqlOperation(mutation, "UpdateExperiencesOnline", data);
}

export function loginMswGql(data: Partial<LoginMutation> | ApolloError) {
  return execGraphqlOperation(mutation, "LoginMutation", data);
}

export function getPreFetchExperiencesMswGql(
  data: Partial<PreFetchExperiences> | ApolloError,
) {
  return execGraphqlOperation(query, "PreFetchExperiences", data);
}

export function getExperiencesConnectionListViewMswGql(
  data: Partial<GetExperiencesConnectionListView> | ApolloError,
) {
  return execGraphqlOperation(query, "GetExperiencesConnectionListView", data);
}

export function deleteExperiencesMswGql(
  data: Partial<DeleteExperiences> | ApolloError,
) {
  return execGraphqlOperation(mutation, "DeleteExperiences", data);
}

export function createExperiencesMswGql(
  data: Partial<CreateExperiences> | ApolloError,
) {
  return execGraphqlOperation(mutation, "CreateExperiences", data);
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
