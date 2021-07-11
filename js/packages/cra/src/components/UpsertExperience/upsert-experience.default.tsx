// istanbul ignore file
import { createExperienceOnlineMutation } from "@eb/shared/src/apollo/create-experience-online-mutation-fn";
import { getCachedEntriesDetailViewSuccess } from "@eb/shared/src/apollo/experience-detail-cache-utils";
import {
  getExperienceDetailView,
  getGetDataObjects,
} from "@eb/shared/src/apollo/experience.gql.types";
import { updateExperiencesMutation } from "@eb/shared/src/apollo/update-experiences.gql";
import {
  createOfflineExperience,
  updateExperienceOfflineFn,
} from "@eb/shared/src/apollo/upsert-experience.resolvers";
import { windowChangeUrl } from "@eb/shared/src/global-window";
import { UpsertExperienceInjections } from "@eb/shared/src/injections";
import { scrollIntoView } from "@eb/shared/src/scroll-into-view";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { UpsertExperience } from "./upsert-experience.component";
import { CallerProps } from "./upsert-experience.utils";

const upsertExperienceInjections: UpsertExperienceInjections = {
  getExperienceDetailViewInject: getExperienceDetailView,
  getGetDataObjectsInject: getGetDataObjects,
  createOfflineExperienceInject: createOfflineExperience,
  updateExperienceOfflineFnInject: updateExperienceOfflineFn,
  getCachedEntriesDetailViewSuccessInject: getCachedEntriesDetailViewSuccess,
  updateExperiencesMutationInject: updateExperiencesMutation,
  getIsConnectedInject: getIsConnected,
  windowChangeUrlInject: windowChangeUrl,
  scrollIntoViewInject: scrollIntoView,
  createExperienceOnlineMutationInject: createExperienceOnlineMutation,
};

const comp = (props: CallerProps) => {
  window.____ebnis.upsertExperienceInjections = upsertExperienceInjections;

  return <UpsertExperience {...props} />;
};

export default comp;
