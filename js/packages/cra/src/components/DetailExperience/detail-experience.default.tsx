/* istanbul ignore file */

import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "@eb/shared/src/apollo/delete-experience-cache";
import { getExperienceAndEntriesDetailView } from "@eb/shared/src/apollo/experience.gql.types";
import { getCachedExperienceAndEntriesDetailView } from "@eb/shared/src/apollo/get-detailed-experience-query";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  getSyncError,
  mapOnlineExperienceIdToOfflineIdInSyncFlag,
} from "@eb/shared/src/apollo/sync-to-server-cache";
import { removeUnsyncedExperiences } from "@eb/shared/src/apollo/unsynced-ledger";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { deleteExperiences } from "../../utils/delete-experiences.gql";
import { windowChangeUrl } from "../../utils/global-window";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import Entries from "../entries/entries.default";
import HeaderComponent from "../Header/header.component";
import LoadingComponent from "../Loading/loading.component";
import { UpsertExperience } from "../My/my.lazy";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../WithSubscriptions/with-subscriptions.utils";
import { DetailExperience } from "./detail-experience.component";
import { clearTimeoutFn } from "./detail-experience.injectables";
import { Comments } from "./detail-experience.lazy";
import { CallerProps } from "./detailed-experience-utils";

export default (props: CallerProps) => {
  return (
    <DetailExperience
      {...props}
      HeaderComponentFn={HeaderComponent}
      LoadingComponentFn={LoadingComponent}
      deleteExperiences={deleteExperiences}
      componentTimeoutsMs={componentTimeoutsMs}
      updateExperiencesMutation={updateExperiencesMutation}
      useWithSubscriptionContextInject={useWithSubscriptionContext}
      getExperienceAndEntriesDetailViewInject={
        getExperienceAndEntriesDetailView
      }
      windowChangeUrlFn={windowChangeUrl}
      removeUnsyncedExperiencesInject={removeUnsyncedExperiences}
      getCachedExperienceAndEntriesDetailViewInject={
        getCachedExperienceAndEntriesDetailView
      }
      clearTimeoutFnInject={clearTimeoutFn}
      getDeleteExperienceLedgerInject={getDeleteExperienceLedger}
      putOrRemoveDeleteExperienceLedgerInject={
        putOrRemoveDeleteExperienceLedger
      }
      getIsConnectedInject={getIsConnected}
      mapOnlineExperienceIdToOfflineIdInSyncFlagInject={
        mapOnlineExperienceIdToOfflineIdInSyncFlag
      }
      getAndRemoveOfflineExperienceIdFromSyncFlagInject={
        getAndRemoveOfflineExperienceIdFromSyncFlag
      }
      getSyncErrorInject={getSyncError}
      cleanUpSyncedOfflineEntriesInject={cleanUpSyncedOfflineEntries}
      cleanUpOfflineExperiencesInject={cleanUpOfflineExperiences}
      UpsertExperienceInject={UpsertExperience}
      CommentsInject={Comments}
      EntriesInject={Entries}
    />
  );
};
