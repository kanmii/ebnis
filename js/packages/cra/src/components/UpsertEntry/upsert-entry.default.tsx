// istanbul ignore file:
import { updateExperiencesMutation } from "@eb/shared/src/apollo/update-experiences.gql";
import { createOfflineEntryMutation } from "@eb/shared/src/apollo/upsert-entry.resolvers";
import { UpsertEntryInjections } from "@eb/shared/src/injections";
import { scrollIntoView } from "@eb/shared/src/scroll-into-view";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { UpsertEntry } from "./upsert-entry.component";
import { CallerProps } from "./upsert-entry.utils";

const upsertEntryInjections: UpsertEntryInjections = {
  updateExperiencesMutationInject: updateExperiencesMutation,
  createOfflineEntryMutationInject: createOfflineEntryMutation,
  scrollIntoViewInject: scrollIntoView,
  getIsConnectedInject: getIsConnected,
};

const comp = (props: CallerProps) => {
  window.____ebnis.upsertEntryInjections = upsertEntryInjections;

  return <UpsertEntry {...props} />;
};

export default comp;
