/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement, wait } from "@testing-library/react";
import { My } from "../components/My/my.component";
import {
  Props,
  initState,
  EffectType,
  effectFunctions,
  reducer,
  ActionType,
  DataState,
} from "../components/My/my.utils";
import {
  noExperiencesActivateNewDomId,
  domPrefix,
  searchInputDomId,
  isPartOfflineClassName,
  isOfflineClassName,
  descriptionSummaryClassName,
  descriptionFullClassName,
  descriptionControlClassName,
  dropdownTriggerClassName,
  dropdownIsActiveClassName,
  fetchErrorRetryDomId,
  onDeleteExperienceSuccessNotificationId,
  onDeleteExperienceCancelledNotificationId,
  updateExperienceMenuItemId,
  updateExperienceSuccessNotificationCloseClassName,
  activateInsertExperienceDomId,
} from "../components/My/my.dom";
import { makeOfflineId } from "../utils/offlines";
import { fillField } from "../tests.utils";
import { StateValue, BroadcastMessageType } from "../utils/types";
import { GenericHasEffect } from "../utils/effects";
import {
  manuallyFetchExperienceConnectionMini,
  GetExperienceConnectionMiniQueryResult,
} from "../utils/experience.gql.types";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { getIsConnected } from "../utils/connections";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
  DeletedExperienceLedger,
} from "../apollo/delete-experience-cache";
import {
  GetExperienceConnectionMini_getExperiences_edges,
  GetExperienceConnectionMini_getExperiences,
} from "../graphql/apollo-types/GetExperienceConnectionMini";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { purgeExperiencesFromCache1 } from "../apollo/update-get-experiences-mini-query";
import { AppPersistor } from "../utils/app-context";
import { E2EWindowObject } from "../utils/types";
import { handlePreFetchExperiences } from "../components/My/my.injectables";
import { act } from "react-dom/test-utils";
import { getOnlineStatus } from "../apollo/unsynced-ledger";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { cleanUpOfflineExperiences } from "../components/WithSubscriptions/with-subscriptions.utils";
import { ExperienceMiniFragment } from "../graphql/apollo-types/ExperienceMiniFragment";
import { FETCH_EXPERIENCES_TIMEOUTS, MAX_TIMEOUT_MS } from "../utils/timers";

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;

jest.mock("../apollo/sync-to-server-cache");

jest.mock("../components/My/my.injectables");
const mockHandlePreFetchExperiences = handlePreFetchExperiences as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockPurgeExperiencesFromCache1 = purgeExperiencesFromCache1 as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchExperienceConnectionMini = manuallyFetchExperienceConnectionMini as jest.Mock;

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
jest.mock("../components/Header/header.component", () => () => null);
jest.mock("../utils/global-window");

const mockCloseUpsertExperienceUiId = "?-1?";
const mockOnUpsertExperienceSuccessUiId = "?-2?";
const mockUpsertExperienceOnErrorUiId = "?-3?";
const mockOnlineId = "?0?";
const mockTitle = "?1?";
const mockOnlineExperience = {
  id: mockOnlineId,
  title: mockTitle,
} as ExperienceFragment;
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
} as ExperienceMiniFragment;

jest.mock("../apollo/unsynced-ledger");
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

jest.mock("../utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");

const mockLoadingId = "l-o-a-d-i-n-g";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingId}></div>;
});

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

const mockHistoryPush = jest.fn();
const mockPersistFn = jest.fn();
const mockEvictFn = jest.fn();
const mockPostMsg = jest.fn();
const mockDispatch = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const globals = {
  persistor,
  cache: { evict: mockEvictFn } as any,
  bc: { postMessage: mockPostMsg } as any,
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = globals;
});

afterAll(() => {
  delete window.____ebnis;
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.runTimersToTime(MAX_TIMEOUT_MS);
  jest.clearAllTimers();
  jest.resetAllMocks();
});

describe("component", () => {
  it("connected/fetch experiences error/refetch but no experiences/activate upsert experience/deactivate", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      error: new Error("a"),
    } as GetExperienceConnectionMiniQueryResult);

    const { ui } = makeComp();
    render(ui);
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();
    expect(getFetchErrorRetry()).toBeNull();

    let reFetchEl = await waitForElement(getFetchErrorRetry);

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      data: {
        getExperiences: {
          edges: [] as any,
        },
      },
    } as GetExperienceConnectionMiniQueryResult);

    reFetchEl.click();

    expect(getNoExperiencesActivateNew()).toBeNull();
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    const activateInsertExperienceBtnEl = await waitForElement(
      getNoExperiencesActivateNew,
    );

    expect(getMockCloseUpsertExperienceUi()).toBeNull();

    activateInsertExperienceBtnEl.click();

    getMockCloseUpsertExperienceUi().click(); // exists

    jest.runTimersToTime(MAX_TIMEOUT_MS);

    expect(getMockCloseUpsertExperienceUi()).toBeNull();
  });

  it("throws errors while fetching experiences/fetches cached experiences/re-fetch experiences request", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({
      connected: true,
    });

    mockManuallyFetchExperienceConnectionMini.mockRejectedValue(new Error("a"));

    const { ui } = makeComp();
    render(ui);
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();

    expect(getFetchErrorRetry()).toBeNull();

    let reFetchEl = await waitForElement(getFetchErrorRetry);

    mockManuallyFetchExperienceConnectionMini.mockResolvedValueOnce({
      data: {
        getExperiences: {
          edges: [
            {
              node: {
                id: mockOnlineId,
                title: "a",
              },
            },
          ] as GetExperienceConnectionMini_getExperiences_edges[],
          pageInfo: {
            hasNextPage: true,
          },
        },
      },
    } as GetExperienceConnectionMiniQueryResult);

    reFetchEl.click();
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    expect(getNoExperiencesActivateNew()).toBeNull();

    expect(getFetchNextExperience()).toBeNull();

    const fetchMoreExperiencesBtnEl = await waitForElement(
      getFetchNextExperience,
    );

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

    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockOnlineId,
            title: "a",
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {
        hasNextPage: true,
      },
    } as GetExperienceConnectionMini_getExperiences);

    mockManuallyFetchExperienceConnectionMini.mockResolvedValueOnce({
      data: {
        getExperiences: {
          edges: [
            {
              node: {
                id: "b",
                title: "b",
              },
            },
          ] as GetExperienceConnectionMini_getExperiences_edges[],
          pageInfo: {},
        },
      },
    } as GetExperienceConnectionMiniQueryResult);

    fetchMoreExperiencesBtnEl.click();
    jest.runTimersToTime(MAX_TIMEOUT_MS);

    await waitForElement(() => {
      return getExperienceEl("b");
    });

    expect(getFetchNextExperience()).toBeNull();

    expect(getExperienceEl()).not.toBeNull();
  });

  it("interacts with description / offline Erfahrungen / teilweise online Erfahrungen", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetOnlineStatus
      .mockReturnValueOnce(StateValue.partOffline)
      .mockReturnValueOnce(StateValue.offline);

    mockGetExperiencesMiniQuery.mockReturnValue({
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
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    const { ui } = makeComp();
    render(ui);

    const partOfflineExperienceEl = await waitForElement(() => {
      return getExperienceEl(mockPartOfflineId);
    });
    expect(partOfflineExperienceEl.className).toContain(isPartOfflineClassName);
    expect(partOfflineExperienceEl.className).not.toContain(isOfflineClassName);

    const experiencesEls2 = getExperienceEl(offlineId);
    expect(experiencesEls2.className).toContain(isOfflineClassName);
    expect(experiencesEls2.className).not.toContain(isPartOfflineClassName);

    // do not show description UI if no description
    expect((getDescriptionEl(partOfflineExperienceEl) as any).length).toBe(0);

    // zweite Erfahrung besitz Beschreibung
    const descriptionEl2 = getDescriptionEl(experiencesEls2, 0) as HTMLElement;

    // aber nur übersicht
    expect((getDescriptionEl(experiencesEls2) as any).length).toBe(1);

    // nicht vollständig Beschreibung
    expect(
      descriptionEl2.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(0);

    // wir möchten vollständige Beschreibung anzeigen
    (descriptionEl2
      .getElementsByClassName(descriptionControlClassName)
      .item(0) as HTMLElement).click();

    // also zussamenfassende Beschreibung ist versteckt
    expect(
      descriptionEl2.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(0);

    // und vollständig Beschreibung ist gezeigt
    expect(
      descriptionEl2.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(1);
  });

  it("interacts with options menu", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockPartOfflineId,
            title: "bb",
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    const { ui } = makeComp();
    render(ui);

    const experiencesEls0 = await waitForElement(() => {
      return getExperienceEl(mockPartOfflineId);
    });

    const dropdownMenuEl0 = getDropdownMenu(experiencesEls0);

    expect(dropdownMenuEl0.classList).not.toContain(dropdownIsActiveClassName);

    const dropdownTriggerEl = experiencesEls0
      .getElementsByClassName(dropdownTriggerClassName)
      .item(0) as HTMLElement;

    dropdownTriggerEl.click();

    // clear experiences menu
    const containerEl = getContainer();
    containerEl.click();

    expect(dropdownMenuEl0.classList).not.toContain(dropdownIsActiveClassName);

    dropdownTriggerEl.click();

    getDeleteExperienceMenu().click();

    await wait(() => true);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].id).toBe(
      mockPartOfflineId,
    );

    expect(mockHistoryPush).toHaveBeenCalled();
  });

  it("Searches", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockOnlineId,
            title: "aa",
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    const { ui } = makeComp();
    render(ui);

    await waitForElement(() => {
      return document.getElementById(mockOnlineId) as HTMLElement;
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

  it("deletes experience successfully", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetExperiencesMiniQuery.mockReturnValue({
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
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    mockGetDeleteExperienceLedger.mockReturnValue({
      id: mockOnlineId,
      key: StateValue.deleted,
      title: "aa",
    } as DeletedExperienceLedger);

    const { ui } = makeComp();
    render(ui);

    expect(getExperienceEl()).toBeNull();

    const deleteSuccessEl = await waitForElement(
      getDeleteExperienceSuccessNotification,
    );

    expect(getExperienceEl("bb")).not.toBeNull();

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);
    expect(mockPurgeExperiencesFromCache1.mock.calls[0][0][0]).toBe(
      mockOnlineId,
    );
    expect(mockEvictFn.mock.calls[0][0].id).toEqual(mockOnlineId);
    expect(mockPersistFn).toHaveBeenCalled();
    expect(mockPostMsg.mock.calls[0][0]).toMatchObject({
      type: BroadcastMessageType.experienceDeleted,
      payload: {
        id: mockOnlineId,
        title: "aa",
      },
    });

    deleteSuccessEl.click();

    expect(getDeleteExperienceSuccessNotification()).toBeNull();
  });

  it("cancels experience deletion", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockOnlineId,
            title: "aa",
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    mockGetDeleteExperienceLedger.mockReturnValue({
      key: StateValue.cancelled,
      title: "aa",
    } as DeletedExperienceLedger);

    const { ui } = makeComp();
    render(ui);

    const deleteExperienceCancelledEl = await waitForElement(
      getDeleteExperienceCancelledNotification,
    );

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);

    expect(mockPurgeExperiencesFromCache1).not.toHaveBeenCalled();

    expect(mockEvictFn).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockPostMsg).not.toHaveBeenCalled();

    deleteExperienceCancelledEl.click();

    expect(getDeleteExperienceCancelledNotification()).toBeNull();
  });

  it("updates experience", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockOnlineId,
            title: mockTitle,
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    const { ui } = makeComp();
    render(ui);

    const updateEl = await waitForElement(getUpdateExperienceMenuItem);

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

    act(() => {
      jest.runTimersToTime(MAX_TIMEOUT_MS);
    });

    expect(getUpdateExperienceSuccessNotificationCloseEl()).toBeNull();
  });

  it("updates experiences on sync / upsert experience on error", async () => {
    mockGetOnlineStatus
      .mockReturnValueOnce(StateValue.offline)
      .mockReturnValueOnce(StateValue.partOffline);

    // Given data just synced to backend
    mockUseWithSubscriptionContext.mockReturnValue({
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
    });

    // And there is 1 offline and 1 part offline experiences in the system
    mockGetExperiencesMiniQuery.mockReturnValue({
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
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    // When component is rendered
    const { ui } = makeComp();
    render(ui);

    // Then offline experience should be visible
    await waitForElement(() => {
      return getExperienceEl(offlineId);
    });

    // But after a while, offline experience should not be visible
    expect(getExperienceEl(offlineId)).toBeNull();

    // Online experience should be visible
    const onlineExperienceEl = getExperienceEl();
    expect(onlineExperienceEl.className).toContain(isPartOfflineClassName);
    expect(onlineExperienceEl.className).not.toContain(isOfflineClassName);

    // Part offline experience should be visible and become online
    const partOfflineExperienceEl = getExperienceEl(mockPartOfflineId);
    expect(partOfflineExperienceEl.className).not.toContain(
      isPartOfflineClassName,
    );
    expect(partOfflineExperienceEl.className).not.toContain(isOfflineClassName);

    expect(mockCleanUpOfflineExperiences).toBeCalledWith({
      [offlineId]: mockOnlineExperience,
    });

    expect(getMockUpsertExperienceOnError()).toBeNull();

    getActivateInsertExperience().click();

    getMockUpsertExperienceOnError().click();

    expect(getMockUpsertExperienceOnError()).toBeNull();
  });
});

describe("reducer", () => {
  const effectArgs = {
    dispatch: mockDispatch,
  } as any;

  const props = {} as any;

  fit("fetches experiences when no network", async () => {
    let state = initState();

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
    let state = initState();

    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const fn = effectFunctions[effect.key];
    await fn({} as any, props, effectArgs);
    mockGetIsConnected.mockReturnValue(true);

    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);

    await wait(() => true);
    expect(mockDispatch.mock.calls[0][0].key).toEqual(StateValue.errors);

    mockGetIsConnected.mockReturnValue(true);
  });

  it("sets online status to 'online' when on synced experience has no errors", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ON_DATA_RECEIVED,
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
      type: ActionType.ON_SYNC,
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
    ui: <MyP {...props} location={location} history={history} />,
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

function getFetchNextExperience(index: number = 0) {
  return document
    .getElementsByClassName("my-experiences__next")
    .item(index) as HTMLElement;
}

function getExperienceEl(id: string = mockOnlineId) {
  return document.getElementById(id) as HTMLElement;
}

function getDropdownMenu(parentEl: HTMLElement, index: number = 0) {
  return parentEl.getElementsByClassName("dropdown").item(0) as HTMLElement;
}

function getDeleteExperienceMenu(index: number = 0) {
  return document
    .getElementsByClassName("delete-experience-menu-item")
    .item(index) as HTMLElement;
}

function getSearchLinks(index?: number) {
  const parentEl = document.getElementsByClassName("search__link  ");
  return index === undefined
    ? parentEl
    : (parentEl.item(index) as HTMLAnchorElement);
}

function getSearchNoResultsEl() {
  return document.getElementsByClassName("search__no-results");
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

function getUpdateExperienceMenuItem(index: number = 0) {
  return document
    .getElementsByClassName(updateExperienceMenuItemId)
    .item(index) as HTMLElement;
}

function getMockOnUpsertExperienceSuccessUi() {
  return document.getElementById(
    mockOnUpsertExperienceSuccessUiId,
  ) as HTMLElement;
}

function getUpdateExperienceSuccessNotificationCloseEl(index: number = 0) {
  return document
    .getElementsByClassName(updateExperienceSuccessNotificationCloseClassName)
    .item(index) as HTMLElement;
}

function getDescriptionEl(parentEl: HTMLElement, index?: number) {
  const els = parentEl.getElementsByClassName("description");

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
