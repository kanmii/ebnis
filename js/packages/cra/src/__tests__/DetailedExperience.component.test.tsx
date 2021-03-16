/* eslint-disable @typescript-eslint/no-explicit-any */
import {DeleteExperiences} from "@eb/cm/src/graphql/apollo-types/DeleteExperiences";
import {EntryFragment} from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import {ComponentTimeoutsMs} from "@eb/cm/src/utils/timers";
import {EbnisGlobals, StateValue} from "@eb/cm/src/utils/types";
import {
  mockOfflineExperience1,
  mockOfflineExperienceId1,
  mockOnlineExperience1,
  mockOnlineExperienceId1
} from "@eb/cm/src/__tests__/mock-data";
import {
  deleteExperiencesMswGql,
  // updateMswExperiencesGql,
  getExperienceAndEntriesDetailViewGqlMsw
} from "@eb/cm/src/__tests__/msw-handlers";
import {mswServer, mswServerListen} from "@eb/cm/src/__tests__/msw-server";
import {waitForCount} from "@eb/cm/src/__tests__/wait-for-count";
import {cleanup, render, waitFor} from "@testing-library/react";
import {ComponentType} from "react";
import {act} from "react-dom/test-utils";
import {makeApolloClient} from "../apollo/client";
import {
  // getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger
} from "../apollo/delete-experience-cache";
import {
  // getCachedEntriesDetailView,
  getCachedExperienceAndEntriesDetailView
} from "../apollo/get-detailed-experience-query";
import {useWithSubscriptionContext} from "../apollo/injectables";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  // getSyncError,
  putOfflineExperienceIdInSyncFlag
} from "../apollo/sync-to-server-cache";
import {removeUnsyncedExperiences} from "../apollo/unsynced-ledger";
import {DetailExperience} from "../components/DetailExperience/detail-experience.component";
import {
  deleteFooterCloseId,
  deleteHeaderCloseId,
  deleteMenuItemId,
  deleteOkId,
  domPrefix,
  refetchId,


  syncErrorsNotificationId, updateMenuItemId,
  updateSuccessNotificationId
} from "../components/DetailExperience/detail-experience.dom";
import {
  Match,
  Props
} from "../components/DetailExperience/detailed-experience-utils";
import {CallerProps as EntriesCallerProps} from "../components/entries/entries.utils";
import {Props as NewEntryProps} from "../components/UpsertEntry/upsert-entry.utils";
import {Props as UpsertExperienceProps} from "../components/UpsertExperience/upsert-experience.utils";
import // cleanUpOfflineExperiences,

  // cleanUpSyncedOfflineEntries,
  "../components/WithSubscriptions/with-subscriptions.utils";
import {getById} from "../tests.utils";
import {deleteObjectKey} from "../utils";
import {getIsConnected} from "../utils/connections";
import {deleteExperiences} from "../utils/delete-experiences.gql";
import {GetExperienceAndEntriesDetailViewQueryResult} from "../utils/experience.gql.types";
import {ChangeUrlType, windowChangeUrl} from "../utils/global-window";
import {updateExperiencesMutation} from "../utils/update-experiences.gql";
import {MY_URL} from "../utils/urls";

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockRemoveUnsyncedExperiences = removeUnsyncedExperiences as jest.Mock;

const mockUpsertSuccessId = "@t/upsert-success";
const mockUpsertFailId = "@t/upsert-fail";
const mockUpsertCancelId = "@t/upsert-cancel";
const mockOnline = StateValue.online;
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: (props: UpsertExperienceProps) => {
    return (
      <div>
        <button
          id={mockUpsertSuccessId}
          onClick={() => {
            props.onSuccess(mockOnlineExperience1, mockOnline);
          }}
        />
        <button
          id={mockUpsertFailId}
          onClick={() => {
            props.onError("a");
          }}
        />
        <button id={mockUpsertCancelId} onClick={props.onClose} />
      </div>
    );
  },
}));

jest.mock("../apollo/delete-experience-cache");
// const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

const mockLoadingId = "@t/loading";
jest.mock("../components/Loading/loading.component", () => {
  return () => <span id={mockLoadingId} />;
});

jest.mock("../components/Header/header.component", () => () => null);

jest.mock("../components/entries/entries.component", () => {
  return ({ postActions }: EntriesCallerProps) => {
    return <div>1</div>;
  };
});

jest.mock("../components/DetailExperience/detail-experience.lazy", () => ({
  Comments: () => {
    return null;
  },
}));

jest.mock("../utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockGetCachedExperienceAndEntriesDetailView = getCachedExperienceAndEntriesDetailView as jest.Mock;

jest.mock("../apollo/sync-to-server-cache");
// const mockGetSyncError = getSyncError as jest.Mock;
const mockgetAndRemoveOfflineExperienceIdFromSyncFlag = getAndRemoveOfflineExperienceIdFromSyncFlag as jest.Mock;
const mockPutOfflineExperienceIdInSyncFlag = putOfflineExperienceIdInSyncFlag as jest.Mock;
// const mockPutOrRemoveSyncError = putOrRemoveSyncError as jest.Mock;

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
// const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;
// const mockCleanUpSyncedOfflineEntries = cleanUpSyncedOfflineEntries as jest.Mock;

const mockUpsertEntrySuccessId = "?a?";
const mockDismissUpsertEntryUiId = "?b?";
const mockNewlyCreatedEntry = {
  __typename: "Entry",
  updatedAt: "2020-05-08T06:49:19Z",
  id: "c",
  clientId: "d",
  dataObjects: [
    {
      id: "c",
      definitionId: "1",
      data: `{"integer":7}`,
    },
  ],
} as EntryFragment;
const mockStateValue = StateValue;
jest.mock("../components/DetailExperience/detail-experience.lazy", () => {
  return {
    UpsertEntry: ({ onSuccess, onClose }: NewEntryProps) => (
      <div>
        <button
          id={mockUpsertEntrySuccessId}
          onClick={() => {
            onSuccess(mockNewlyCreatedEntry, mockStateValue.online);
          }}
        />

        <button id={mockDismissUpsertEntryUiId} onClick={onClose} />
      </div>
    ),
    Comments: () => null,
  };
});

const mockHistoryPushFn = jest.fn();

const mockPersistFunc = jest.fn();

const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: [0],
  closeNotification: 0,
};

const ebnisObject = {
  persistor: {
    persist: mockPersistFunc as any,
  },
  // logApolloQueries: true,
  // logReducers: true,
} as EbnisGlobals;

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

describe("components", () => {
  beforeAll(() => {
    mswServerListen();
  });

  afterAll(() => {
    mswServer.close();
  });

  beforeEach(() => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    const { client, cache } = makeApolloClient({ testing: true });
    ebnisObject.cache = cache;
    ebnisObject.client = client;
  });

  afterEach(() => {
    mswServer.resetHandlers();
    cleanup();
    deleteObjectKey(ebnisObject, "client");
    deleteObjectKey(ebnisObject, "cache");
    jest.clearAllMocks();
  });

  it("fetch experience succeeds / connected / no retry", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceAndEntriesDetailViewGqlMsw({
        getExperience: {
          ...mockOnlineExperience1,
        },
        getEntries: null,
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      expect(getById(mockLoadingId)).not.toBeNull();
      expect(getById(domPrefix)).toBeNull();

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      expect(getById(mockLoadingId)).toBeNull();
      expect(getById(refetchId)).toBeNull();
    });
  });

  it("first fetch of experience fails/succeeds on retry from cache", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceAndEntriesDetailViewGqlMsw({
        getExperience: null, // causes failure
        getEntries: null,
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      expect(getById(mockLoadingId)).not.toBeNull();
      expect(getById(domPrefix)).toBeNull();
      expect(getById(refetchId)).toBeNull();

      const retryEl = await waitFor(() => {
        const el = getById(refetchId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockLoadingId)).toBeNull();
      expect(getById(domPrefix)).toBeNull();

      mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
        data: {
          getExperience: {
            ...mockOnlineExperience1,
          } as any,
        },
      } as GetExperienceAndEntriesDetailViewQueryResult);

      retryEl.click();

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      expect(getById(refetchId)).toBeNull();
    });
  });

  it("update experience succeeds", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      const triggerUpdateUiEl = await waitFor(() => {
        const el = getById(updateMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockUpsertCancelId)).toBeNull();

      triggerUpdateUiEl.click();
      getById(mockUpsertCancelId).click();
      expect(getById(mockUpsertCancelId)).toBeNull();

      expect(getById(mockUpsertSuccessId)).toBeNull();
      expect(getById(updateSuccessNotificationId)).toBeNull();
      triggerUpdateUiEl.click();
      getById(mockUpsertSuccessId).click();

      getById(updateSuccessNotificationId).click();

      expect(getById(updateSuccessNotificationId)).toBeNull();
    });
  });

  const deleteExperience1Data: DeleteExperiences = {
    deleteExperiences: {
      __typename: "DeleteExperiencesSomeSuccess",
      experiences: [
        {
          __typename: "DeleteExperienceSuccess",
          experience: {
            __typename: "Experience",
            id: mockOnlineExperienceId1,
            title: "aa",
          },
        },
      ],
      clientSession: "",
      clientToken: "",
    },
  };

  it("delete experience success", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mswServer.use(deleteExperiencesMswGql(deleteExperience1Data));

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(deleteHeaderCloseId)).toBeNull();

      triggerDeleteUiEl.click();

      getById(deleteHeaderCloseId).click();
      expect(getById(deleteHeaderCloseId)).toBeNull();

      expect(getById(deleteFooterCloseId)).toBeNull();

      triggerDeleteUiEl.click();

      getById(deleteFooterCloseId).click();
      expect(getById(deleteFooterCloseId)).toBeNull();

      triggerDeleteUiEl.click();
      getById(deleteOkId).click();

      const calls = await waitForCount(() => {
        const calls = mockHistoryPushFn.mock.calls[0];
        return calls;
      });

      expect(calls[0]).toBe(MY_URL);
      expect(mockPutOrRemoveDeleteExperienceLedger).toBeCalled();
      expect(mockRemoveUnsyncedExperiences).toBeCalled();
      expect(mockPersistFunc).toBeCalled();
    });
  });

  const withSubscriptionContext1 = {
    onSyncData: {
      offlineIdToOnlineExperienceMap: {
        [mockOfflineExperienceId1]: mockOnlineExperience1,
      },
      syncErrors: {
        [mockOfflineExperienceId1]: {
          createEntries: {
            1: {
              error: "e",
              dataObjects: [
                {
                  meta: {
                    index: 1,
                    id: "",
                    clientId: "",
                  },
                  data: "1",
                },
              ],
            },
          },
        },
      },
    },
  };

  const mockGetCachedExperienceAndEntriesDetailView1 = {
    data: {
      getExperience: {
        ...mockOfflineExperience1,
      } as any,
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("sync offline experience", async () => {
    mockUseWithSubscriptionContext.mockReturnValue(withSubscriptionContext1);

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView1,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);
      expect(getById(syncErrorsNotificationId)).toBeNull();

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      expect(mockPutOfflineExperienceIdInSyncFlag).toBeCalled();
      expect(mockPersistFunc).toBeCalled();

      const calls0 = await waitForCount(() => {
        const x = mockWindowChangeUrl.mock.calls[0];
        return x;
      });

      const [path, type] = calls0;
      expect(path.includes(mockOnlineExperienceId1)).toBe(true);
      expect(type).toEqual(ChangeUrlType.replace);
    });
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  const location = props.location || ({} as any);
  const history = {
    push: mockHistoryPushFn,
  } as any;

  props.match = {
    params: {
      experienceId: mockOnlineExperienceId1,
    },
  } as Match;

  return {
    ui: (
      <DetailExperienceP
        location={location}
        history={history}
        componentTimeoutsMs={componentTimeoutsMs}
        updateExperiencesMutation={updateExperiencesMutation}
        deleteExperiences={deleteExperiences}
        {...props}
      />
    ),
  };
}
