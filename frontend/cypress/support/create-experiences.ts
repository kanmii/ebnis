import { mutate } from "./mutate";
import { CreateExperienceInput } from "../../src/graphql/apollo-types/globalTypes";
import { CREATE_EXPERIENCES_MUTATION } from "../../src/graphql/experience.gql";
import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "../../src/graphql/apollo-types/CreateExperiences";
import { ExperienceFragment } from "../../src/graphql/apollo-types/ExperienceFragment";
import {
  CreateExperienceOfflineMutation,
  CREATE_OFFLINE_EXPERIENCE_MUTATION,
} from "../../src/components/NewExperience/new-experience.resolvers";
import { entriesPaginationVariables } from "../../src/graphql/entry.gql";
import { CYPRESS_APOLLO_KEY } from "../../src/apollo/setup";

export function createOnlineExperience(input: CreateExperienceInput) {
  return mutate<CreateExperiences, CreateExperiencesVariables>({
    mutation: CREATE_EXPERIENCES_MUTATION,
    variables: {
      input: [input],
      ...entriesPaginationVariables,
    },
  }).then((result) => {
    const validResponses = (result &&
      result.data &&
      result.data.createExperiences) as {};

    const experience = (validResponses[0] as CreateExperiences_createExperiences_ExperienceSuccess)
      .experience;

    const persistor = Cypress.env(CYPRESS_APOLLO_KEY).persistor;

    return persistor.persist().then(() => {
      return experience;
    });
  });
}

export function createOfflineExperience(input: CreateExperienceInput) {
  return mutate<CreateExperienceOfflineMutation, CreateExperiencesVariables>({
    mutation: CREATE_OFFLINE_EXPERIENCE_MUTATION,
    variables: {
      input: [input],
      ...entriesPaginationVariables,
    },
  }).then((result) => {
    const data = result && result.data && result.data.createOfflineExperience;

    let experience: ExperienceFragment | null = null;

    if (data) {
      if (data.__typename === "ExperienceSuccess") {
        experience = data.experience;

        const persistor = Cypress.env(CYPRESS_APOLLO_KEY).persistor;

        return persistor.persist().then(() => {
          return experience;
        });
      }
    }

    expect(experience).not.eq(null);

    return null;
  });
}
