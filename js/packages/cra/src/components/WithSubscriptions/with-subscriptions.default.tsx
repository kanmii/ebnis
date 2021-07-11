// istanbul ignore file
import { readEntryFragment } from "@eb/shared/src/apollo/experience-detail-cache-utils";
import { subscribeToGraphqlExperiencesDeletedEvent } from "@eb/shared/src/apollo/experience.gql.types";
import {
  purgeEntry,
  purgeExperiencesFromCache,
} from "@eb/shared/src/apollo/experiences-list-cache-utils";
import { syncToServer } from "@eb/shared/src/apollo/sync-to-server";
import { getLocation, windowChangeUrl } from "@eb/shared/src/global-window";
import { WithSubscriptionsComponentInjections } from "@eb/shared/src/injections";
import { getUser } from "@eb/shared/src/utils/manage-user-auth";
import { WithSubscriptions } from "./with-subscriptions.component";
import { CallerProps } from "./with-subscriptions.utils";

const withSubscriptionsComponentInjections: WithSubscriptionsComponentInjections =
  {
    purgeEntryInject: purgeEntry,
    purgeExperiencesFromCacheInject: purgeExperiencesFromCache,
    getUserInject: getUser,
    readEntryFragmentInject: readEntryFragment,
    syncToServerInject: syncToServer,
    windowChangeUrlInject: windowChangeUrl,
    getLocationInject: getLocation,
    subscribeToGraphqlExperiencesDeletedEventInject:
      subscribeToGraphqlExperiencesDeletedEvent,
  };

export default (props: CallerProps) => {
  window.____ebnis.withSubscriptionsComponentInjections =
    withSubscriptionsComponentInjections;

  return <WithSubscriptions {...props} />;
};
