import {
  PreFetchExperiences,
  PreFetchExperiencesVariables,
} from "../graphql/apollo-types/PreFetchExperiences";
import { PRE_FETCH_EXPERIENCES_QUERY } from "../graphql/experience.gql";

export function preFetchExperiences(variables: PreFetchExperiencesVariables) {
  const { client } = window.____ebnis;

  return client.query<PreFetchExperiences, PreFetchExperiencesVariables>({
    query: PRE_FETCH_EXPERIENCES_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}
