/* eslint-disable @typescript-eslint/no-explicit-any */
import { activeClassName } from "@eb/jsx/src/DropdownMenu";
import { DeletedExperienceLedger } from "@eb/shared/src/apollo/delete-experience-cache";
import { GetExperiencesConnectionListViewQueryResult } from "@eb/shared/src/apollo/get-experiences-connection-list.gql";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import {
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences_edges,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
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
import {
  ActionType,
  DataState,
  initState,
  Props,
  reducer,
} from "../components/My/my.utils";
import {
  fillField,
  getAllByClass,
  getById,
  getOneByClass,
} from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { AppPersistor } from "../utils/app-context";

const mockGetUnsyncedExperienceInject = jest.fn();
const mockGetCachedExperiencesConnectionListViewFn = jest.fn();
const mockCleanUpOfflineExperiencesFn = jest.fn();
const mockGetSyncErrorsFn = jest.fn();
const mockHandlePreFetchExperiences = jest.fn();
const mockPurgeExperiencesFromCache1 = jest.fn();
const mockPutOrRemoveDeleteExperienceLedger = jest.fn();
const mockGetExperiencesConnectionListView = jest.fn();
const mockGetDeleteExperienceLedger = jest.fn();
const mockGetOnlineStatusProps = jest.fn();
const mockSetUpRoutePage = jest.fn();
const mockGetIsConnected = jest.fn();
const mockUseWithSubscriptionContext = jest.fn();

const mockLoadingId = "l-o-a-d-i-n-g";
const mockCloseUpsertExperienceUiId = "?-1?";
const mockOnUpsertExperienceSuccessUiId = "?-2?";
const mockUpsertExperienceOnErrorUiId = "?-3?";
const mockOnlineId = "?0?";
const mockTitle = "?1?";
const mockOnlineExperience = {
  id: mockOnlineId,
  title: mockTitle,
} as ExperienceCompleteFragment;

const mockPartOfflineId = "?2?";
const offlineId = makeOfflineId(3);
const offlineExperience = {
  id: offlineId,
  title: "a",
} as ExperienceListViewFragment;

const mockHistoryPush = jest.fn();
const mockPersistFn = jest.fn();
const mockEvictFn = jest.fn();
const mockPostMsg = jest.fn();

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
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  jest.clearAllMocks();
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
      expect(getById(fetchErrorRetryDomId)).toBeNull();

      const reFetchEl = await waitFor(() => {
        const el = getById(fetchErrorRetryDomId);
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

      expect(getById(noExperiencesActivateNewDomId)).toBeNull();

      const activateInsertExperienceBtnEl = await waitFor(() => {
        const el = getById(noExperiencesActivateNewDomId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockCloseUpsertExperienceUiId)).toBeNull();

      activateInsertExperienceBtnEl.click();

      getById(mockCloseUpsertExperienceUiId).click(); // exists

      expect(getById(mockCloseUpsertExperienceUiId)).toBeNull();
    });
  });

  it("throws errors while fetching experiences/fetches cached experiences/re-fetch experiences request", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({
      connected: true,
    });

    mockGetExperiencesConnectionListView.mockRejectedValueOnce(new Error("a"));

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      expect(document.getElementById(mockLoadingId)).not.toBeNull();

      expect(getById(fetchErrorRetryDomId)).toBeNull();

      const reFetchEl = await waitFor(() => {
        const el = getById(fetchErrorRetryDomId);
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

      expect(getById(noExperiencesActivateNewDomId)).toBeNull();

      expect(getOneByClass(fetchNextSelector)).toBeNull();

      const fetchMoreExperiencesBtnEl = await waitFor(() => {
        const el = getOneByClass(fetchNextSelector);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getExperienceEl).not.toBeNull();
      expect(getExperienceEl("b")).toBeNull();

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

      await waitFor(() => {
        return getExperienceEl("b");
      });

      expect(getOneByClass(fetchNextSelector)).toBeNull();

      expect(getExperienceEl()).not.toBeNull();
    });
  });

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

    mockGetOnlineStatusProps
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
      const containerEl = getById(domPrefix);
      containerEl.click();

      expect(dropdownMenuEl0.classList).not.toContain(activeClassName);

      dropdownTriggerEl.click();
      expect(dropdownMenuEl0.classList).toContain(activeClassName);

      getOneByClass("delete-experience-menu-item").click();

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

      const searchInputEl = getById(searchInputDomId);

      fillField(searchInputEl, "a");

      const searchLinkEl = getSearchLinks(0) as HTMLAnchorElement;

      expect(searchLinkEl.href).toContain(mockOnlineId);

      expect(getAllByClass(noSearchResultSelector).length).toBe(0);

      fillField(searchInputEl, "aaaaa");

      expect(getAllByClass(noSearchResultSelector).length).toBe(1);

      expect((getSearchLinks() as any).length).toBe(0);

      getById(domPrefix).click();

      expect(getAllByClass(noSearchResultSelector).length).toBe(0);
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
        const el = getById(onDeleteExperienceSuccessNotificationId);
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

      expect(getById(onDeleteExperienceSuccessNotificationId)).toBeNull();
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
        const el = getById(onDeleteExperienceCancelledNotificationId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);

      expect(mockPurgeExperiencesFromCache1).not.toHaveBeenCalled();

      expect(mockEvictFn).not.toHaveBeenCalled();
      expect(mockPersistFn).not.toHaveBeenCalled();
      expect(mockPostMsg).not.toHaveBeenCalled();

      deleteExperienceCancelledEl.click();

      expect(getById(onDeleteExperienceCancelledNotificationId)).toBeNull();
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
        const el = getOneByClass(updateExperienceMenuItemSelector);
        expect(el).not.toBeNull();
        return el;
      });

      updateEl.click();

      getById(mockOnUpsertExperienceSuccessUiId).click();

      expect(getById(mockOnUpsertExperienceSuccessUiId)).toBeNull();

      getOneByClass(updateExperienceSuccessNotificationSelector).click();

      expect(
        getOneByClass(updateExperienceSuccessNotificationSelector),
      ).toBeNull();

      ////////////////////////// 2nd update ////////////////////////////

      updateEl.click();

      getById(mockOnUpsertExperienceSuccessUiId).click();

      expect(getById(mockOnUpsertExperienceSuccessUiId)).toBeNull();

      expect(
        getOneByClass(updateExperienceSuccessNotificationSelector),
      ).not.toBeNull();

      await waitFor(() => {
        expect(
          getOneByClass(updateExperienceSuccessNotificationSelector),
        ).toBeNull();
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
    mockGetOnlineStatusProps
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

      expect(mockCleanUpOfflineExperiencesFn).toBeCalledWith({
        [offlineId]: mockOnlineExperience,
      });

      expect(getById(mockUpsertExperienceOnErrorUiId)).toBeNull();

      getById(activateInsertExperienceDomId).click();

      getById(mockUpsertExperienceOnErrorUiId).click();

      expect(getById(mockUpsertExperienceOnErrorUiId)).toBeNull();
    });
  });
});

describe("reducer", () => {
  // const mockDispatch = jest.fn();

  // const effectArgs = {
  //   dispatch: mockDispatch,
  // } as any;

  // const props = {
  //   getCachedExperiencesConnectionListViewFn:
  //     mockGetCachedExperiencesConnectionListViewFn,
  //   getExperienceConnectionListView: mockGetExperiencesConnectionListView,
  //   componentTimeoutsMs,
  //   getDeleteExperienceLedgerFn: mockGetDeleteExperienceLedger,
  //   getOnlineStatusProp: mockGetOnlineStatusProps,
  //   getIsConnectedInject: mockGetIsConnected,
  // } as any;

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
        LoadingComponentFn={mockLoadingComponent}
        cleanUpOfflineExperiencesFn={mockCleanUpOfflineExperiencesFn}
        getSyncErrorsFn={mockGetSyncErrorsFn}
        handlePreFetchExperiencesFn={mockHandlePreFetchExperiences}
        purgeExperiencesFromCache1Fn={mockPurgeExperiencesFromCache1}
        putOrRemoveDeleteExperienceLedgerFn={
          mockPutOrRemoveDeleteExperienceLedger
        }
        getDeleteExperienceLedgerFn={mockGetDeleteExperienceLedger}
        getOnlineStatusProp={mockGetOnlineStatusProps}
        getUnsyncedExperienceInject={mockGetUnsyncedExperienceInject}
        setUpRoutePageInject={mockSetUpRoutePage}
        getIsConnectedInject={mockGetIsConnected}
        useWithSubscriptionContextInject={mockUseWithSubscriptionContext}
        UpsertExperienceInject={mockUpsertExperience as any}
        LinkInject={mockLink}
      />
    ),
  };
}

function mockLink({ className = "", to, children }: any) {
  to = typeof to === "string" ? to : JSON.stringify(to);

  return (
    <a className={className} href={to}>
      {children}
    </a>
  );
}

function mockLoadingComponent() {
  return <div id={mockLoadingId} />;
}

function mockUpsertExperience({
  onSuccess,
  onClose,
  onError,
}: {
  onSuccess: (experience: any) => void;
  onClose: () => void;
  onError: () => void;
}) {
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
}

function getExperienceEl(id: string = mockOnlineId) {
  return getById(id);
}

function getDropdownMenu(parentEl: HTMLElement, index = 0) {
  return parentEl
    .getElementsByClassName(dropdownMenuMenuSelector)
    .item(index) as HTMLElement;
}

function getSearchLinks(index?: number) {
  const parentEl = document.getElementsByClassName(searchLinkSelector);
  return index === undefined
    ? parentEl
    : (parentEl.item(index) as HTMLAnchorElement);
}

function getDescriptionEl(parentEl: HTMLElement, index?: number) {
  const els = parentEl.getElementsByClassName(descriptionContainerSelector);

  return index === undefined ? els : (els.item(index) as HTMLElement);
}
