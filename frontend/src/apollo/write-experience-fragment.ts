/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { EXPERIENCE_FRAGMENT } from "../graphql/experience.gql";
import { entriesPaginationVariables } from "../graphql/entry.gql";
import { makeApolloCacheRef } from "./resolvers";

export function writeExperienceFragmentToCache(experience: ExperienceFragment) {
  const { id } = experience;
  const { cache } = window.____ebnis;

  cache.writeFragment({
    fragment: EXPERIENCE_FRAGMENT,
    fragmentName: "ExperienceFragment",
    id: makeApolloCacheRef("Experience", id),
    data: experience,
    variables: entriesPaginationVariables,
  });
}
