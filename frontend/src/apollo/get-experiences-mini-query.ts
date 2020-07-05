/* istanbul ignore file */
import {
  GetExperienceConnectionMini,
  GetExperienceConnectionMiniVariables,
} from "../graphql/apollo-types/GetExperienceConnectionMini";
import {
  GET_EXPERIENCES_CONNECTION_MINI_QUERY,
  getExperienceConnectionMiniVariables,
} from "../graphql/experience.gql";

export const readOptions = {
  query: GET_EXPERIENCES_CONNECTION_MINI_QUERY,
  variables: getExperienceConnectionMiniVariables,
};

export function getExperiencesMiniQuery() {
  const { cache } = window.____ebnis;
  let getExperiences;

  try {
    const data = cache.readQuery<
      GetExperienceConnectionMini,
      GetExperienceConnectionMiniVariables
    >(readOptions);

    getExperiences = data && data.getExperiences;
  } catch (error) {
    // throw error;
  }

  return getExperiences;
}
