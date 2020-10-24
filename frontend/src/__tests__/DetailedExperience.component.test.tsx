/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars*/
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement, wait } from "@testing-library/react";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  Props,
  ActionType,
  Match,
  initState,
  reducer,
  DataState,
  FetchEntriesErrorState,
  EffectType,
  effectFunctions,
  EntriesDataSuccessSate,
  EntriesDataFailureState,
  ExperienceSyncError,
} from "../components/DetailExperience/detailed-experience-utils";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import {
  closeUpsertEntryNotificationId,
  syncErrorsNotificationId,
  noEntryTriggerId,
  refetchExperienceId,
  refetchEntriesId,
  fetchNextEntriesId,
  closeSyncErrorsMsgId,
  fixSyncErrorsId,
  closeSyncErrorsMsgBtnId,
  syncEntriesErrorsMsgId,
  syncExperienceErrorsMsgId,
  updateExperienceSuccessNotificationId,
} from "../components/DetailExperience/detail-experience.dom";
import { act } from "react-dom/test-utils";
import { makeOfflineId } from "../utils/offlines";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import {
  upsertExperiencesInGetExperiencesMiniQuery,
  purgeExperience,
} from "../apollo/update-get-experiences-mini-query";
import {
  E2EWindowObject,
  StateValue,
  FETCH_EXPERIENCES_TIMEOUTS,
  OnlineStatus,
} from "../utils/types";
import { removeUnsyncedExperiences } from "../apollo/unsynced-ledger";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../apollo/delete-experience-cache";
import { getIsConnected } from "../utils/connections";
import {
  manuallyFetchDetailedExperience,
  DetailedExperienceQueryResult,
  DeleteExperiencesMutationResult,
  manuallyFetchEntries,
  GetEntriesQueryResult,
} from "../utils/experience.gql.types";
import { useDeleteExperiencesMutation } from "../components/DetailExperience/detail-experience.injectables";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import {
  getCachedExperience,
  getEntriesQuerySuccess,
} from "../apollo/get-detailed-experience-query";
import { activeClassName, nonsenseId } from "../utils/utils.dom";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { GenericHasEffect } from "../utils/effects";
import { scrollIntoView } from "../utils/scroll-into-view";
import { getSyncError } from "../apollo/sync-to-server-cache";
import { Props as NewEntryProps } from "../components/UpsertEntry/upsert-entry.utils";
import {
  OfflineIdToCreateEntrySyncErrorMap,
  SyncError,
  UpdateEntrySyncErrors,
  OnSyncedData,
} from "../utils/sync-to-server.types";
import { DefinitionErrorFragment } from "../graphql/apollo-types/DefinitionErrorFragment";
import { Props as UpsertExperienceProps } from "../components/UpsertExperience/upsert-experience.utils";
import { DataObjectErrorFragment } from "../graphql/apollo-types/DataObjectErrorFragment";
import { WithSubscriptionContextProps } from "../utils/app-context";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../components/WithSubscriptions/with-subscriptions.utils";

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;
const mockCleanUpSyncedOfflineEntries = cleanUpSyncedOfflineEntries as jest.Mock;

jest.mock("../apollo/sync-to-server-cache");
const mockGetSyncError = getSyncError as jest.Mock;

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockGetCachedExperience = getCachedExperience as jest.Mock;

const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;

jest.mock("../components/Header/header.component", () => () => null);

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockDeleteExperiences = jest.fn();
const mockUseDeleteExperiencesMutation = useDeleteExperiencesMutation as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchDetailedExperience = manuallyFetchDetailedExperience as jest.Mock;
const mockManuallyFetchEntries = manuallyFetchEntries as jest.Mock;

const mockGetIsConnected = getIsConnected as jest.Mock;
jest.mock("../utils/connections");

jest.mock("../apollo/delete-experience-cache");

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = upsertExperiencesInGetExperiencesMiniQuery as jest.Mock;
const mockPurgeExperience = purgeExperience as jest.Mock;

const mockUpsertEntrySuccessId = "?a?";
const mockDismissUpsertEntryUiId = "?b?";
const mockActionType = ActionType;
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
let mockUpdatedExperience: undefined | ExperienceFragment = undefined;
let mockUpdatedExperienceOnlineStatus: undefined | OnlineStatus = undefined;
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: ({ onClose, onSuccess }: UpsertExperienceProps) => {
    return (
      <div>
        <button id={mockCloseUpsertExperienceId} onClick={onClose} />
        <button
          id={mockUpsertExperienceSuccessId}
          onClick={() => {
            onSuccess(
              mockUpdatedExperience as ExperienceFragment,
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
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  delete window.____ebnis;
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.resetAllMocks();
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
} as ExperienceFragment;

const entryOfflineClassName = "entry--is-danger";

const onlineEntryClientId = "aa";
const onlineEntryId = "a";

const onlineEntry = {
  __typename: "Entry",
  id: onlineEntryId,
  clientId: onlineEntryClientId,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      id: "a",
      definitionId: "1",
      data: `{"integer":1}`,
    },
  ],
} as EntryFragment;

const onlineEntrySuccess = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: onlineEntry,
      },
    ],
    pageInfo: {},
  },
};

const offlineEntryId = makeOfflineId("b");
const offlineEntry = {
  __typename: "Entry",
  id: offlineEntryId,
  clientId: offlineEntryId,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      id: "a",
      definitionId: "1",
      data: `{"integer":1}`,
    },
  ],
} as EntryFragment;

const offlineEntrySuccess = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: offlineEntry,
      },
    ],
    pageInfo: {},
  },
};

const onlineOfflineEntriesSuccess = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: onlineEntry,
      },
      {
        node: offlineEntry,
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
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    render(ui);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();
    expect(document.getElementById(refetchExperienceId)).toBeNull();

    jest.runAllTimers();
    const refetchExperienceBtn = await waitForElement(() => {
      return document.getElementById(refetchExperienceId) as HTMLElement;
    });

    mockManuallyFetchDetailedExperience.mockRejectedValueOnce(new Error("b"));

    refetchExperienceBtn.click();
    jest.runAllTimers();

    await wait(() => true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
      },
    } as DetailedExperienceQueryResult);

    refetchExperienceBtn.click();
    jest.runAllTimers();

    expect(getRefetchEntries()).toBeNull();
    const refetchEntriesEl = await waitForElement(getRefetchEntries);

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...onlineEntrySuccess,
          entries: {
            edges: [] as any,
            pageInfo: {},
          },
        },
      },
    } as GetEntriesQueryResult);

    act(() => {
      refetchEntriesEl.click();
    });

    expect(getNoEntryEl()).toBeNull();
    jest.runAllTimers();
    const noEntryEl = await waitForElement(getNoEntryEl);

    expect(document.getElementById(mockDismissUpsertEntryUiId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entlassenNeuEintragUiEl = await waitForElement(() => {
      return document.getElementById(mockDismissUpsertEntryUiId) as HTMLElement;
    });

    act(() => {
      entlassenNeuEintragUiEl.click();
    });

    expect(document.getElementById(mockDismissUpsertEntryUiId)).toBeNull();

    expect(document.getElementById(mockUpsertEntrySuccessId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entryEl = document.getElementById(
      mockUpsertEntrySuccessId,
    ) as HTMLElement;

    expect(getCloseUpsertEntryNotificationEl()).toBeNull();
    expect(getSyncErrorsNotificationEl()).toBeNull();

    act(() => {
      entryEl.click();
    });

    const schließNeuEintragEl = getCloseUpsertEntryNotificationEl();
    const entryErrorMsgEl = getSyncErrorsNotificationEl();

    act(() => {
      schließNeuEintragEl.click();
    });

    expect(getCloseUpsertEntryNotificationEl()).toBeNull();
  });

  it("fetches entries from cache/deletes experience", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: onlineEntrySuccess,
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    render(ui);

    const menuEl = getMenuEl();
    const menuSiblingEl = menuEl.previousSibling as HTMLElement;

    expect(menuSiblingEl.classList).not.toContain(activeClassName);

    act(() => {
      menuEl.click();
    });

    expect(menuSiblingEl.classList).toContain(activeClassName);

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

    await wait(() => true);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].key).toBe(
      StateValue.deleted,
    );

    expect(mockRemoveUnsyncedExperiences.mock.calls[0][0][0]).toBe(onlineId);

    expect(mockPersistFunc).toHaveBeenCalled();

    expect(mockHistoryPushFn).toHaveBeenCalled();
  });

  it("entries pagination", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({ connected: true });

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: onlineEntry,
              },
            ],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      },
    } as DetailedExperienceQueryResult);

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

    await waitForElement(getExperiencePaginationErrorEl);

    mockUseWithSubscriptionContext.mockReturnValue({});

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...onlineEntrySuccess,
          entries: {
            edges: [
              {
                node: {
                  ...onlineEntry,
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
    } as GetEntriesQueryResult);

    act(() => {
      fetchNextEntriesEl.click();
    });

    expect(document.getElementById("b")).toBeNull();

    await waitForElement(() => {
      return document.getElementById("b");
    });

    expect(getExperiencePaginationErrorEl()).toBeNull();
    // weil es gibt kein Netzwerk
    expect(getFetchNextEntriesEl()).toBeNull();
  });

  it("entry sync errors", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetSyncError.mockReturnValue({
      createEntries: {
        [onlineEntry.id]: {
          error: "a",
        },
      } as OfflineIdToCreateEntrySyncErrorMap,
    });

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: onlineEntry,
              },
            ],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    render(ui);
    expect(document.getElementById(mockUpsertEntrySuccessId)).toBeNull();

    act(() => {
      getUpdateEntryLaunchEl().click();
    });

    act(() => {
      (document.getElementById(
        mockUpsertEntrySuccessId,
      ) as HTMLElement).click();
    });

    act(() => {
      jest.runAllTimers();
    });
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
    });

    const fetchEntriesFailState = (state.states as DataState).data.states
      .entries;

    expect(fetchEntriesFailState.value).toBe(StateValue.fail);

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

    expect(
      stateAfterEntryCreated.fetchEntriesError.context.entries.length,
    ).toBe(1);

    state = reducer(state, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online,
      },
    });

    const stateAfterEntryCreated1 = (state.states as DataState).data.states
      .entries as FetchEntriesErrorState;

    expect(
      stateAfterEntryCreated1.fetchEntriesError.context.entries.length,
    ).toBe(2);
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

    const [effect] = (state.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

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

    expect(stateAfterEntryCreated.value).toBe(
      StateValue.fetchEntriesError,
    );

    state = reducer(state, {
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.success,
      seiteInfo: {} as any,
      entries: [
        {
          entryData: {} as any,
        },
      ],
    });

    const stateAfterFetchEntriesSuccess = (state.states as DataState).data.states
      .entries as EntriesDataSuccessSate;

    expect(stateAfterFetchEntriesSuccess.value).toBe(StateValue.success);
    expect(stateAfterFetchEntriesSuccess.success.context).toEqual({
      seiteInfo: {},
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

    const [wirkung] = (state.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc = effectFunctions[wirkung.key];

    expect(mockHistoryPushFn).not.toBeCalled();

    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);

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
    let state = initState();

    const [wirkung] = (state.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc = effectFunctions[wirkung.key];
    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);
    jest.runAllTimers();

    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);
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

    const [wirkung] = (state.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const ownArgs = {
      pagination: {},
    } as any;
    const wirkungFunc = effectFunctions[wirkung.key];

    const error = new Error("a");
    mockManuallyFetchEntries.mockRejectedValueOnce(error);
    await wirkungFunc(ownArgs, props, effectArgs);

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
    } as GetEntriesQueryResult);

    await wirkungFunc(ownArgs, props, effectArgs);

    expect(mockDispatchFn.mock.calls[1][0]).toEqual({
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.fail,
      error: "b",
    });

    await wirkungFunc(ownArgs, props, effectArgs);
    expect(mockScrollIntoView).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(mockScrollIntoView.mock.calls[0][0]).toBe(nonsenseId);

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...onlineEntrySuccess,
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
    } as GetEntriesQueryResult);

    await wirkungFunc(ownArgs, props, effectArgs);
    jest.runAllTimers();
    expect(mockScrollIntoView.mock.calls[1][0]).toBe("z");

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...onlineEntrySuccess,
          entries: {
            edges: [] as any,
            pageInfo: {},
          },
        },
      },
    } as GetEntriesQueryResult);

    mockGetEntriesQuerySuccess.mockReturnValue({
      edges: [
        {
          node: {
            id: "t",
          },
        },
      ],
      pageInfo: {},
    });

    await wirkungFunc(ownArgs, props, effectArgs);
    jest.runAllTimers();
    expect(mockScrollIntoView.mock.calls[2][0]).toBe("t");
  });

  it("deletes 'createEntries' and 'updateErrors' keys from sync errors", async () => {
    let state = initState();

    const [wirkung] = (state.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc = effectFunctions[wirkung.key];

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: onlineOfflineEntriesSuccess,
      },
    } as DetailedExperienceQueryResult);

    mockGetSyncError.mockReturnValue({
      createEntries: {
        [offlineEntryId]: {
          meta: {
            index: 0,
          },
          error: "a",
          clientId: null,
        } as CreateEntryErrorFragment,
      },
      updateEntries: {
        [onlineEntryId]: "a" as UpdateEntrySyncErrors,
        [offlineEntryId]: {
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

    await wirkungFunc(wirkung.ownArgs as any, props, effectArgs);

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
  });
});

describe("upsert experience on sync", () => {
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

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: onlineEntrySuccess,
      },
    } as DetailedExperienceQueryResult);

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
    expect(getUpsertEntrySuccess()).toBeNull();

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
        [offlineEntryId]: {
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

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: offlineEntrySuccess,
      },
    } as DetailedExperienceQueryResult);

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
        [onlineEntryId]: "a" as UpdateEntrySyncErrors,
        [offlineEntryId]: {
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

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: onlineOfflineEntriesSuccess,
      },
    } as DetailedExperienceQueryResult);

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
});

describe("update experience", () => {
  it("shows experience menu when entries can not be fetched", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    const { debug } = render(ui);

    // experience menu should be visible

    expect(getUpdateExperienceEl()).not.toBeNull();
  });

  it("shows experience menu when entries list is empty", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: emptyEntriesSuccessList,
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    const { debug } = render(ui);

    // experience menu should be visible

    expect(getUpdateExperienceEl()).not.toBeNull();
  });

  it("updates experience successfully", async () => {
    mockUpdatedExperience = onlineExperience;
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    const { debug } = render(ui);

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
    const updateSuccessUi = await waitForElement(
      getUpdateExperienceSuccessNotification,
    );

    expect(updateSuccessUi).not.toBeNull();

    // After a little while
    act(() => {
      jest.runAllTimers();
    });

    // Experience updated success notification should not be visible
    expect(getUpdateExperienceSuccessNotification()).toBeNull();
  });
});

describe("sync", () => {
  it("syncs part online experience success, but with update errors", async () => {
    const onlineExperienceIdToOfflineEntriesMap = {
      [onlineId]: {
        [offlineEntryId]: offlineEntry,
      },
    };

    mockUseWithSubscriptionContext.mockReturnValue({
      onSyncData: {
        onlineExperienceIdToOfflineEntriesMap,
        offlineIdToOnlineExperienceMap: {},
        syncErrors: {
          [onlineId]: {
            updateEntries: {
              [offlineEntryId]: "a",
            },
          },
        },
        onlineExperienceUpdatedMap: {
          [onlineId]: true,
        },
      } as OnSyncedData,
    } as WithSubscriptionContextProps);

    mockGetCachedExperience.mockReturnValueOnce({
      data: {
        getExperience: {
          ...onlineExperience,
        },
        getEntries: offlineEntrySuccess,
      },
    } as DetailedExperienceQueryResult);

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

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  mockUseDeleteExperiencesMutation.mockReturnValue([mockDeleteExperiences]);
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
    ui: <DetailExperienceP location={location} history={history} {...props} />,
  };
}

function getNoEntryEl() {
  return document.getElementById(noEntryTriggerId) as HTMLElement;
}

function getEntriesEl() {
  return document.getElementsByClassName("entries").item(0) as HTMLElement;
}

function getUpsertEntryTriggerEl() {
  return document
    .getElementsByClassName("upsert-entry-trigger")
    .item(0) as HTMLElement;
}

function getCloseUpsertEntryNotificationEl() {
  return document.getElementById(closeUpsertEntryNotificationId) as HTMLElement;
}

function getSyncErrorsNotificationEl() {
  return document.getElementById(syncErrorsNotificationId) as HTMLElement;
}

function getMenuEl() {
  return document
    .getElementsByClassName("top-options-menu")
    .item(0) as HTMLDivElement;
}

function getCancelDeleteExperienceEl() {
  return document
    .getElementsByClassName("delete-experience__cancel-button")
    .item(0) as HTMLElement;
}

function getOkDeleteExperienceEl() {
  return document
    .getElementsByClassName("delete-experience__ok-button")
    .item(0) as HTMLElement;
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

function getUpdateEntryLaunchEl(index: number = 0) {
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

function getUpdateExperienceEl(index: number = 0) {
  return document
    .getElementsByClassName("detailed__edit-experience-link")
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
    .getElementsByClassName("delete-experience-link")
    .item(0) as HTMLElement;
}
