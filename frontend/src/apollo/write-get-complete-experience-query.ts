/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { GET_COMPLETE_EXPERIENCE_QUERY } from "../graphql/experience.gql";
import { entriesPaginationVariables } from "../graphql/entry.gql";
import { E2EWindowObject } from "../utils/types";
import {
  GetDetailExperience,
  GetDetailExperienceVariables,
} from "../graphql/apollo-types/GetDetailExperience";

export function writeGetCompleteExperienceQueryToCache(
  experience: ExperienceFragment,
) {
  const { cache } = window.____ebnis;
  const { id } = experience;

  cache.writeQuery<GetDetailExperience, GetDetailExperienceVariables>({
    query: GET_COMPLETE_EXPERIENCE_QUERY,
    data: {
      getExperience: experience,
    },
    variables: {
      id,
      ...entriesPaginationVariables,
    },
  });
}

declare global {
  interface Window {
    ____ebnis: E2EWindowObject;
  }
}
