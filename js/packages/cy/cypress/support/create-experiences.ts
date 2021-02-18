import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { CreateExperienceInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { CREATE_EXPERIENCES_MUTATION } from "@eb/cm/src/graphql/experience.gql";
import { CYPRESS_APOLLO_KEY } from "@eb/cm/src/utils/types";
import { mutate } from "./mutate";

export function createOnlineExperience(
  input: CreateExperienceInput,
): Promise<ExperienceCompleteFragment> {
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
