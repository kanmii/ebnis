import { mutate } from "./mutate";
import { CreateExperienceInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { CREATE_EXPERIENCES_MUTATION } from "@eb/cm/src/graphql/experience.gql";
import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import { CYPRESS_APOLLO_KEY } from "@eb/cra/src/apollo/setup";
import { ExperienceFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceFragment";

export function createOnlineExperience(
  input: CreateExperienceInput,
): Promise<ExperienceFragment> {
  return mutate<CreateExperiences, CreateExperiencesVariables>({
    mutation: CREATE_EXPERIENCES_MUTATION,
    variables: {
      input: [input],
    },
  }).then((result) => {
    const validResponses = (result &&
      result.data &&
      result.data
        .createExperiences) as CreateExperiences_createExperiences_ExperienceSuccess[];

    const experience = (validResponses[0] as CreateExperiences_createExperiences_ExperienceSuccess)
      .experience;

    const persistor = Cypress.env(CYPRESS_APOLLO_KEY).persistor;

    return persistor.persist().then(() => {
      return experience;
    });
  });
}
