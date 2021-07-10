/* istanbul ignore file */

import { getCachedExperiencesConnectionListView } from "@eb/shared/src/apollo/cached-experiences-list-view";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "@eb/shared/src/apollo/delete-experience-cache";
import { getExperienceConnectionListView } from "@eb/shared/src/apollo/get-experiences-connection-list.gql";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { getSyncErrors } from "@eb/shared/src/apollo/sync-to-server-cache";
import {
  getOnlineStatus,
  getUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import { purgeExperiencesFromCache1 } from "@eb/shared/src/apollo/update-get-experiences-list-view-query";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { Link } from "react-router-dom";
import { setUpRoutePage } from "../../utils/global-window";
import HeaderComponent from "../Header/header.component";
import LoadingComponent from "../Loading/loading.component";
import { cleanUpOfflineExperiences } from "../WithSubscriptions/with-subscriptions.utils";
import { My } from "./my.component";
import { handlePreFetchExperiences } from "./my.injectables";
import { UpsertExperience } from "./my.lazy";
import { CallerProps } from "./my.utils";

export default (props: CallerProps) => {
  return (
    <My
      {...props}
      getExperienceConnectionListView={getExperienceConnectionListView}
      componentTimeoutsMs={componentTimeoutsMs}
      getCachedExperiencesConnectionListViewFn={
        getCachedExperiencesConnectionListView
      }
      HeaderComponentFn={HeaderComponent}
      LoadingComponentFn={LoadingComponent}
      cleanUpOfflineExperiencesInject={cleanUpOfflineExperiences}
      getSyncErrorsFn={getSyncErrors}
      handlePreFetchExperiencesFn={handlePreFetchExperiences}
      purgeExperiencesFromCache1Fn={purgeExperiencesFromCache1}
      putOrRemoveDeleteExperienceLedgerInject={
        putOrRemoveDeleteExperienceLedger
      }
      getDeleteExperienceLedgerInject={getDeleteExperienceLedger}
      getOnlineStatusProp={getOnlineStatus}
      getUnsyncedExperienceInject={getUnsyncedExperience}
      setUpRoutePageInject={setUpRoutePage}
      getIsConnectedInject={getIsConnected}
      useWithSubscriptionContextInject={useWithSubscriptionContext}
      UpsertExperienceInject={UpsertExperience}
      LinkInject={Link}
    />
  );
};
