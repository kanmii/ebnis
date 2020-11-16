/* istanbul ignore file */
import {
  GetExperienceConnectionMini,
  GetExperienceConnectionMiniVariables,
} from "@ebnis/commons/src/graphql/apollo-types/GetExperienceConnectionMini";
import { GET_EXPERIENCES_CONNECTION_MINI_QUERY } from "@ebnis/commons/src/graphql/experience.gql";

export const readOptions = {
  query: GET_EXPERIENCES_CONNECTION_MINI_QUERY,
};

export function getExperiencesMiniQuery() {
  const { cache } = window.____ebnis;
  let getExperiences;

  try {
    const data = cache.readQuery<
      GetExperienceConnectionMini,
      GetExperienceConnectionMiniVariables
    >({
      query: GET_EXPERIENCES_CONNECTION_MINI_QUERY,
    });

    getExperiences = data && data.getExperiences;
  } catch (error) {
    // throw error;
  }

  return getExperiences;
}

export function makeGetExperienceApolloCacheKey(id: string) {
  return `getExperience({"id":"${id}"})`;
}
