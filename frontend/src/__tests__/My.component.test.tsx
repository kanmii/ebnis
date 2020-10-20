/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement, wait } from "@testing-library/react";
import { My } from "../components/My/my.component";
import {
  Props,
  initState,
  EffectType,
  effectFunctions,
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
} from "../components/My/my.dom";
import { makeOfflineId } from "../utils/offlines";
import { fillField } from "../tests.utils";
import {
  StateValue,
  FETCH_EXPERIENCES_TIMEOUTS,
  BroadcastMessageType,
} from "../utils/types";
import { GenericHasEffect } from "../utils/effects";
import {
  manuallyFetchExperienceConnectionMini,
  KleinErfahrüngenAbfrageErgebnisse,
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
import {
  purgeExperiencesFromCache1,
  writeGetExperiencesMiniQuery,
} from "../apollo/update-get-experiences-mini-query";
import { AppPersistor } from "../utils/app-context";
import { E2EWindowObject } from "../utils/types";
import { handlePreFetchExperiences } from "../components/My/my.injectables";
import { act } from "react-dom/test-utils";
import { getSyncErrors } from "../apollo/sync-to-server-cache";
import { getOnlineStatus } from "../apollo/unsynced-ledger";

jest.mock("../apollo/sync-to-server-cache");
const mockGetSyncErrors = getSyncErrors as jest.Mock;

jest.mock("../components/My/my.injectables");
const mockHandlePreFetchExperiences = handlePreFetchExperiences as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockPurgeExperiencesFromCache1 = purgeExperiencesFromCache1 as jest.Mock;
const mockWriteGetExperiencesMiniQuery = writeGetExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchExperienceConnectionMini = manuallyFetchExperienceConnectionMini as jest.Mock;

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
jest.mock("../components/Header/header.component", () => () => null);
jest.mock("../utils/global-window");

const mockActivateUpsertExperienceUiId = "activate-upsert-experience-ui";
const mockCloseUpsertExperienceUiId = "close-upsert-experience-ui";
const mockOnUpsertExperienceSuccessUiId = "con-upsert-experience-success-ui";
const mockOnlineId = "1";
const mockTitle = "yo";
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: ({
    onSuccess,
    onClose,
  }: {
    onSuccess: (experience: any) => void;
    onClose: () => void;
  }) => {
    return (
      <div>
        <button id={mockActivateUpsertExperienceUiId} />

        <button
          id={mockOnUpsertExperienceSuccessUiId}
          onClick={() => {
            onSuccess({
              id: mockOnlineId,
              title: mockTitle,
            });
          }}
        />

        <button id={mockCloseUpsertExperienceUiId} onClick={onClose} />
      </div>
    );
  },
}));

const mockPartOnlineId = "2";
const offlineId = makeOfflineId(3);

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
  jest.clearAllTimers();
  jest.resetAllMocks();
});

function getContainer() {
  return document.getElementById(domPrefix) as HTMLElement;
}

describe("component", () => {
  const dropdownMenuClassName = "dropdown";
  const descriptionClassName = "description";

  it("verbunden/sammeln Erfahrüngen Fehler/wiederholen aber kein Erfahrung/erstellen eine Erfahrung aktivieren/deaktivieren", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      error: new Error("a"),
    } as KleinErfahrüngenAbfrageErgebnisse);

    const { ui } = makeComp();
    render(ui);
    jest.runAllTimers();

    expect(document.getElementById(mockLoadingId)).not.toBeNull();
    expect(document.getElementById(fetchErrorRetryDomId)).toBeNull();

    let wiederholenTaste = await waitForElement(() => {
      return document.getElementById(fetchErrorRetryDomId) as HTMLElement;
    });

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      data: {
        getExperiences: {
          edges: [] as any,
        },
      },
    } as KleinErfahrüngenAbfrageErgebnisse);

    wiederholenTaste.click();

    expect(document.getElementById(noExperiencesActivateNewDomId)).toBeNull();
    jest.runAllTimers();

    const aktivierenNeueErfahrungTaste = await waitForElement(() => {
      return document.getElementById(
        noExperiencesActivateNewDomId,
      ) as HTMLElement;
    });

    expect(
      document.getElementById(mockActivateUpsertExperienceUiId),
    ).toBeNull();

    aktivierenNeueErfahrungTaste.click();

    const neuenErfahrungEl = document.getElementById(
      mockCloseUpsertExperienceUiId,
    ) as HTMLElement;

    neuenErfahrungEl.click(); // exists
    jest.runAllTimers();

    expect(
      document.getElementById(mockActivateUpsertExperienceUiId),
    ).toBeNull();
  });

  it("Holen Erfahrungen erzeuge Ausnahme / es gibt zwischengespeicherte Erfahrungen / wiederholen ErfahrungenAnforderung", async () => {
    mockGetIsConnected.mockResolvedValue(true);
    mockUseWithSubscriptionContext.mockReturnValue({
      connected: true,
    });

    mockManuallyFetchExperienceConnectionMini.mockRejectedValue(new Error("a"));

    const { ui } = makeComp();
    render(ui);
    jest.runAllTimers();

    expect(document.getElementById(mockLoadingId)).not.toBeNull();

    expect(document.getElementById(fetchErrorRetryDomId)).toBeNull();

    let wiederholenTaste = await waitForElement(() => {
      return document.getElementById(fetchErrorRetryDomId) as HTMLElement;
    });

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
    } as KleinErfahrüngenAbfrageErgebnisse);

    wiederholenTaste.click();
    jest.runAllTimers();

    expect(document.getElementById(noExperiencesActivateNewDomId)).toBeNull();

    expect(
      document.getElementsByClassName("my-experiences__next").item(0),
    ).toBeNull();

    const näschteErfahrungenTaste = await waitForElement(() => {
      return document
        .getElementsByClassName("my-experiences__next")
        .item(0) as HTMLDivElement;
    });

    expect(document.getElementById(mockOnlineId)).not.toBeNull();
    expect(document.getElementById("b")).toBeNull();
    jest.runAllTimers();
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
    } as KleinErfahrüngenAbfrageErgebnisse);

    näschteErfahrungenTaste.click();
    jest.runAllTimers();

    await waitForElement(() => {
      return document.getElementById("b");
    });

    expect(
      document.getElementsByClassName("my-experiences__next").item(0),
    ).toBeNull();

    expect(document.getElementById(mockOnlineId)).not.toBeNull();
    jest.runAllTimers();
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
            id: mockPartOnlineId,
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

    const experiencesEls1 = await waitForElement(() => {
      return document.getElementById(mockPartOnlineId) as HTMLElement;
    });
    expect(experiencesEls1.className).toContain(isPartOfflineClassName);
    expect(experiencesEls1.className).not.toContain(isOfflineClassName);

    const experiencesEls2 = document.getElementById(offlineId) as HTMLElement;
    expect(experiencesEls2.className).toContain(isOfflineClassName);
    expect(experiencesEls2.className).not.toContain(isPartOfflineClassName);

    // do not show description UI if no description
    expect(
      experiencesEls1.getElementsByClassName(descriptionClassName).length,
    ).toBe(0);

    // zweite Erfahrung besitz Beschreibung
    const descriptionEl2 = experiencesEls2
      .getElementsByClassName(descriptionClassName)
      .item(0) as HTMLElement;

    // aber nur übersicht
    expect(
      descriptionEl2.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(1);

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

    jest.runAllTimers();
  });

  it("Optionen Menü", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetExperiencesMiniQuery.mockReturnValue({
      edges: [
        {
          node: {
            id: mockPartOnlineId,
            title: "bb",
          },
        },
      ] as GetExperienceConnectionMini_getExperiences_edges[],
      pageInfo: {},
    } as GetExperienceConnectionMini_getExperiences);

    const { ui } = makeComp();
    render(ui);

    const experiencesEls0 = await waitForElement(() => {
      return document.getElementById(mockPartOnlineId) as HTMLElement;
    });

    const dropdownMenuEl0 = experiencesEls0
      .getElementsByClassName(dropdownMenuClassName)
      .item(0) as HTMLElement;

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

    (document
      .getElementsByClassName("delete-experience-menu-item")
      .item(0) as HTMLElement).click();

    await wait(() => true);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].id).toBe(
      mockPartOnlineId,
    );

    expect(mockHistoryPush).toHaveBeenCalled();

    jest.runAllTimers();
  });

  it("Suchen", async () => {
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

    const searchLinkClassName = "search__link";
    const searchNoResultClassName = "search__no-results";

    expect(document.getElementsByClassName(searchLinkClassName).length).toBe(0);

    const searchInputEl = document.getElementById(
      searchInputDomId,
    ) as HTMLElement;

    fillField(searchInputEl, "a");

    const searchLinkEl = document
      .getElementsByClassName(searchLinkClassName)
      .item(0) as HTMLAnchorElement;

    expect(searchLinkEl.href).toContain(mockOnlineId);

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(0);

    fillField(searchInputEl, "aaaaa");

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(1);

    expect(document.getElementsByClassName(searchLinkClassName).length).toBe(0);

    getContainer().click();

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(0);
    jest.runAllTimers();
  });

  it("Löschen ErfahrungAnforderung Gelingen", async () => {
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
      id: mockOnlineId,
      key: StateValue.deleted,
      title: "aa",
    } as DeletedExperienceLedger);

    const { ui } = makeComp();
    render(ui);

    const deleteSuccessEl = await waitForElement(() => {
      return document.getElementById(
        onDeleteExperienceSuccessNotificationId,
      ) as HTMLElement;
    });

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

    expect(
      document.getElementById(onDeleteExperienceSuccessNotificationId),
    ).toBeNull();
    jest.runAllTimers();
  });

  it("Löschen ErfahrungAnforderung storniert", async () => {
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

    const löschenStorniertEl = await waitForElement(() => {
      return document.getElementById(
        onDeleteExperienceCancelledNotificationId,
      ) as HTMLElement;
    });

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);

    expect(mockPurgeExperiencesFromCache1).not.toHaveBeenCalled();

    expect(mockEvictFn).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockPostMsg).not.toHaveBeenCalled();

    löschenStorniertEl.click();

    expect(
      document.getElementById(onDeleteExperienceCancelledNotificationId),
    ).toBeNull();

    jest.runAllTimers();
  });

  it("update experience", async () => {
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

    const updateEl = await waitForElement(() => {
      return document
        .getElementsByClassName(updateExperienceMenuItemId)
        .item(0) as HTMLElement;
    });

    updateEl.click();

    let updateSuccessEl = document.getElementById(
      mockOnUpsertExperienceSuccessUiId,
    ) as HTMLElement;

    updateSuccessEl.click();

    expect(
      document.getElementById(mockOnUpsertExperienceSuccessUiId),
    ).toBeNull();

    const closeSuccessNotificationEl = document
      .getElementsByClassName(updateExperienceSuccessNotificationCloseClassName)
      .item(0) as HTMLElement;

    closeSuccessNotificationEl.click();

    expect(
      document
        .getElementsByClassName(
          updateExperienceSuccessNotificationCloseClassName,
        )
        .item(0),
    ).toBeNull();

    ////////////////////////// 2nd update ////////////////////////////

    updateEl.click();

    updateSuccessEl = document.getElementById(
      mockOnUpsertExperienceSuccessUiId,
    ) as HTMLElement;

    updateSuccessEl.click();

    expect(
      document.getElementById(mockOnUpsertExperienceSuccessUiId),
    ).toBeNull();

    expect(
      document
        .getElementsByClassName(
          updateExperienceSuccessNotificationCloseClassName,
        )
        .item(0),
    ).not.toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(
      document
        .getElementsByClassName(
          updateExperienceSuccessNotificationCloseClassName,
        )
        .item(0),
    ).toBeNull();
  });
});

describe("reducer", () => {
  it("holen Erfahrüngen:  kein Netzwerk", async () => {
    let state = initState();

    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const mockDispatch = jest.fn();

    const fn = effectFunctions[effect.key];
    await fn({} as any, {} as any, { dispatch: mockDispatch } as any);
    expect(mockDispatch).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(mockDispatch.mock.calls[0][0].key).toEqual(StateValue.errors);

    mockGetIsConnected.mockReturnValue(true);
  });

  it("holen Erfahrüngen: erstmal ist Netzwerk nicht vorhandel, dann später kommt", async () => {
    let state = initState();

    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const mockDispatch = jest.fn();

    const fn = effectFunctions[effect.key];
    await fn({} as any, {} as any, { dispatch: mockDispatch } as any);
    mockGetIsConnected.mockReturnValue(true);

    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);

    await wait(() => true);
    expect(mockDispatch.mock.calls[0][0].key).toEqual(StateValue.errors);

    mockGetIsConnected.mockReturnValue(true);
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
