/* eslint-disable @typescript-eslint/no-explicit-any */
import { activeClassName } from "@eb/jsx/src/DropdownMenu";
import {
  DeletedExperienceLedger,
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "@eb/shared/src/apollo/delete-experience-cache";
import { GetExperiencesConnectionListViewQueryResult } from "@eb/shared/src/apollo/get-experiences-connection-list.gql";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { getOnlineStatus } from "@eb/shared/src/apollo/unsynced-ledger";
import { purgeExperiencesFromCache1 } from "@eb/shared/src/apollo/update-get-experiences-list-view-query";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import {
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences_edges,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { makeOfflineId } from "@eb/shared/src/utils/offlines";
import {
  BroadcastMessageType,
  EbnisGlobals,
  StateValue,
} from "@eb/shared/src/utils/types";
import { componentTimeoutsMs } from "@eb/shared/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { My } from "../components/My/my.component";
import {
  activateInsertExperienceDomId,
  descriptionContainerSelector,
  descriptionShowHideSelector,
  descriptionTextSelector,
  domPrefix,
  dropdownMenuMenuSelector,
  dropdownTriggerSelector,
  fetchErrorRetryDomId,
  fetchNextSelector,
  isOfflineClassName,
  isPartOfflineClassName,
  noExperiencesActivateNewDomId,
  noSearchResultSelector,
  onDeleteExperienceCancelledNotificationId,
  onDeleteExperienceSuccessNotificationId,
  searchInputDomId,
  searchLinkSelector,
  updateExperienceMenuItemSelector,
  updateExperienceSuccessNotificationSelector,
} from "../components/My/my.dom";
import { handlePreFetchExperiences } from "../components/My/my.injectables";
import {
  ActionType,
  DataState,
  effectFunctions,
  EffectType,
  initState,
  Props,
  reducer,
} from "../components/My/my.utils";
import { cleanUpOfflineExperiences } from "../components/WithSubscriptions/with-subscriptions.utils";
import { fillField, getById } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { AppPersistor } from "../utils/app-context";
import { GenericHasEffect } from "../utils/effects";
import { FETCH_EXPERIENCES_TIMEOUTS, MAX_TIMEOUT_MS } from "../utils/timers";

const mockGetCachedExperiencesConnectionListViewFn = jest.fn();

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;

jest.mock("@eb/shared/src/apollo/sync-to-server-cache");

jest.mock("../components/My/my.injectables");
const mockHandlePreFetchExperiences = handlePreFetchExperiences as jest.Mock;

jest.mock("@eb/shared/src/apollo/update-get-experiences-list-view-query");
const mockPurgeExperiencesFromCache1 = purgeExperiencesFromCache1 as jest.Mock;

jest.mock("@eb/shared/src/apollo/delete-experience-cache");
const mockPutOrRemoveDeleteExperienceLedger =
  putOrRemoveDeleteExperienceLedger as jest.Mock;

const mockGetExperiencesConnectionListView = jest.fn();

jest.mock("@eb/shared/src/apollo/delete-experience-cache");
jest.mock("../utils/global-window");

const mockCloseUpsertExperienceUiId = "?-1?";
const mockOnUpsertExperienceSuccessUiId = "?-2?";
const mockUpsertExperienceOnErrorUiId = "?-3?";
const mockOnlineId = "?0?";
const mockTitle = "?1?";
const mockOnlineExperience = {
  id: mockOnlineId,
  title: mockTitle,
} as ExperienceCompleteFragment;
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: ({
    onSuccess,
    onClose,
    onError,
  }: {
    onSuccess: (experience: any) => void;
    onClose: () => void;
    onError: () => void;
  }) => {
    return (
      <div>
        <button
          id={mockOnUpsertExperienceSuccessUiId}
          onClick={() => {
            onSuccess(mockOnlineExperience);
          }}
        />

        <button id={mockCloseUpsertExperienceUiId} onClick={onClose} />

        <button id={mockUpsertExperienceOnErrorUiId} onClick={onError} />
      </div>
    );
  },
}));

const mockPartOfflineId = "?2?";
const offlineId = makeOfflineId(3);
const offlineExperience = {
  id: offlineId,
  title: "a",
} as ExperienceListViewFragment;

jest.mock("@eb/shared/src/apollo/unsynced-ledger");
const mockGetOnlineStatus = getOnlineStatus as jest.Mock;

jest.mock("react-router-dom", () => ({
  Link: ({ className = "", to, children }: any) => {
    to = typeof to === "string" ? to : JSON.stringify(to);

    return (
      <a className={className} href={to}>
        {children}
      </a>
    );
  },
}));

jest.mock("@eb/shared/src/utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

jest.mock("@eb/shared/src/apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;

jest.mock("@eb/shared/src/apollo/update-get-experiences-list-view-query");

const mockLoadingId = "l-o-a-d-i-n-g";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingId}></div>;
});

jest.mock("@eb/shared/src/apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

const mockHistoryPush = jest.fn();
const mockPersistFn = jest.fn();
const mockEvictFn = jest.fn();
const mockPostMsg = jest.fn();
const mockDispatch = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const ebnisObject = {
  persistor,
  cache: { evict: mockEvictFn } as any,
  bcBroadcaster: { postMessage: mockPostMsg } as any,
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
  jest.runTimersToTime(MAX_TIMEOUT_MS);
  jest.clearAllTimers();
  jest.resetAllMocks();
  ebnisObject.logApolloQueries = false;
  ebnisObject.logReducers = false;
});

describe("component", () => {
  it("connected/fetch experiences error/refetch but no experiences/activate upsert experience/deactivate", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetExperiencesConnectionListView.mockResolvedValue({
      error: new Error("a"),
    } as GetExperiencesConnectionListViewQueryResult);

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      expect(document.getElementById(mockLoadingId)).not.toBeNull();
      expect(getFetchErrorRetry()).toBeNull();

      const reFetchEl = await waitFor(() => {
        const el = getFetchErrorRetry();
        expect(el).not.toBeNull();
        return el;
      });

      mockGetExperiencesConnectionListView.mockResolvedValue({
        data: {
          getExperiences: {
            edges: [] as any,
          },
        },
      } as GetExperiencesConnectionListViewQueryResult);

      reFetchEl.click();

      expect(getNoExperiencesActivateNew()).toBeNull();
      jest.runTimersToTime(MAX_TIMEOUT_MS);

      const activateInsertExperienceBtnEl = await waitFor(() => {
        const el = getNoExperiencesActivateNew();
        expect(el).not.toBeNull();
        return el;
      });

      expect(getMockCloseUpsertExperienceUi()).toBeNull();

      activateInsertExperienceBtnEl.click();

      getMockCloseUpsertExperienceUi().click(); // exists

      jest.runTimersToTime(MAX_TIMEOUT_MS);

      expect(getMockCloseUpsertExperienceUi()).toBeNull();
    });
  });

  it("throws errors while fetching experiences/fetches cached experiences/re-fetch experiences request", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({
      connected: true,
    });

    mockGetExperiencesConnectionListView.mockRejectedValue(new Error("a"));

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      expect(document.getElementById(mockLoadingId)).not.toBeNull();

      expect(getFetchErrorRetry()).toBeNull();

      const reFetchEl = await waitFor(() => {
        const el = getFetchErrorRetry();
        expect(el).not.toBeNull();
        return el;
      });

      mockGetExperiencesConnectionListView.mockResolvedValueOnce({
        data: {
          getExperiences: {
            edges: [
              {
                node: {
                  id: mockOnlineId,
                  title: "a",
                },
              },
            ] as GetExperiencesConnectionListView_getExperiences_edges[],
            pageInfo: {
              hasNextPage: true,
            },
          },
        },
      } as GetExperiencesConnectionListViewQueryResult);

      reFetchEl.click();

      expect(getNoExperiencesActivateNew()).toBeNull();

      expect(getFetchNextExperience()).toBeNull();

      await waitFor(() => true);
      const fetchMoreExperiencesBtnEl = getFetchNextExperience();

      expect(getExperienceEl).not.toBeNull();
      expect(getExperienceEl("b")).toBeNull();
      jest.runTimersToTime(MAX_TIMEOUT_MS);
      expect(mockHandlePreFetchExperiences.mock.calls[0]).toEqual([
        [mockOnlineId],
        {
          [mockOnlineId]: {
            id: mockOnlineId,
            title: "a",
          },
        },
      ]);

      mockGetExperiencesConnectionListView.mockReturnValue({
        edges: [
          {
            node: {
              id: mockOnlineId,
              title: "a",
            },
          },
        ] as GetExperiencesConnectionListView_getExperiences_edges[],
        pageInfo: {
          hasNextPage: true,
        },
      } as GetExperiencesConnectionListView_getExperiences);

      mockGetExperiencesConnectionListView.mockResolvedValueOnce({
        data: {
          getExperiences: {
            edges: [
              {
                node: {
                  id: "b",
                  title: "b",
                },
              },
            ] as GetExperiencesConnectionListView_getExperiences_edges[],
            pageInfo: {},
          },
        },
      } as GetExperiencesConnectionListViewQueryResult);

      fetchMoreExperiencesBtnEl.click();
      jest.runTimersToTime(MAX_TIMEOUT_MS);

      await waitFor(() => {
        return getExperienceEl("b");
      });

      expect(getFetchNextExperience()).toBeNull();

      expect(getExperienceEl()).not.toBeNull();
    });
  });

  // MOCK DATA
  const mockGetCachedExperiencesConnectionListViewFnData1 = {
    edges: [
      {
        node: {
          id: mockPartOfflineId,
          title: "bb",
        },
      },
      {
        node: {
          id: offlineId,
          title: "cc",
          description: "cc",
        },
      },
    ] as GetExperiencesConnectionListView_getExperiences_edges[],
    pageInfo: {},
  } as GetExperiencesConnectionListView_getExperiences;

  it("interacts with description / offline Erfahrungen / teilweise online Erfahrungen", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetOnlineStatus
      .mockReturnValueOnce(StateValue.partOffline)
      .mockReturnValueOnce(StateValue.offline);

    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue(
      mockGetCachedExperiencesConnectionListViewFnData1,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      const partOfflineExperienceEl = await waitFor(() => {
        const el = getExperienceEl(mockPartOfflineId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(partOfflineExperienceEl.className).toContain(
        isPartOfflineClassName,
      );
      expect(partOfflineExperienceEl.className).not.toContain(
        isOfflineClassName,
      );

      const experiencesEls2 = getById(offlineId);
      expect(experiencesEls2.className).toContain(isOfflineClassName);
      expect(experiencesEls2.className).not.toContain(isPartOfflineClassName);

      // do not show description UI if no description
      expect((getDescriptionEl(partOfflineExperienceEl) as any).length).toBe(0);

      // zweite Erfahrung besitz Beschreibung
      const descriptionEl2 = getDescriptionEl(
        experiencesEls2,
        0,
      ) as HTMLElement;

      expect((getDescriptionEl(experiencesEls2) as any).length).toBe(1);

      // Beschreibung ist versteck
      expect(
        descriptionEl2.getElementsByClassName(descriptionTextSelector).length,
      ).toBe(0);

      // wir möchten Beschreibung anzeigen
      (
        descriptionEl2
          .getElementsByClassName(descriptionShowHideSelector)
          .item(0) as HTMLElement
      ).click();

      // Beschreibung ist gezeigt
      expect(
        descriptionEl2.getElementsByClassName(descriptionTextSelector).length,
      ).toBe(1);
    });
  });

  // MOCKED DATA
  const mockGetCachedExperiencesConnectionListViewFnData2 = {
    edges: [
      {
        node: {
          id: mockPartOfflineId,
          title: "bb",
        },
      },
    ] as GetExperiencesConnectionListView_getExperiences_edges[],
    pageInfo: {},
  } as GetExperiencesConnectionListView_getExperiences;

  it("interacts with options menu", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue(
      mockGetCachedExperiencesConnectionListViewFnData2,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      const experiencesEls0 = await waitFor(() => {
        const el = getExperienceEl(mockPartOfflineId);
        expect(el).not.toBeNull();
        return el;
      });

      const dropdownMenuEl0 = getDropdownMenu(experiencesEls0);

      expect(dropdownMenuEl0.classList).not.toContain(activeClassName);

      const dropdownTriggerEl = experiencesEls0
        .getElementsByClassName(dropdownTriggerSelector)
        .item(0) as HTMLElement;

      dropdownTriggerEl.click();

      // clear experiences menu
      const containerEl = getContainer();
      containerEl.click();

      expect(dropdownMenuEl0.classList).not.toContain(activeClassName);

      dropdownTriggerEl.click();
      expect(dropdownMenuEl0.classList).toContain(activeClassName);

      getDeleteExperienceMenu().click();

      expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].id).toBe(
        mockPartOfflineId,
      );

      expect(mockHistoryPush).toHaveBeenCalled();
    });
  });

  const mockGetExperiencesConnectionListViewData2 = {
    data: {
      getExperiences: {
        edges: [
          {
            node: {
              id: mockOnlineId,
              title: "aa",
            },
          },
        ] as GetExperiencesConnectionListView_getExperiences_edges[],
        pageInfo: {},
      } as GetExperiencesConnectionListView_getExperiences,
    },
  };

  it("Searches", async () => {
    mockGetIsConnected.mockReturnValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetExperiencesConnectionListView.mockResolvedValue(
      mockGetExperiencesConnectionListViewData2,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      await waitFor(() => {
        const el = getById(mockOnlineId);
        expect(el).not.toBeNull();
      });

      expect((getSearchLinks() as any).length).toBe(0);

      const searchInputEl = getSearchInputEl();

      fillField(searchInputEl, "a");

      const searchLinkEl = getSearchLinks(0) as HTMLAnchorElement;

      expect(searchLinkEl.href).toContain(mockOnlineId);

      expect(getSearchNoResultsEl().length).toBe(0);

      fillField(searchInputEl, "aaaaa");

      expect(getSearchNoResultsEl().length).toBe(1);

      expect((getSearchLinks() as any).length).toBe(0);

      getContainer().click();

      expect(getSearchNoResultsEl().length).toBe(0);
    });
  });

  const mockGetCachedExperiencesConnectionListViewFnData3 = {
    edges: [
      {
        node: {
          id: mockOnlineId,
          title: "aa",
        },
      },
      {
        node: {
          id: "bb",
          title: "bb",
        },
      },
    ] as GetExperiencesConnectionListView_getExperiences_edges[],
    pageInfo: {},
  } as GetExperiencesConnectionListView_getExperiences;

  it("deletes experience successfully", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue(
      mockGetCachedExperiencesConnectionListViewFnData3,
    );

    mockGetDeleteExperienceLedger.mockReturnValue({
      id: mockOnlineId,
      key: StateValue.deleted,
      title: "aa",
    } as DeletedExperienceLedger);

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      expect(getExperienceEl()).toBeNull();

      const deleteSuccessEl = await waitFor(() => {
        const el = getDeleteExperienceSuccessNotification();
        expect(el).not.toBeNull();
        return el;
      });

      expect(getExperienceEl("bb")).not.toBeNull();

      expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);
      expect(mockPurgeExperiencesFromCache1.mock.calls[0][0][0]).toBe(
        mockOnlineId,
      );
      expect(mockEvictFn.mock.calls[0][0].id).toEqual(mockOnlineId);
      expect(mockPersistFn).toHaveBeenCalled();
      expect(mockPostMsg.mock.calls[0][0]).toMatchObject({
        type: BroadcastMessageType.experienceDeleted,
        id: mockOnlineId,
        title: "aa",
      });

      deleteSuccessEl.click();

      expect(getDeleteExperienceSuccessNotification()).toBeNull();
    });
  });

  it("cancels experience deletion", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue({
      edges: [
        {
          node: {
            id: mockOnlineId,
            title: "aa",
          },
        },
      ] as GetExperiencesConnectionListView_getExperiences_edges[],
      pageInfo: {},
    } as GetExperiencesConnectionListView_getExperiences);

    mockGetDeleteExperienceLedger.mockReturnValue({
      key: StateValue.cancelled,
      title: "aa",
    } as DeletedExperienceLedger);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      const deleteExperienceCancelledEl = await waitFor(() => {
        const el = getDeleteExperienceCancelledNotification();
        expect(el).not.toBeNull();
        return el;
      });

      expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);

      expect(mockPurgeExperiencesFromCache1).not.toHaveBeenCalled();

      expect(mockEvictFn).not.toHaveBeenCalled();
      expect(mockPersistFn).not.toHaveBeenCalled();
      expect(mockPostMsg).not.toHaveBeenCalled();

      deleteExperienceCancelledEl.click();

      expect(getDeleteExperienceCancelledNotification()).toBeNull();
    });
  });

  const mockGetCachedExperiencesConnectionListViewFnData4 = {
    edges: [
      {
        node: {
          id: mockOnlineId,
          title: mockTitle,
        },
      },
    ] as GetExperiencesConnectionListView_getExperiences_edges[],
    pageInfo: {},
  } as GetExperiencesConnectionListView_getExperiences;

  it("updates experience", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue(
      mockGetCachedExperiencesConnectionListViewFnData4,
    );

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      const updateEl = await waitFor(() => {
        const el = getUpdateExperienceMenuItem();
        expect(el).not.toBeNull();
        return el;
      });

      updateEl.click();

      getMockOnUpsertExperienceSuccessUi().click();

      expect(getMockOnUpsertExperienceSuccessUi()).toBeNull();

      getUpdateExperienceSuccessNotificationCloseEl().click();

      expect(getUpdateExperienceSuccessNotificationCloseEl()).toBeNull();

      ////////////////////////// 2nd update ////////////////////////////

      updateEl.click();

      getMockOnUpsertExperienceSuccessUi().click();

      expect(getMockOnUpsertExperienceSuccessUi()).toBeNull();

      expect(getUpdateExperienceSuccessNotificationCloseEl()).not.toBeNull();

      await waitFor(() => {
        expect(getUpdateExperienceSuccessNotificationCloseEl()).toBeNull();
      });
    });
  });

  const mockGetCachedExperiencesConnectionListViewFnData5 = {
    edges: [
      {
        node: offlineExperience,
      },
      {
        node: {
          id: mockPartOfflineId,
          title: "b",
        },
      },
    ] as GetExperiencesConnectionListView_getExperiences_edges[],
    pageInfo: {},
  } as GetExperiencesConnectionListView_getExperiences;

  const mockUseWithSubscriptionContextData1 = {
    onSyncData: {
      offlineIdToOnlineExperienceMap: {
        [offlineId]: mockOnlineExperience,
      },

      onlineExperienceUpdatedMap: {
        [mockPartOfflineId]: {},
      },

      syncErrors: {
        [offlineId]: {},
        [mockPartOfflineId]: {},
      },
    },
  };

  it("updates experiences on sync / upsert experience on error", async () => {
    mockGetOnlineStatus
      .mockReturnValueOnce(StateValue.offline)
      .mockReturnValueOnce(StateValue.partOffline);

    // Given data just synced to backend
    mockUseWithSubscriptionContext.mockReturnValue(
      mockUseWithSubscriptionContextData1,
    );
    // And there is 1 offline and 1 part offline experiences in the system
    mockGetCachedExperiencesConnectionListViewFn.mockReturnValue(
      mockGetCachedExperiencesConnectionListViewFnData5,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      // Online experience should be visible

      const onlineExperienceEl = await waitFor(() => {
        const el = getExperienceEl();
        expect(el).not.toBeNull();
        return el;
      });
      expect(onlineExperienceEl.className).toContain(isPartOfflineClassName);
      expect(onlineExperienceEl.className).not.toContain(isOfflineClassName);

      // Offline experience should never be visible because it is immediately
      // synced
      expect(getExperienceEl(offlineId)).toBeNull();

      // Part offline experience should be visible and become online
      const partOfflineExperienceEl = getExperienceEl(mockPartOfflineId);
      expect(partOfflineExperienceEl.className).not.toContain(
        isPartOfflineClassName,
      );
      expect(partOfflineExperienceEl.className).not.toContain(
        isOfflineClassName,
      );

      expect(mockCleanUpOfflineExperiences).toBeCalledWith({
        [offlineId]: mockOnlineExperience,
      });

      expect(getMockUpsertExperienceOnError()).toBeNull();

      getActivateInsertExperience().click();

      getMockUpsertExperienceOnError().click();

      expect(getMockUpsertExperienceOnError()).toBeNull();
    });
  });
});

describe("reducer", () => {
  const effectArgs = {
    dispatch: mockDispatch,
  } as any;

  const props = {
    getCachedExperiencesConnectionListViewFn:
      mockGetCachedExperiencesConnectionListViewFn,
    getExperienceConnectionListView: mockGetExperiencesConnectionListView,
    componentTimeoutsMs,
  } as any;

  it("fetches experiences when no network", async () => {
    ebnisObject.logReducers = true;
    // ebnisObject.logApolloQueries = true;
    const state = initState();

    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const fetchExperiencesEffect = effectFunctions[effect.key];
    await fetchExperiencesEffect({} as any, props, effectArgs);
    expect(mockDispatch).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(mockDispatch.mock.calls[0][0].key).toEqual(StateValue.errors);

    mockGetIsConnected.mockReturnValue(true);
  });

  it("fetches experiences: first no network, then later there is network", async () => {
    const state = initState();

    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const fn = effectFunctions[effect.key];
    await fn({} as any, props, effectArgs);
    mockGetIsConnected.mockReturnValue(true);

    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);

    await waitFor(() => true);
    expect(mockDispatch.mock.calls[0][0].key).toEqual(StateValue.errors);

    mockGetIsConnected.mockReturnValue(true);
  });

  it("sets online status to 'online' when on synced experience has no errors", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.on_data_received,
      key: StateValue.data,
      preparedExperiences: [],
      data: {
        experiences: [
          {
            experience: offlineExperience,
            onlineStatus: StateValue.partOffline,
            syncError: {},
          },
        ],
        pageInfo: {} as any,
      },
    });

    let context = (state.states as DataState).data.context;

    expect(context.experiences[0]).toEqual({
      experience: offlineExperience,
      onlineStatus: StateValue.partOffline,
      syncError: {},
    });

    state = reducer(state, {
      type: ActionType.on_sync,
      data: {
        offlineIdToOnlineExperienceMap: {
          [offlineId]: mockOnlineExperience,
        },
      },
    });

    context = (state.states as DataState).data.context;

    expect(context.experiences[0]).toEqual({
      experience: mockOnlineExperience,
      onlineStatus: StateValue.online,
    });
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const MyP = My as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  const location = (props.location || {}) as any;

  const history = {
    push: mockHistoryPush,
  } as any;

  return {
    ui: (
      <MyP
        getExperienceConnectionListView={mockGetExperiencesConnectionListView}
        {...props}
        location={location}
        history={history}
        componentTimeoutsMs={componentTimeoutsMs}
        getCachedExperiencesConnectionListViewFn={
          mockGetCachedExperiencesConnectionListViewFn
        }
        HeaderComponentFn={() => null as any}
      />
    ),
  };
}

function getContainer() {
  return document.getElementById(domPrefix) as HTMLElement;
}

function getFetchErrorRetry() {
  return document.getElementById(fetchErrorRetryDomId) as HTMLElement;
}

function getNoExperiencesActivateNew() {
  return document.getElementById(noExperiencesActivateNewDomId) as HTMLElement;
}

function getMockCloseUpsertExperienceUi() {
  return document.getElementById(mockCloseUpsertExperienceUiId) as HTMLElement;
}

function getFetchNextExperience(index = 0) {
  return document
    .getElementsByClassName(fetchNextSelector)
    .item(index) as HTMLElement;
}

function getExperienceEl(id: string = mockOnlineId) {
  return document.getElementById(id) as HTMLElement;
}

function getDropdownMenu(parentEl: HTMLElement, index = 0) {
  return parentEl
    .getElementsByClassName(dropdownMenuMenuSelector)
    .item(index) as HTMLElement;
}

function getDeleteExperienceMenu(index = 0) {
  return document
    .getElementsByClassName("delete-experience-menu-item")
    .item(index) as HTMLElement;
}

function getSearchLinks(index?: number) {
  const parentEl = document.getElementsByClassName(searchLinkSelector);
  return index === undefined
    ? parentEl
    : (parentEl.item(index) as HTMLAnchorElement);
}

function getSearchNoResultsEl() {
  return document.getElementsByClassName(noSearchResultSelector);
}

function getSearchInputEl() {
  return document.getElementById(searchInputDomId) as HTMLElement;
}

function getDeleteExperienceSuccessNotification() {
  return document.getElementById(
    onDeleteExperienceSuccessNotificationId,
  ) as HTMLElement;
}

function getDeleteExperienceCancelledNotification() {
  return document.getElementById(
    onDeleteExperienceCancelledNotificationId,
  ) as HTMLElement;
}

function getUpdateExperienceMenuItem(index = 0) {
  return document
    .getElementsByClassName(updateExperienceMenuItemSelector)
    .item(index) as HTMLElement;
}

function getMockOnUpsertExperienceSuccessUi() {
  return document.getElementById(
    mockOnUpsertExperienceSuccessUiId,
  ) as HTMLElement;
}

function getUpdateExperienceSuccessNotificationCloseEl(index = 0) {
  return document
    .getElementsByClassName(updateExperienceSuccessNotificationSelector)
    .item(index) as HTMLElement;
}

function getDescriptionEl(parentEl: HTMLElement, index?: number) {
  const els = parentEl.getElementsByClassName(descriptionContainerSelector);

  return index === undefined ? els : (els.item(index) as HTMLElement);
}

function getActivateInsertExperience() {
  return document.getElementById(activateInsertExperienceDomId) as HTMLElement;
}

function getMockUpsertExperienceOnError() {
  return document.getElementById(
    mockUpsertExperienceOnErrorUiId,
  ) as HTMLElement;
}
