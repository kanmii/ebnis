/* istanbul ignore file */
import {
  GetExperiencesConnectionListView,
  GetExperiencesConnectionListViewVariables,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
import { GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY } from "@eb/shared/src/graphql/experience.gql";

export const readOptions = {
  query: GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY,
};

export function getCachedExperiencesConnectionListView() {
  const { cache } = window.____ebnis;
  let getExperiences;

  try {
    const data = cache.readQuery<
      GetExperiencesConnectionListView,
      GetExperiencesConnectionListViewVariables
    >({
      query: GET_EXPERIENCES_CONNECTION_LIST_VIEW_QUERY,
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
