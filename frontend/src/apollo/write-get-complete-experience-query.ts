/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  GET_EXPERIENCE_QUERY,
} from "../graphql/experience.gql";
import { E2EWindowObject } from "../utils/types";
import {
  GetExperience,
  GetExperienceVariables,
} from "../graphql/apollo-types/GetExperience";

export function writeGetExperienceQueryToCache(
  experience: ExperienceFragment,
) {
  const { cache } = window.____ebnis;
  const { id } = experience;

  cache.writeQuery<GetExperience, GetExperienceVariables>({
    query: GET_EXPERIENCE_QUERY,
    data: {
      getExperience: experience,
    },
    variables: {
      id,
    },
  });
}

declare global {
  interface Window {
    ____ebnis: E2EWindowObject;
  }
}
