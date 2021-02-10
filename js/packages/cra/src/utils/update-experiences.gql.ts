import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-list-view-query";
import { getCachedExperienceDetailView } from "../apollo/get-detailed-experience-query";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { UpdateExperienceInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { UpdateExperienceSomeSuccessFragment } from "@eb/cm/src/graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
} from "@eb/cm/src/graphql/apollo-types/UpdateExperiencesOnline";
import { UPDATE_EXPERIENCES_ONLINE_MUTATION } from "@eb/cm/src/graphql/experience.gql";
import { updateExperiencesManualCacheUpdate } from "../apollo/update-experiences-manual-cache-update";
import { CommonError } from "../utils/types";

export async function updateExperiencesMutation({
  input,
  onUpdateSuccess,
  onError,
}: UpdateExperiencesMutationFn) {
  const { client } = window.____ebnis;

  try {
    const response = await client.mutate<
      UpdateExperiencesOnline,
      UpdateExperiencesOnlineVariables
    >({
      mutation: UPDATE_EXPERIENCES_ONLINE_MUTATION,
      variables: {
        input,
      },
      update: updateExperiencesManualCacheUpdate,
    });

    const validResponse =
      response && response.data && response.data.updateExperiences;

    if (!validResponse) {
      onError();
      return;
    }

    if (validResponse.__typename === "UpdateExperiencesAllFail") {
      onError(validResponse.error);
    } else {
      const updateResult = validResponse.experiences[0];

      if (updateResult.__typename === "UpdateExperienceErrors") {
        onError(updateResult.errors.error);
      } else {
        const { experienceId } = updateResult.experience;

        const updatedExperience = getCachedExperienceDetailView(
          experienceId,
        ) as ExperienceCompleteFragment;

        floatExperienceToTheTopInGetExperiencesMiniQuery(updatedExperience);

        onUpdateSuccess(updateResult, updatedExperience);
      }
    }
  } catch (error) {
    onError(error);
  }
}

type UpdateExperiencesMutationFn = {
  input: UpdateExperienceInput[];
  onUpdateSuccess: (
    updateResult: UpdateExperienceSomeSuccessFragment,
    experience: ExperienceCompleteFragment,
  ) => void;
  onError: (error?: CommonError) => void;
  onDone?: () => void;
};
