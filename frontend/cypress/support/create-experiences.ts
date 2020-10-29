import { mutate } from "./mutate";
import { CreateExperienceInput } from "../../src/graphql/apollo-types/globalTypes";
import { CREATE_EXPERIENCES_MUTATION } from "../../src/graphql/experience.gql";
import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "../../src/graphql/apollo-types/CreateExperiences";
import { CYPRESS_APOLLO_KEY } from "../../src/apollo/setup";

export function createOnlineExperience(input: CreateExperienceInput) {
  return mutate<CreateExperiences, CreateExperiencesVariables>({
    mutation: CREATE_EXPERIENCES_MUTATION,
    variables: {
      input: [input],
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
