/* istanbul ignore file */

import { getCachedExperiencesConnectionListView } from "@eb/shared/src/apollo/cached-experiences-list-view";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "@eb/shared/src/apollo/delete-experience-cache";
import {
  cleanUpOfflineExperiences,
  purgeExperiencesFromCache,
} from "@eb/shared/src/apollo/experiences-list-cache-utils";
import { getExperienceConnectionListView } from "@eb/shared/src/apollo/get-experiences-connection-list.gql";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { getSyncErrors } from "@eb/shared/src/apollo/sync-to-server-cache";
import {
  getOnlineStatus,
  getUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import { setUpRoutePage } from "@eb/shared/src/global-window";
import { ListExperiencesViewInjections } from "@eb/shared/src/injections";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { Link } from "react-router-dom";
import HeaderComponent from "../Header/header.component";
import LoadingComponent from "../Loading/loading.component";
import { My } from "./my.component";
import { handlePreFetchExperiences } from "./my.injectables";
import { UpsertExperience } from "./my.lazy";
import { CallerProps } from "./my.utils";

const listExperiencesViwInjections: ListExperiencesViewInjections = {
  getExperienceConnectionListViewInject: getExperienceConnectionListView,
  getCachedExperiencesConnectionListViewInject:
    getCachedExperiencesConnectionListView,
  getSyncErrorsInject: getSyncErrors,
  purgeExperiencesFromCacheInject: purgeExperiencesFromCache,
  putOrRemoveDeleteExperienceLedgerInject: putOrRemoveDeleteExperienceLedger,
  getDeleteExperienceLedgerInject: getDeleteExperienceLedger,
  setUpRoutePageInject: setUpRoutePage,
  getIsConnectedInject: getIsConnected,
  useWithSubscriptionContextInject: useWithSubscriptionContext,
  componentTimeoutsMsInject: componentTimeoutsMs,
  cleanUpOfflineExperiencesInject: cleanUpOfflineExperiences,
};

export default (props: CallerProps) => {
  window.____ebnis.listExperiencesViwInjections = listExperiencesViwInjections;

  return (
    <My
      {...props}
      HeaderComponentFn={HeaderComponent}
      LoadingComponentInject={LoadingComponent}
      handlePreFetchExperiencesInject={handlePreFetchExperiences}
      getOnlineStatusProp={getOnlineStatus}
      getUnsyncedExperienceInject={getUnsyncedExperience}
      UpsertExperienceInject={UpsertExperience}
      LinkInject={Link}
    />
  );
};
