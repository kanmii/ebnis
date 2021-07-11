import {
  CreateExperiences,
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "@eb/shared/src/graphql/apollo-types/CreateExperiences";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { CreateExperienceInput } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { CREATE_EXPERIENCES_MUTATION } from "@eb/shared/src/graphql/experience.gql";
import { StateValue } from "@eb/shared/src/utils/types";
import { mutate } from "./mutate";

export async function createOnlineExperienceCy(
  input: CreateExperienceInput[],
): Promise<ExperienceDCFragment[]> {
  const result = await mutate<CreateExperiences, CreateExperiencesVariables>({
    mutation: CREATE_EXPERIENCES_MUTATION,
    variables: {
      input,
    },
  });

  const validResponses = (result &&
    result.data &&
    result.data
      .createExperiences) as CreateExperiences_createExperiences_ExperienceSuccess[];

  const persistor = Cypress.env(StateValue.globalKey).persistor;

  await persistor.persist();

  return validResponses.map((v) => v.experience);
}
