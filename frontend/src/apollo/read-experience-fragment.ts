/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { EXPERIENCE_FRAGMENT } from "../graphql/experience.gql";
import { entriesPaginationVariables } from "../graphql/entry.gql";
import { makeApolloCacheRef } from "./resolvers";

export function readExperienceFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const options = {
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_FRAGMENT,
    fragmentName: "ExperienceFragment",
    variables: entriesPaginationVariables,
  };

  const experience = cache.readFragment<ExperienceFragment>(options);
  return experience;
}
