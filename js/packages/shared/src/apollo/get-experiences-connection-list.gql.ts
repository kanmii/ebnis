/* istanbul ignore file */
import { ApolloQueryResult, FetchPolicy } from "@apollo/client";
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  GetExperiencesConnectionListView,
  GetExperiencesConnectionListViewVariables,
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences_edges,
} from "../graphql/apollo-types/GetExperiencesConnectionListView";
import { GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY } from "../graphql/experience.gql";

export const getCachedExperiencesConnectionListFieldPolicy: FieldPolicy<
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences
> = {
  keyArgs: false,

  merge(existing, incoming) {
    if (!incoming) {
      return existing as GetExperiencesConnectionListView_getExperiences;
    }

    if (!existing) {
      return incoming as GetExperiencesConnectionListView_getExperiences;
    }



    const edgesExisting = (existing.edges ||
      []) as GetExperiencesConnectionListView_getExperiences_edges[];

    const edgesIncoming = (incoming.edges ||
      []) as GetExperiencesConnectionListView_getExperiences_edges[];

    const newIncoming: GetExperiencesConnectionListView_getExperiences = {
      ...incoming,
      edges: [...edgesExisting, ...edgesIncoming],
    };

    return newIncoming;
  },

  read(existing) {
    if (!existing) {
      return existing;
    }

    return existing;
  },
};

export function getExperienceConnectionListView(
  fetchPolicy?: FetchPolicy,
  pagination: GetExperiencesConnectionListViewVariables = {},
) {
  const { client } = window.____ebnis;

  return client.query<
    GetExperiencesConnectionListView,
    GetExperiencesConnectionListViewVariables
  >({
    query: GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY,
    variables: pagination,
    fetchPolicy: fetchPolicy || "network-only",
  });
}

export type GetExperiencesConnectionListViewQueryResult =
  ApolloQueryResult<GetExperiencesConnectionListView>;

export type GetExperienceConnectionListViewFunction = {
  getExperienceConnectionListView: typeof getExperienceConnectionListView;
};
