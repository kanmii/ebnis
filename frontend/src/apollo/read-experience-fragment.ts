/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { EXPERIENCE_FRAGMENT } from "../graphql/experience.gql";
import { makeApolloCacheRef } from "./resolvers";

export function readExperienceFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const options = {
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_FRAGMENT,
    fragmentName: "ExperienceFragment",
  };

  const experience = cache.readFragment<ExperienceFragment>(options);
  return experience;
}
