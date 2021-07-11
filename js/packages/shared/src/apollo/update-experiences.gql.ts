import { getCachedExperienceDetailView } from "@eb/shared/src/apollo/experience-detail-cache-utils";
import { floatExperienceToTopInGetExperiencesListViewQuery } from "@eb/shared/src/apollo/experiences-list-cache-utils";
import { updateExperiencesManualCacheUpdate } from "@eb/shared/src/apollo/update-experiences-manual-cache-update";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { UpdateExperienceInput } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { UpdateExperienceSomeSuccessFragment } from "@eb/shared/src/graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import {
  UpdateExperiencesOnline,
  UpdateExperiencesOnlineVariables,
} from "@eb/shared/src/graphql/apollo-types/UpdateExperiencesOnline";
import { UPDATE_EXPERIENCES_ONLINE_MUTATION } from "@eb/shared/src/graphql/experience.gql";
import { CommonError } from "@eb/shared/src/utils/types";

export async function updateExperiencesMutation({
  input,
  onUpdateSuccess,
  onError,
}: UpdateExperiencesMutationArgs) {
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
        ) as ExperienceDCFragment;

        floatExperienceToTopInGetExperiencesListViewQuery(updatedExperience);

        onUpdateSuccess(updateResult, updatedExperience);
      }
    }
  } catch (error) {
    onError(error);
  }
}

export type UpdateExperiencesMutationInjectType = {
  updateExperiencesMutationInject: typeof updateExperiencesMutation;
};

type UpdateExperiencesMutationArgs = {
  input: UpdateExperienceInput[];
  onUpdateSuccess: (
    updateResult: UpdateExperienceSomeSuccessFragment,
    experience: ExperienceDCFragment,
  ) => void;
  onError: (error?: CommonError) => void;
  onDone?: () => void;
};

export type UpdateExperiencesMutation = typeof updateExperiencesMutation;

export type UpdateExperiencesMutationProps = {
  updateExperiencesMutation: UpdateExperiencesMutation;
};
