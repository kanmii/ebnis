/* istanbul ignore file */
import {
  GetDetailExperience,
  GetDetailExperienceVariables,
} from "../graphql/apollo-types/GetDetailExperience";
import { GET_COMPLETE_EXPERIENCE_QUERY } from "../graphql/experience.gql";

export function sammelnZwischengespeicherteErfahrung(erfahrungId: string) {
  const { cache } = window.____ebnis;

  try {
    const data = cache.readQuery<
      GetDetailExperience,
      GetDetailExperienceVariables
    >({
      query: GET_COMPLETE_EXPERIENCE_QUERY,
    });

    return (data && data.getExperience) || undefined;
  } catch (error) {
    return undefined;
  }
}
