/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectErrorFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectErrorFragment";
import { DefinitionErrorFragment } from "@eb/cm/src/graphql/apollo-types/DefinitionErrorFragment";
import { EntryConnectionFragment } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import { GetEntriesUnionFragment_GetEntriesSuccess } from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { makeOfflineId } from "@eb/cm/src/utils/offlines";
import {
  EbnisGlobals,
  OfflineIdToCreateEntrySyncErrorMap,
  OnlineStatus,
  OnSyncedData,
  StateValue,
  UpdateEntrySyncErrors,
} from "@eb/cm/src/utils/types";
import {
  mockOfflineEntry1,
  mockOfflineEntry1Id,
  offlineEntrySuccess,
  mockOnlineEntry1,
  mockOnlineEntry1Id,
  mockOnlineEntry1Success,
} from "@eb/cm/src/__tests__/mock-data";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../apollo/delete-experience-cache";
import {
  getCachedEntriesDetailView,
  getCachedExperienceAndEntriesDetailView,
} from "../apollo/get-detailed-experience-query";
import { useWithSubscriptionContext } from "../apollo/injectables";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  getSyncError,
  putOfflineExperienceIdInSyncFlag,
  putOrRemoveSyncError,
} from "../apollo/sync-to-server-cache";
import { removeUnsyncedExperiences } from "../apollo/unsynced-ledger";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  closeDeleteEntryConfirmationId,
  closeSyncErrorsMsgBtnId,
  closeSyncErrorsMsgId,
  closeUpsertEntryNotificationId,
  deleteExperienceMenuItemSelector,
  deleteExperienceOkSelector,
  editExperienceMenuItemSelector,
  entriesContainerId,
  entryDeleteFailNotificationId,
  entryDeleteSuccessNotificationId,
  experienceMenuSelector,
  experienceMenuTriggerSelector,
  fetchNextEntriesId,
  fixSyncErrorsId,
  newEntryMenuItemSelector,
  noEntryTriggerId,
  noTriggerDocumentEventClassName,
  okDeleteEntryId,
  refetchEntriesId,
  refetchExperienceId,
  syncEntriesErrorsMsgId,
  syncErrorsNotificationId,
  syncExperienceErrorsMsgId,
  updateExperienceSuccessNotificationId,
} from "../components/DetailExperience/detail-experience.dom";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import {
  ActionType,
  DataState,
  effectFunctions,
  EffectType,
  EntriesDataFailureState,
  EntriesDataSuccessSate,
  ExperienceSyncError,
  FetchEntriesErrorState,
  initState,
  Match,
  Props,
  reducer,
} from "../components/DetailExperience/detailed-experience-utils";
import {
  entryDeleteMenuItemSelector,
  entryDropdownIsActiveClassName,
  entryDropdownTriggerClassName,
  entryUpdateMenuItemSelector,
} from "../components/Entry/entry.dom";
import { Props as NewEntryProps } from "../components/UpsertEntry/upsert-entry.utils";
import { updateExperienceOfflineFn } from "../components/UpsertExperience/upsert-experience.resolvers";
import { Props as UpsertExperienceProps } from "../components/UpsertExperience/upsert-experience.utils";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../components/WithSubscriptions/with-subscriptions.utils";
import { deleteObjectKey } from "../utils";
import { WithSubscriptionContextProps } from "../utils/app-context";
import { GENERIC_SERVER_ERROR } from "../utils/common-errors";
import { getIsConnected } from "../utils/connections";
import { GenericHasEffect } from "../utils/effects";
import {
  DeleteExperiencesMutationResult,
  getEntriesDetailView,
  GetEntriesDetailViewQueryResult,
  getExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewQueryResult,
} from "../utils/experience.gql.types";
import { ChangeUrlType, windowChangeUrl } from "../utils/global-window";
import { scrollIntoView } from "../utils/scroll-into-view";
import { FETCH_EXPERIENCES_TIMEOUTS, MAX_TIMEOUT_MS } from "../utils/timers";
import { updateExperiencesMutation } from "../utils/update-experiences.gql";
import { activeClassName, nonsenseId } from "../utils/utils.dom";

jest.mock("../components/UpsertExperience/upsert-experience.resolvers");
const mockUpdateExperienceOfflineFn = updateExperienceOfflineFn as jest.Mock;

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;
const mockCleanUpSyncedOfflineEntries = cleanUpSyncedOfflineEntries as jest.Mock;

jest.mock("../apollo/sync-to-server-cache");
const mockGetSyncError = getSyncError as jest.Mock;
const mockgetAndRemoveOfflineExperienceIdFromSyncFlag = getAndRemoveOfflineExperienceIdFromSyncFlag as jest.Mock;
const mockPutOrRemoveSyncError = putOrRemoveSyncError as jest.Mock;

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockGetCachedExperienceAndEntriesDetailView = getCachedExperienceAndEntriesDetailView as jest.Mock;

const mockGetEntriesQuery = getCachedEntriesDetailView as jest.Mock;

jest.mock("../components/Header/header.component", () => () => null);

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockDeleteExperiences = jest.fn();

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchDetailedExperience = getExperienceAndEntriesDetailView as jest.Mock;
const mockManuallyFetchEntries = getEntriesDetailView as jest.Mock;

jest.mock("../utils/update-experiences.gql");
const mockUpdateExperiencesMutation = updateExperiencesMutation as jest.Mock;

const mockGetIsConnected = getIsConnected as jest.Mock;
jest.mock("../utils/connections");

jest.mock("../apollo/delete-experience-cache");

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

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
  };
});

jest.mock("../apollo/unsynced-ledger");
const mockRemoveUnsyncedExperiences = removeUnsyncedExperiences as jest.Mock;

const mockLoadingId = "l-o-a-d-i-n-g";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingId}></div>;
});

const mockCloseUpsertExperienceId = "?c?";
const mockUpsertExperienceSuccessId = "?d?";
let mockUpdatedExperience: undefined | ExperienceDetailViewFragment = undefined;
let mockUpdatedExperienceOnlineStatus: undefined | OnlineStatus = undefined;
const mockNoTriggerDocumentEventClassName = noTriggerDocumentEventClassName;
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: ({ onClose, onSuccess }: UpsertExperienceProps) => {
    return (
      <div className={mockNoTriggerDocumentEventClassName}>
        <button id={mockCloseUpsertExperienceId} onClick={onClose} />
        <button
          id={mockUpsertExperienceSuccessId}
          onClick={() => {
            onSuccess(
              mockUpdatedExperience as ExperienceDetailViewFragment,
              mockUpdatedExperienceOnlineStatus as OnlineStatus,
            );
          }}
        />
      </div>
    );
  },
}));

const mockHistoryPushFn = jest.fn();

const mockPersistFunc = jest.fn();

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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  mockUpdatedExperience = undefined;
  mockUpdatedExperienceOnlineStatus = undefined;
});

const onlineId = "onlineId";
const onlineDefinitionId = "1";

const onlineExperience = {
  id: onlineId,
  dataDefinitions: [
    {
      id: onlineDefinitionId,
      name: "aa",
      type: DataTypes.INTEGER,
    },
  ],
} as ExperienceDetailViewFragment;

const onlineOfflineEntriesSuccess = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: mockOnlineEntry1,
      },
      {
        node: mockOfflineEntry1,
      },
    ],
    pageInfo: {},
  },
};

const emptyEntriesSuccessList = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [] as any,
    pageInfo: {},
  },
};

////////////////////////// TESTS //////////////////////////////

describe("components", () => {
  it("has connection/fetch throws exception/entry added/entry errors auto close notification", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      error: new Error("a"),
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();
    expect(document.getElementById(refetchExperienceId)).toBeNull();

    jest.runTimersToTime(MAX_TIMEOUT_MS);
    await waitFor(() => true);

    const refetchExperienceBtn = document.getElementById(
      refetchExperienceId,
    ) as HTMLElement;

    mockManuallyFetchDetailedExperience.mockRejectedValueOnce(new Error("b"));

    refetchExperienceBtn.click();
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    await waitFor(() => true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: onlineExperience,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    refetchExperienceBtn.click();
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    expect(getRefetchEntries()).toBeNull();
    await waitFor(() => true);
    const refetchEntriesEl = getRefetchEntries();

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...mockOnlineEntry1Success,
          entries: {
            edges: [] as any,
            pageInfo: {},
          },
        },
      },
    } as GetEntriesDetailViewQueryResult);

    act(() => {
      refetchEntriesEl.click();
    });

    expect(getNoEntryEl()).toBeNull();
    jest.runTimersToTime(MAX_TIMEOUT_MS);
    await waitFor(() => true);
    const noEntryEl = getNoEntryEl();

    expect(document.getElementById(mockDismissUpsertEntryUiId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entlassenNeuEintragUiEl = await waitFor(() => {
      return document.getElementById(mockDismissUpsertEntryUiId) as HTMLElement;
    });

    act(() => {
      entlassenNeuEintragUiEl.click();
    });

    expect(document.getElementById(mockDismissUpsertEntryUiId)).toBeNull();

    expect(getUpsertEntrySuccess()).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entryEl = getUpsertEntrySuccess();

    expect(getCloseUpsertEntryNotificationEl()).toBeNull();
    expect(getSyncErrorsNotificationEl()).toBeNull();

    act(() => {
      entryEl.click();
    });

    const schließNeuEintragEl = getCloseUpsertEntryNotificationEl();

    act(() => {
      schließNeuEintragEl.click();
    });

    expect(getCloseUpsertEntryNotificationEl()).toBeNull();
  });

  it("fetches entries from cache/deletes experience", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: mockOnlineEntry1Success,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    const menuTriggerEl = getExperienceMenuTrigger();
    const menuEl = getExperienceMenu();

    expect(menuEl.classList).not.toContain(activeClassName);

    act(() => {
      menuTriggerEl.click();
    });

    expect(menuEl.classList).toContain(activeClassName);

    const deleteExperienceEl = getDeleteExperienceEl();
    expect(getCancelDeleteExperienceEl()).toBeNull();

    act(() => {
      deleteExperienceEl.click();
    });

    act(() => {
      getCancelDeleteExperienceEl().click();
    });

    expect(getOkDeleteExperienceEl()).toBeNull();

    act(() => {
      deleteExperienceEl.click();
    });

    mockDeleteExperiences.mockResolvedValueOnce({
      data: {
        deleteExperiences: {
          __typename: "DeleteExperiencesSomeSuccess",
          experiences: [
            {
              __typename: "DeleteExperienceSuccess",
              experience: {
                id: onlineId,
                title: "aa",
              },
            },
          ],
        },
      },
    } as DeleteExperiencesMutationResult);

    act(() => {
      getOkDeleteExperienceEl().click();
    });

    await waitFor(() => true);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].key).toBe(
      StateValue.deleted,
    );

    expect(mockRemoveUnsyncedExperiences.mock.calls[0][0][0]).toBe(onlineId);

    expect(mockPersistFunc).toHaveBeenCalled();

    expect(mockHistoryPushFn).toHaveBeenCalled();
  });

  it("entries pagination", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({ connected: true });

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: mockOnlineEntry1,
              },
            ],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);
    // return;

    const fetchNextEntriesEl = getFetchNextEntriesEl();
    mockUseWithSubscriptionContext.mockReturnValue({ connected: true });

    mockManuallyFetchEntries.mockResolvedValueOnce({ error: "a" });

    act(() => {
      fetchNextEntriesEl.click();
    });

    expect(getExperiencePaginationErrorEl()).toBeNull();

    await waitFor(getExperiencePaginationErrorEl);

    mockUseWithSubscriptionContext.mockReturnValue({});

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...mockOnlineEntry1Success,
          entries: {
            edges: [
              {
                node: {
                  ...mockOnlineEntry1,
                  id: "b",
                },
              },
            ],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      },
    } as GetEntriesDetailViewQueryResult);

    act(() => {
      fetchNextEntriesEl.click();
    });

    expect(document.getElementById("b")).toBeNull();

    await waitFor(() => {
      return document.getElementById("b");
    });

    expect(getExperiencePaginationErrorEl()).toBeNull();
    // weil es gibt kein Netzwerk
    expect(getFetchNextEntriesEl()).toBeNull();
  });

  it("displays create entries errors", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetSyncError.mockReturnValue({
      createEntries: {
        [mockOnlineEntry1.id]: {
          error: "a",
        },
      } as OfflineIdToCreateEntrySyncErrorMap,
    });

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: mockOnlineEntry1,
              },
            ],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);
    expect(getUpsertEntrySuccess()).toBeNull();

    act(() => {
      getUpdateEntryLaunchEl().click();
    });

    act(() => {
      getUpsertEntrySuccess().click();
    });

    act(() => {
      jest.runTimersToTime(MAX_TIMEOUT_MS);
    });
  });
});

describe("first fetch of experience: display sync errors", () => {
  it("displays sync errors for definitions update", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given an experience has definition sync errors
    mockGetSyncError.mockReturnValue({
      definitions: {
        [onlineDefinitionId]: {
          id: onlineDefinitionId,
          type: "a",
          error: null,
        } as DefinitionErrorFragment,
      },
    } as ExperienceSyncError);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: mockOnlineEntry1Success,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Then error notification should be visible
    expect(getSyncErrorsNotificationEl()).not.toBeNull();

    const upsertEntryUiTrigger = getUpsertEntryTriggerEl();

    // When user clicks on 'upsert entry' button
    act(() => {
      upsertEntryUiTrigger.click();
    });

    // Then user gets message to first fix the errors
    const closeSyncErrorsCloseEl = getSyncErrorsMessageClose();

    // UpsertEntry UI should not visible
    expect(getCloseUpsertExperienceUI()).toBeNull();

    // When user closes message to fix sync errors
    act(() => {
      closeSyncErrorsCloseEl.click();
    });

    // Then message should no longer be visible
    expect(getSyncErrorsMessageClose()).toBeNull();

    // When user clicks on 'upsert entry' button again
    act(() => {
      upsertEntryUiTrigger.click();
    });

    // Then user gets message to first fix the errors
    const fixSyncErrorsEl = getSyncErrorsMessageFix();

    // UI to update experience should not be visible
    expect(getCloseUpsertExperienceUI()).toBeNull();

    // Experience sync errors specific message should be visible
    expect(getSyncExperienceErrors()).not.toBeNull();

    // Entries errors specific message should not be visible
    expect(getSyncEntriesErrors()).toBeNull();

    // When user clicks on button to fix sync errors
    act(() => {
      fixSyncErrorsEl.click();
    });

    // UI to update experience should be visible
    const closeUpsertExpEl = getCloseUpsertExperienceUI();

    // Sync errors message should not be visible
    expect(getSyncErrorsMessageClose()).toBeNull();

    // When user closes update experience UI
    act(() => {
      closeUpsertExpEl.click();
    });

    // UI to update experience should not be visible
    expect(getCloseUpsertExperienceUI()).toBeNull();
  });

  it("displays sync errors for create entries errors", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given an experience has definition sync errors
    mockGetSyncError.mockReturnValue({
      createEntries: {
        [mockOfflineEntry1Id]: {
          __typename: "CreateEntryError",
          meta: {
            index: 0,
          },
          error: "a",
          clientId: null,
          dataObjects: [
            {
              meta: {
                index: 0,
              },
              data: "b",
              definition: null,
            },
          ],
        } as CreateEntryErrorFragment,
      },
    } as ExperienceSyncError);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: offlineEntrySuccess,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Then error notification should be visible
    expect(getSyncErrorsNotificationEl()).not.toBeNull();

    // When user clicks on 'upsert entry' button

    const upsertEntryUiTrigger = getUpsertEntryTriggerEl();

    act(() => {
      upsertEntryUiTrigger.click();
    });

    // Then user gets message that there are errors
    let closeSyncErrorsCloseEl = getCloseSyncErrorsMsgBtn();
    expect(getUpdateEntryLaunchEl()).not.toBeNull();

    // There is button user can click to edit entry
    const triggerUpdateEntryEl = getUpdateEntryLaunchEl();

    // UpsertEntry UI should be visible
    expect(getUpsertEntrySuccess()).toBeNull();

    // When user closes sync errors message
    act(() => {
      closeSyncErrorsCloseEl.click();
    });

    // Then message should no longer be visible
    expect(getSyncErrorsMessageClose()).toBeNull();

    // When user clicks on 'upsert entry' button again
    act(() => {
      upsertEntryUiTrigger.click();
    });

    // Fix sync error button should not be visible
    expect(getSyncErrorsMessageFix()).toBeNull();

    // Experience sync errors specific message should not be visible
    expect(getSyncExperienceErrors()).toBeNull();

    // Entries errors specific message should be visible
    expect(getSyncEntriesErrors()).not.toBeNull();

    // When user closes sync errors message

    closeSyncErrorsCloseEl = getCloseSyncErrorsMsgBtn();

    act(() => {
      closeSyncErrorsCloseEl.click();
    });

    // Then message should no longer be visible
    expect(getSyncErrorsMessageClose()).toBeNull();

    // When user clicks on button to update entry
    act(() => {
      triggerUpdateEntryEl.click();
    });

    // Update entry Ui should be visible
    const updateEntrySuccessEl = getUpsertEntrySuccess();

    // When update entry Ui is closed

    act(() => {
      updateEntrySuccessEl.click();
    });

    // update entry UI should not be visible
    expect(getDismissUpsertEntryUi()).toBeNull();

    // Error notification should not be visible
    expect(getSyncErrorsNotificationEl()).toBeNull();
    expect(getUpdateEntryLaunchEl()).toBeNull();
  });

  it("displays sync errors for update entries", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given an experience has update entries sync errors
    mockGetSyncError.mockReturnValue({
      updateEntries: {
        [mockOnlineEntry1Id]: "a" as UpdateEntrySyncErrors,
        [mockOfflineEntry1Id]: {
          a: {
            meta: {
              index: 1,
            },
            data: "a",
            error: "",
          } as DataObjectErrorFragment,
        } as UpdateEntrySyncErrors,
      },
    } as ExperienceSyncError);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: onlineOfflineEntriesSuccess,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Then error notification should be visible
    expect(getSyncErrorsNotificationEl()).not.toBeNull();

    // When user clicks on 'upsert entry' button

    const upsertEntryUiTrigger = getUpsertEntryTriggerEl();

    act(() => {
      upsertEntryUiTrigger.click();
    });

    // Then user gets message that there are errors
    expect(getCloseSyncErrorsMsgBtn).not.toBeNull();

    // When user clicks on button to update entry
    const triggerUpdateEntryEl = getUpdateEntryLaunchEl();
    act(() => {
      triggerUpdateEntryEl.click();
    });

    // Update entry Ui should be visible
    const closeUpdateEntryEl = getDismissUpsertEntryUi();

    // When update entry Ui is closed

    act(() => {
      closeUpdateEntryEl.click();
    });

    // update entry UI should not be visible
    expect(getUpsertEntrySuccess()).toBeNull();
  });

  it("displays sync errors for own fields update", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given an experience has definition sync errors
    mockGetSyncError.mockReturnValue({
      ownFields: {
        __typename: "UpdateExperienceOwnFieldsError",
        title: "a",
        a: "",
      },
    } as ExperienceSyncError);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: mockOnlineEntry1Success,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Then error notification should be visible
    expect(getSyncErrorsNotificationEl()).not.toBeNull();

    const upsertEntryUiTrigger = getUpsertEntryTriggerEl();

    // When user clicks on 'upsert entry' button
    act(() => {
      upsertEntryUiTrigger.click();
    });

    // UpsertEntry UI should not visible
    expect(getCloseUpsertExperienceUI()).toBeNull();

    // Then user gets message to first fix the errors
    const fixSyncErrorsEl = getSyncErrorsMessageFix();

    // UI to update experience should not be visible
    expect(getCloseUpsertExperienceUI()).toBeNull();

    // Experience sync errors specific message should be visible
    expect(getSyncExperienceErrors()).not.toBeNull();

    // Entries errors specific message should not be visible
    expect(getSyncEntriesErrors()).toBeNull();

    // When user clicks on button to fix sync errors
    act(() => {
      fixSyncErrorsEl.click();
    });

    // UI to update experience should be visible
    const closeUpsertExpEl = getCloseUpsertExperienceUI();

    // Sync errors message should not be visible
    expect(getSyncErrorsMessageClose()).toBeNull();

    // When user closes update experience UI
    act(() => {
      closeUpsertExpEl.click();
    });

    // UI to update experience should not be visible
    expect(getCloseUpsertExperienceUI()).toBeNull();
  });
});

describe("update experience", () => {
  it("shows experience menu when entries can not be fetched", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // experience menu should be visible

    expect(getUpdateExperienceEl()).not.toBeNull();
  });

  it("shows experience menu when entries list is empty", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: emptyEntriesSuccessList,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // experience menu should be visible

    expect(getUpdateExperienceEl()).not.toBeNull();
  });

  it("updates experience successfully", async () => {
    mockUpdatedExperience = onlineExperience;
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // When show update experience UI button is clicked
    act(() => {
      getUpdateExperienceEl().click();
    });

    // Experience updated success notification should not be visible
    expect(getUpdateExperienceSuccessNotification()).toBeNull();

    // When experience updated successfully
    act(() => {
      getMockUpsertExperienceSuccess().click();
    });

    // Experience updated success notification should be visible
    await waitFor(getUpdateExperienceSuccessNotification);

    // After a little while
    act(() => {
      jest.runTimersToTime(MAX_TIMEOUT_MS);
    });

    // Experience updated success notification should not be visible
    expect(getUpdateExperienceSuccessNotification()).toBeNull();
  });
});

describe("sync", () => {
  it("syncs part online experience success, but with update errors", async () => {
    const onlineExperienceIdToOfflineEntriesMap = {
      [onlineId]: {
        [mockOfflineEntry1Id]: mockOfflineEntry1,
      },
    };

    mockUseWithSubscriptionContext.mockReturnValue({
      onSyncData: {
        onlineExperienceIdToOfflineEntriesMap,
        offlineIdToOnlineExperienceMap: {},
        syncErrors: {
          [onlineId]: {
            updateEntries: {
              [mockOfflineEntry1Id]: "a",
            },
          },
        },
        onlineExperienceUpdatedMap: {
          [onlineId]: true,
        },
      } as OnSyncedData,
    } as WithSubscriptionContextProps);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: offlineEntrySuccess,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Then error notification should be visible
    expect(getSyncErrorsNotificationEl()).not.toBeNull();

    // Offline entries should be removed from cache
    expect(mockCleanUpSyncedOfflineEntries).toHaveBeenCalledWith(
      onlineExperienceIdToOfflineEntriesMap,
    );

    // No experience should be removed from cache
    expect(mockCleanUpOfflineExperiences).not.toHaveBeenCalled();
  });
});

describe("reducers", () => {
  const mockHistoryPushFn = jest.fn();
  const props = {
    history: {
      push: mockHistoryPushFn as any,
    },
    match: {
      params: {},
    },
    updateExperiencesMutation: updateExperiencesMutation,
  } as Props;

  const mockDispatchFn = jest.fn();
  const effectArgs = {
    dispatch: mockDispatchFn,
  } as any;

  it("creates new entry, even if entries can not be fetched", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
      syncErrors: {
        entriesErrors: [
          [
            3,
            {
              others: [["a", "b"]],
            },
          ],
          [
            1,
            {
              others: [["a", "b"]],
            },
          ],
        ],
      },
    });

    const fetchEntriesFailState = (state.states as DataState).data.states
      .entries;

    expect(fetchEntriesFailState.value).toBe(StateValue.fail);

    state = reducer(state, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockOfflineEntry1,
        onlineStatus: StateValue.online,
      },
    });

    const stateAfterEntryCreated = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    expect(stateAfterEntryCreated.value).toBe(StateValue.fetchEntriesError);

    expect(
      stateAfterEntryCreated.fetchEntriesError.context.entries.length,
    ).toBe(1);

    state = reducer(state, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      oldData: {
        entry: mockOfflineEntry1,
        index: 0,
      },
      newData: {
        entry: mockOnlineEntry1,
        onlineStatus: StateValue.online,
      },
    });

    const stateAfterEntryCreated1 = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    const entries = stateAfterEntryCreated1.fetchEntriesError.context.entries;

    expect(entries.length).toBe(1);
    const entry = entries[0];

    expect(entry.entryData).toEqual(mockOnlineEntry1);

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects.filter(
      (e) => e.key === "deleteCreateEntrySyncErrorEffect",
    );

    const deleteCreateEntrySyncErrorEffect = effectFunctions[effect.key];

    mockGetSyncError.mockReturnValueOnce({
      a: 1,
    });

    deleteCreateEntrySyncErrorEffect(effect.ownArgs as any, props, effectArgs);

    expect(mockPersistFunc).toHaveBeenCalled();

    expect(mockPutOrRemoveSyncError.mock.calls[0]).toEqual([
      onlineId,
      {
        a: 1,
      },
    ]);
  });

  it("request 'delete experience'", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.offline,
      },
    });

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const effectFunc = effectFunctions[effect.key];

    mockGetDeleteExperienceLedger.mockReturnValueOnce({
      key: StateValue.requested,
    });

    effectFunc(effect.ownArgs as any, props, effectArgs);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);
    expect(mockDispatchFn.mock.calls[0][0]).toEqual({
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: StateValue.requested,
    });
  });

  it("fetches entries successfully even when there was previous error", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online, // oldEntry too ??
      },
    });

    const stateAfterEntryCreated = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    expect(stateAfterEntryCreated.value).toBe(StateValue.fetchEntriesError);

    state = reducer(state, {
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.success,
      pageInfo: {} as any,
      entries: [
        {
          entryData: {} as any,
        },
      ],
    });

    const stateAfterFetchEntriesSuccess = (state.states as DataState).data
      .states.entries as EntriesDataSuccessSate;

    expect(stateAfterFetchEntriesSuccess.value).toBe(StateValue.success);
    expect(stateAfterFetchEntriesSuccess.success.context).toEqual({
      pageInfo: {},
      entries: [
        {
          entryData: {},
        },
      ],
    });
  });

  it("fails to fetch entry, when entry fetch / creation fails", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online,
      },
    });

    const stateAfterEntryCreated = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    expect(stateAfterEntryCreated.value).toBe(StateValue.fetchEntriesError);

    state = reducer(state, {
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.fail,
      error: "a",
    });

    const stateAfterFetchEntriesFail = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    expect(stateAfterFetchEntriesFail.value).toBe(StateValue.fetchEntriesError);

    expect(
      stateAfterFetchEntriesFail.fetchEntriesError.context.fetchError,
    ).toEqual("a");
  });

  it("cancel delete experience", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: StateValue.requested,
    });

    state = reducer(state, {
      type: ActionType.DELETE_EXPERIENCE_CANCELLED,
    });

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const cancelDeleteExperienceEffect = effectFunctions[effect.key];

    expect(mockHistoryPushFn).not.toBeCalled();

    cancelDeleteExperienceEffect(effect.ownArgs as any, props, effectArgs);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0]).toEqual({
      key: StateValue.cancelled,
      id: onlineId,
      title: onlineExperience.title,
    });

    expect(mockHistoryPushFn).toBeCalled();
  });

  it("shows experience menu", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    expect(
      (state.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.inactive);

    state = reducer(state, {
      type: ActionType.TOGGLE_EXPERIENCE_MENU,
    });

    expect(
      (state.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.active);

    state = reducer(state, {
      type: ActionType.TOGGLE_EXPERIENCE_MENU,
    });

    expect(
      (state.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.inactive);
  });

  it("fetch experiences with timeouts", async () => {
    const state = initState();

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const fetchDetailedExperienceEffect = effectFunctions[effect.key];
    fetchDetailedExperienceEffect(effect.ownArgs as any, props, effectArgs);
    jest.runAllTimers();

    fetchDetailedExperienceEffect(effect.ownArgs as any, props, effectArgs);
    mockGetIsConnected.mockReturnValue(true);
    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);
  });

  it("throws error while fetching entries, then no success", async () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.RE_FETCH_ENTRIES,
    });

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const ownArgs = {
      pagination: {},
    } as any;

    const fetchEntriesEffect = effectFunctions[effect.key];

    const error = new Error("a");
    mockManuallyFetchEntries.mockRejectedValueOnce(error);
    await fetchEntriesEffect(ownArgs, props, effectArgs);

    expect(mockDispatchFn.mock.calls[0][0]).toEqual({
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.fail,
      error: error,
    });

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          __typename: "GetEntriesErrors",
          errors: {
            error: "b",
          },
        },
      },
    } as GetEntriesDetailViewQueryResult);

    await fetchEntriesEffect(ownArgs, props, effectArgs);

    expect(mockDispatchFn.mock.calls[1][0]).toEqual({
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.fail,
      error: "b",
    });

    await fetchEntriesEffect(ownArgs, props, effectArgs);
    expect(mockScrollIntoView).not.toHaveBeenCalled();
    jest.runTimersToTime(MAX_TIMEOUT_MS);
    expect(mockScrollIntoView.mock.calls[0][0]).toBe(nonsenseId);

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...mockOnlineEntry1Success,
          entries: {
            edges: [
              {
                node: {
                  id: "z",
                },
              },
            ],
            pageInfo: {},
          },
        },
      },
    } as GetEntriesDetailViewQueryResult);

    await fetchEntriesEffect(ownArgs, props, effectArgs);
    jest.runTimersToTime(MAX_TIMEOUT_MS);
    expect(mockScrollIntoView.mock.calls[1][0]).toBe("z");

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...mockOnlineEntry1Success,
          entries: {
            edges: [] as any,
            pageInfo: {},
          },
        },
      },
    } as GetEntriesDetailViewQueryResult);

    mockGetEntriesQuery.mockReturnValue({
      entries: {
        edges: [
          {
            node: {
              id: "t",
            },
          },
        ],
        pageInfo: {},
      },
    } as GetEntriesUnionFragment_GetEntriesSuccess);

    await fetchEntriesEffect(ownArgs, props, effectArgs);
    jest.runTimersToTime(MAX_TIMEOUT_MS);
    expect(mockScrollIntoView.mock.calls[2][0]).toBe("t");
  });

  it("deletes 'createEntries' and 'updateErrors' keys from sync errors / cleans up offline entries", async () => {
    const state = initState();

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const fetchDetailedExperienceEffect = effectFunctions[effect.key];

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue("a");
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: onlineOfflineEntriesSuccess,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mockGetSyncError.mockReturnValue({
      createEntries: {
        [mockOfflineEntry1Id]: {
          meta: {
            index: 0,
          },
          error: "a",
          clientId: null,
        } as CreateEntryErrorFragment,
      },
      updateEntries: {
        [mockOnlineEntry1Id]: "a" as UpdateEntrySyncErrors,
        [mockOfflineEntry1Id]: {
          a: {
            meta: {
              index: 1,
            },
            data: "a",
            error: "",
          } as DataObjectErrorFragment,
        } as UpdateEntrySyncErrors,
      },
    } as ExperienceSyncError);

    await fetchDetailedExperienceEffect(
      effect.ownArgs as any,
      props,
      effectArgs,
    );

    const callArgs = mockDispatchFn.mock.calls[0][0];

    expect(callArgs.syncErrors).toEqual({
      entriesErrors: [
        [
          1,
          {
            others: [["", "a"]],
          },
        ],
        [
          2,
          {
            others: [["error", "a"]],
          },
        ],
      ],
    });

    expect(mockCleanUpOfflineExperiences).toHaveBeenCalledWith({
      a: {},
    });
  });

  it("syncs entries even when there are entries fetch errors", async () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        onlineStatus: StateValue.online,
        entriesData: {
          key: StateValue.fail,
          error: "v",
        },
      },
    });

    let dataState = state.states as DataState;
    let entriesState = dataState.data.states.entries;

    expect(dataState.data.states.entries.value).toBe(StateValue.fail);

    state = reducer(state, {
      type: ActionType.ON_SYNC,
      syncErrors: {
        [onlineId]: {
          createEntries: {
            a: {} as any,
          },
        },
      },
    });

    dataState = state.states as DataState;
    entriesState = dataState.data.states.entries;

    expect(dataState.data.states.entries.value).toBe(StateValue.fail);

    state = reducer(state, {
      type: ActionType.ON_SYNC,
      onlineExperienceIdToOfflineEntriesMap: {
        [onlineId]: {
          [mockOfflineEntry1Id]: mockOfflineEntry1,
        },
      },
    });

    dataState = state.states as DataState;
    entriesState = dataState.data.states.entries;
    const entriesErrorState = entriesState as EntriesDataFailureState;
    const fetchEntriesErrorState = entriesState as FetchEntriesErrorState;

    expect(fetchEntriesErrorState.value).toBe(StateValue.fetchEntriesError);
    expect(fetchEntriesErrorState.fetchEntriesError.context).toEqual({
      entries: [
        {
          entryData: mockOfflineEntry1,
        },
      ],
      fetchError: entriesErrorState.error,
    });

    const [effect1] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects.filter(
      (f) => f.key === "fetchEntriesEffect",
    );

    expect(effect1.key).toBe("fetchEntriesEffect");
  });

  it("re-fetches entries on experience update success when entries already fetched successfully", async () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.success,
          entries: [
            {
              entryData: mockOnlineEntry1,
            },
          ],
          pageInfo: {} as any,
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
      experience: onlineExperience,
    });

    const effects = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects.filter(
      (e) => e.key === "fetchEntriesEffect",
    );

    const effect = effects[0];
    const fetchEntriesEffect = effectFunctions[effect.key];

    const clientId = new Date().toString();

    const updatedEntry = {
      ...mockOnlineEntry1,
      clientId,
    };

    mockGetEntriesQuery.mockReturnValue({
      entries: {
        edges: [
          {
            node: updatedEntry,
          },
        ],
      },
    } as GetEntriesUnionFragment_GetEntriesSuccess);

    mockDispatchFn.mockReset();

    await fetchEntriesEffect(effect.ownArgs as any, props, effectArgs);
    const dispatchOnFetchEntries = mockDispatchFn.mock.calls[0][0];

    state = reducer(state, dispatchOnFetchEntries);

    const dataState = state.states as DataState;
    const entriesState = dataState.data.states
      .entries as EntriesDataSuccessSate;
    expect(entriesState.success.context.entries[0].entryData.clientId).toBe(
      clientId,
    );
  });

  it("re-fetches entries on experience update success when entries fetch fails", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.fail,
          error: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    let dataState = state.states as DataState;
    let entriesState = dataState.data.states.entries;

    expect(dataState.data.states.entries.value).toBe(StateValue.fail);

    state = reducer(state, {
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.reFetchOnly,
      entries: {
        edges: [
          {
            node: mockOfflineEntry1,
          },
        ],
        pageInfo: {},
      } as EntryConnectionFragment,
    });

    dataState = state.states as DataState;
    entriesState = dataState.data.states.entries;
    const fetchEntriesErrorState = entriesState as FetchEntriesErrorState;

    expect(fetchEntriesErrorState.value).toBe(StateValue.fetchEntriesError);
    expect(fetchEntriesErrorState.fetchEntriesError.context).toEqual({
      entries: [
        {
          entryData: mockOfflineEntry1,
        },
      ],
      fetchError: "a",
    });
  });

  it("syncs offline experience but with update entries errors", async () => {
    let state = initState();

    const offlineExperienceId = makeOfflineId("tt");

    const offlineExperience = {
      ...onlineExperience,
      id: offlineExperienceId,
    };

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: offlineExperience,
        entriesData: {
          key: StateValue.success,
          entries: [
            {
              entryData: mockOnlineEntry1,
            },
          ],
          pageInfo: {} as any,
        },
        onlineStatus: StateValue.online,
      },
    });

    state = reducer(state, {
      type: ActionType.ON_SYNC,
      offlineIdToOnlineExperienceMap: {
        [offlineExperienceId]: onlineExperience,
        a: {} as any,
      },
      syncErrors: {
        [offlineExperienceId]: {
          updateEntries: {
            [mockOfflineEntry1Id]: "a",
          },
        },
      },
    });

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const postOfflineExperiencesSyncEffect = effectFunctions[effect.key];

    await postOfflineExperiencesSyncEffect(
      effect.ownArgs as any,
      props,
      effectArgs,
    );

    jest.runTimersToTime(MAX_TIMEOUT_MS);

    const mockPutOfflineExperienceIdInSyncFlag = putOfflineExperienceIdInSyncFlag as jest.Mock;

    expect(mockCleanUpOfflineExperiences).toBeCalledWith({
      a: {},
    });

    expect(mockPutOfflineExperienceIdInSyncFlag).toBeCalledWith([
      onlineId,
      offlineExperienceId,
    ]);

    const [path, type] = mockWindowChangeUrl.mock.calls[0];
    expect(path.includes(onlineId)).toBe(true);
    expect(type).toEqual(ChangeUrlType.replace);
  });

  it("syncs but with create entries errors", async () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.success,
          entries: [
            {
              entryData: mockOnlineEntry1,
            },
          ],
          pageInfo: {} as any,
        },
        onlineStatus: StateValue.online,
      },
    });

    let context = (state.states as DataState).data.context;
    expect(context.syncErrors).toBeUndefined();

    state = reducer(state, {
      type: ActionType.ON_SYNC,
      syncErrors: {
        [onlineId]: {
          createEntries: {
            [mockOnlineEntry1Id]: {
              __typename: "CreateEntryError",
            } as CreateEntryErrorFragment,
          },
        },
      },
    });

    context = (state.states as DataState).data.context;
    expect(context.syncErrors).toBeDefined();
  });

  it("handles errors while deleting entry", () => {
    let state = initState();

    // When data is received
    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        experience: onlineExperience,
        entriesData: {
          key: StateValue.success,
          entries: [
            {
              entryData: mockOnlineEntry1,
            },
          ],
          pageInfo: {} as any,
        },
        onlineStatus: StateValue.online,
      },
    });

    // Entry menu should not be active
    let optionsState = (state.states as DataState).data.states.entriesOptions;
    expect(optionsState.value).toBe(StateValue.inactive);

    // When user confirms entry deletion (without first making request)
    state = reducer(state, {
      type: ActionType.DELETE_ENTRY,
      key: StateValue.deleted,
    });

    // Entry menu should not be active
    optionsState = (state.states as DataState).data.states.entriesOptions;
    expect(optionsState.value).toBe(StateValue.inactive);

    // When user makes request to delete entry
    state = reducer(state, {
      type: ActionType.DELETE_ENTRY,
      key: StateValue.requested,
      entry: mockOnlineEntry1,
    });

    // Entry menu should be in requested state
    optionsState = (state.states as DataState).data.states.entriesOptions;
    expect(optionsState.value).toBe(StateValue.requested);

    // When user confirms entry deletion
    state = reducer(state, {
      type: ActionType.DELETE_ENTRY,
      key: StateValue.deleted,
    });

    // Entry menu should not be active
    optionsState = (state.states as DataState).data.states.entriesOptions;
    expect(optionsState.value).toBe(StateValue.inactive);

    const [effect] = (state.effects
      .general as GenericHasEffect<EffectType>).hasEffects.context.effects;

    const deleteEntryEffect = effectFunctions[effect.key];

    mockGetIsConnected.mockReturnValueOnce(true);

    const ownArgs = effect.ownArgs as any;
    deleteEntryEffect(ownArgs, props, effectArgs);

    let successFunc =
      mockUpdateExperiencesMutation.mock.calls[0][0].onUpdateSuccess;

    successFunc();

    let callArgs = mockDispatchFn.mock.calls[0][0];

    expect(callArgs).toMatchObject({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.errors,
      error: GENERIC_SERVER_ERROR,
    });
    expect(typeof callArgs.timeoutId).toBe("number");
    jest.runAllTimers();

    expect(mockDispatchFn.mock.calls[1][0]).toEqual({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.cancelled,
    });

    mockDispatchFn.mockReset();
    mockUpdateExperiencesMutation.mockReset();
    mockGetIsConnected.mockReturnValueOnce(true);
    deleteEntryEffect(ownArgs, props, effectArgs);

    successFunc =
      mockUpdateExperiencesMutation.mock.calls[0][0].onUpdateSuccess;

    successFunc({
      entries: {
        deletedEntries: [
          {
            __typename: "DeleteEntryErrors",
            errors: {
              error: "a",
            },
          },
        ],
      },
    });

    callArgs = mockDispatchFn.mock.calls[0][0];

    expect(callArgs).toMatchObject({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.errors,
      error: "a",
    });
    expect(typeof callArgs.timeoutId).toBe("number");
    jest.runAllTimers();

    mockDispatchFn.mockReset();
    mockUpdateExperiencesMutation.mockReset();
    mockGetIsConnected.mockReturnValueOnce(true);
    deleteEntryEffect(ownArgs, props, effectArgs);

    const onErrorFunc = mockUpdateExperiencesMutation.mock.calls[0][0].onError;

    onErrorFunc();
    callArgs = mockDispatchFn.mock.calls[0][0];

    expect(callArgs).toMatchObject({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.errors,
      error: GENERIC_SERVER_ERROR,
    });
    expect(typeof callArgs.timeoutId).toBe("number");
    jest.runAllTimers();

    mockDispatchFn.mockReset();
    mockGetIsConnected.mockReturnValueOnce(false);
    mockUpdateExperienceOfflineFn.mockReturnValue(undefined);
    deleteEntryEffect(ownArgs, props, effectArgs);

    callArgs = mockDispatchFn.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.errors,
      error: GENERIC_SERVER_ERROR,
    });
    expect(typeof callArgs.timeoutId).toBe("number");
  });
});

describe("Entry component", () => {
  it("deletes online and offline entries", async () => {
    mockGetIsConnected.mockReturnValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockUpdateExperienceOfflineFn.mockReturnValueOnce(onlineExperience);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: mockOnlineEntry1,
              },
              {
                node: mockOfflineEntry1,
              },
            ],
            pageInfo: {},
          } as EntryConnectionFragment,
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Online entry menu should not be active
    const entryMenuOnline = await waitFor(getEntryDropdown);
    expect(entryMenuOnline.classList).not.toContain(activeClassName);

    // online and offline entries should be visible
    expect(document.getElementById(mockOnlineEntry1.id)).not.toBeNull();
    expect(document.getElementById(mockOfflineEntry1.id)).not.toBeNull();

    // When online entry menu trigger is clicked
    const entryMenuTriggerOnline = getEntryDropdownTrigger();
    act(() => {
      entryMenuTriggerOnline.click();
    });

    // Online entry menu should be active
    expect(entryMenuOnline.classList).toContain(activeClassName);

    // When online entry menu trigger is clicked (while menu is active)
    act(() => {
      entryMenuTriggerOnline.click();
    });

    // Online entry menu should not be active
    expect(entryMenuOnline.classList).not.toContain(activeClassName);

    // When online entry menu trigger is clicked (the menu is inactive)
    act(() => {
      entryMenuTriggerOnline.click();
    });

    // Online entry menu should be active
    expect(entryMenuOnline.classList).toContain(activeClassName);

    // Offline entry menu should not be visible
    const entryMenuOffline = getEntryDropdown(1);
    expect(entryMenuOffline.classList).not.toContain(activeClassName);

    // When offline entry menu is clicked
    let entryMenuTriggerOffline = getEntryDropdownTrigger(1);
    act(() => {
      entryMenuTriggerOffline.click();
    });

    // Offline entry menu should be visible
    expect(entryMenuOffline.classList).toContain(activeClassName);

    // Online entry menu should not be visible
    expect(entryMenuOnline.classList).not.toContain(activeClassName);

    // When user clicks on experience menu

    getExperienceMenuTrigger().click();

    // Offline entry menu should not be visible
    expect(entryMenuOffline.classList).not.toContain(activeClassName);

    // When offline entry menu is clicked
    entryMenuTriggerOffline = getEntryDropdownTrigger(1);
    act(() => {
      entryMenuTriggerOffline.click();
    });

    // Offline entry menu should be visible
    expect(entryMenuOffline.classList).toContain(activeClassName);

    // When user clicks else where in the document
    act(() => {
      (document.getElementById(entriesContainerId) as HTMLElement).click();
    });

    // Offline entry menu should not be visible
    expect(entryMenuOffline.classList).not.toContain(activeClassName);

    // When user clicks delete option of online entry menu
    const deleteEntryOnline = getEntryDeleteMenuItem();

    deleteEntryOnline.click();

    // Delete entry confirmation dialog should be visible
    // When user clicks 'cancel' on the dialog
    act(() => {
      getCloseDeleteEntryConfirmation().click();
    });

    // Delete entry confirmation dialog should not be visible
    expect(getCloseDeleteEntryConfirmation()).toBeNull();

    // When user clicks delete option menu of online entry
    deleteEntryOnline.click();

    // Error notification should not be visible
    expect(getEntryDeleteFailNotification()).toBeNull();

    // When user clicks on 'ok' button of delete entry confirmation dialog
    act(() => {
      getOkDeleteEntry().click();
    });

    await waitFor(() => true);

    const errorFunc = mockUpdateExperiencesMutation.mock.calls[0][0].onError;

    act(() => {
      errorFunc(new Error("ttt"));
    });

    // Error notification should be visible

    const errorNotification = getEntryDeleteFailNotification();

    // Online entry should be in the document
    expect(document.getElementById(mockOnlineEntry1.id)).not.toBeNull();

    // document should be scrolled to show error notification
    expect(mockScrollDocumentToTop).toHaveBeenCalled();
    mockScrollDocumentToTop.mockReset();

    // When error notification is closed
    act(() => {
      errorNotification.click();
    });

    // Error notification should not be visible
    expect(getEntryDeleteFailNotification()).toBeNull();

    // When user clicks delete option menu of online entry
    deleteEntryOnline.click();

    // Notification that entry deleted should not be visible
    expect(getEntryDeletedNotification()).toBeNull();

    // When user clicks on 'ok' button of delete entry confirmation dialog
    act(() => {
      getOkDeleteEntry().click();
    });

    const successFunc =
      mockUpdateExperiencesMutation.mock.calls[1][0].onUpdateSuccess;

    act(() => {
      successFunc({
        entries: {
          deletedEntries: [
            {
              __typename: "DeleteEntrySuccess",
              entry: mockOnlineEntry1,
            },
          ],
        },
      });
    });

    // Online entry should not be in the document
    expect(document.getElementById(mockOnlineEntry1.id)).toBeNull();

    // Notification that entry deleted should be visible
    // When entry deleted notification is closed
    act(() => {
      getEntryDeletedNotification().click();
    });

    // Deleted entry notification should not be visible
    expect(getEntryDeletedNotification()).toBeNull();

    // When user clicks delete option of online entry menu
    const deleteEntryOffline = getEntryDeleteMenuItem();

    deleteEntryOffline.click();

    mockUpdateExperienceOfflineFn.mockReturnValueOnce(onlineExperience);

    // When user clicks on 'ok' button of delete entry confirmation dialog
    act(() => {
      getOkDeleteEntry().click();
    });

    // Notification that entry deleted should be visible
    expect(getEntryDeletedNotification()).not.toBeNull();

    // After a while
    act(() => {
      jest.runTimersToTime(MAX_TIMEOUT_MS);
    });

    // Notification that entry deleted should not be visible
    expect(getEntryDeletedNotification()).toBeNull();
  });

  it("updates entry", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: mockOnlineEntry1,
              },
            ],
            pageInfo: {},
          } as EntryConnectionFragment,
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();
    render(ui);

    // Update entry trigger UI should be visible
    const updateTriggerEl = await waitFor(getEntryUpdateMenuItem);

    // Upsert entry UI should not be visible
    expect(getDismissUpsertEntryUi()).toBeNull();

    // When update trigger is clicked
    updateTriggerEl.click();

    // Upsert entry UI should be visible
    expect(getDismissUpsertEntryUi()).not.toBeNull();
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
      experienceId: onlineExperience.id,
    },
  } as Match;

  return {
    ui: (
      <DetailExperienceP
        location={location}
        history={history}
        {...props}
        deleteExperiences={mockDeleteExperiences}
        componentTimeoutsMs={{ fetchRetries: [0], closeNotification: 0 }}
        updateExperiencesMutation={updateExperiencesMutation}
      />
    ),
  };
}

function getNoEntryEl() {
  return document.getElementById(noEntryTriggerId) as HTMLElement;
}

function getUpsertEntryTriggerEl() {
  return document
    .getElementsByClassName(newEntryMenuItemSelector)
    .item(0) as HTMLElement;
}

function getCloseUpsertEntryNotificationEl() {
  return document.getElementById(closeUpsertEntryNotificationId) as HTMLElement;
}

function getSyncErrorsNotificationEl() {
  return document.getElementById(syncErrorsNotificationId) as HTMLElement;
}

function getExperienceMenuTrigger() {
  return document
    .getElementsByClassName(experienceMenuTriggerSelector)
    .item(0) as HTMLDivElement;
}

function getCancelDeleteExperienceEl() {
  return document
    .getElementsByClassName("delete-experience__cancel-button")
    .item(0) as HTMLElement;
}

function getOkDeleteExperienceEl(index = 0) {
  return document
    .getElementsByClassName(deleteExperienceOkSelector)
    .item(index) as HTMLElement;
}

function getRefetchEntries() {
  return document.getElementById(refetchEntriesId) as HTMLElement;
}

function getFetchNextEntriesEl() {
  return document.getElementById(fetchNextEntriesId) as HTMLElement;
}

function getExperiencePaginationErrorEl() {
  return document
    .getElementsByClassName("detailed-experience__paginierung-error")
    .item(0);
}

function getUpdateEntryLaunchEl(index = 0) {
  return document
    .getElementsByClassName("detailed-experience__entry-edit")
    .item(index) as HTMLElement;
}

function getUpsertEntrySuccess() {
  return document.getElementById(mockUpsertEntrySuccessId) as HTMLElement;
}

function getDismissUpsertEntryUi() {
  return document.getElementById(mockDismissUpsertEntryUiId) as HTMLElement;
}

function getSyncErrorsMessageClose() {
  return document.getElementById(closeSyncErrorsMsgId) as HTMLElement;
}

function getSyncErrorsMessageFix() {
  return document.getElementById(fixSyncErrorsId) as HTMLElement;
}

function getCloseUpsertExperienceUI() {
  return document.getElementById(mockCloseUpsertExperienceId) as HTMLElement;
}

function getCloseSyncErrorsMsgBtn() {
  return document.getElementById(closeSyncErrorsMsgBtnId) as HTMLElement;
}

function getSyncEntriesErrors() {
  return document.getElementById(syncEntriesErrorsMsgId) as HTMLElement;
}

function getSyncExperienceErrors() {
  return document.getElementById(syncExperienceErrorsMsgId) as HTMLElement;
}

function getUpdateExperienceEl(index = 0) {
  return document
    .getElementsByClassName(editExperienceMenuItemSelector)
    .item(index) as HTMLElement;
}

function getUpdateExperienceSuccessNotification() {
  return document.getElementById(
    updateExperienceSuccessNotificationId,
  ) as HTMLElement;
}

function getMockUpsertExperienceSuccess() {
  return document.getElementById(mockUpsertExperienceSuccessId) as HTMLElement;
}

function getDeleteExperienceEl() {
  return document
    .getElementsByClassName(deleteExperienceMenuItemSelector)
    .item(0) as HTMLElement;
}

function getEntryDropdownTrigger(index = 0) {
  return document
    .getElementsByClassName(entryDropdownTriggerClassName)
    .item(index) as HTMLElement;
}

function getEntryDropdown(index = 0) {
  return document
    .getElementsByClassName(entryDropdownIsActiveClassName)
    .item(index) as HTMLElement;
}

function getExperienceMenu() {
  return document
    .getElementsByClassName(experienceMenuSelector)
    .item(0) as HTMLElement;
}

function getEntryDeleteMenuItem(index = 0) {
  return document
    .getElementsByClassName(entryDeleteMenuItemSelector)
    .item(index) as HTMLElement;
}

function getCloseDeleteEntryConfirmation() {
  return document.getElementById(closeDeleteEntryConfirmationId) as HTMLElement;
}

function getOkDeleteEntry() {
  return document.getElementById(okDeleteEntryId) as HTMLElement;
}

function getEntryDeletedNotification() {
  return document.getElementById(
    entryDeleteSuccessNotificationId,
  ) as HTMLElement;
}

function getEntryDeleteFailNotification() {
  return document.getElementById(entryDeleteFailNotificationId) as HTMLElement;
}

function getEntryUpdateMenuItem(index = 0) {
  return document
    .getElementsByClassName(entryUpdateMenuItemSelector)
    .item(index) as HTMLElement;
}
