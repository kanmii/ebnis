import {
  PreFetchExperiences,
  PreFetchExperiencesVariables,
} from "../graphql/apollo-types/PreFetchExperiences";
import { PRE_FETCH_EXPERIENCES_QUERY } from "../graphql/experience.gql";
import { getIsConnected } from "../utils/connections";

export function preFetchExperiences(variables: PreFetchExperiencesVariables) {
  if (!getIsConnected()) {
    return;
  }

  const { client, cache } = window.____ebnis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataProxy = cache as any;
  const data = dataProxy.data.data.ROOT_QUERY;

  if (data.preFetchExperiences) {
    return;
  }

  return client.query<PreFetchExperiences, PreFetchExperiencesVariables>({
    query: PRE_FETCH_EXPERIENCES_QUERY,
    variables,
    fetchPolicy: "network-only",
  });
}
