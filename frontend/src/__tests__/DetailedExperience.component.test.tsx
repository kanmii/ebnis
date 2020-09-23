/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars*/
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement, wait } from "@testing-library/react";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  Props,
  ActionType,
  DetailedExperienceChildDispatchProps,
  Match,
  initState,
  reducer,
  DataState,
  EinträgeMitHolenFehler,
  EffectType,
  effectFunctions,
  EinträgeDatenErfolg,
  EinträgeDatenVersagen,
} from "../components/DetailExperience/detailed-experience-utils";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
  noEntryTriggerId,
  refetchExperienceId,
  neueHolenEinträgeId,
  holenNächstenEinträgeId,
} from "../components/DetailExperience/detail-experience.dom";
import { act } from "react-dom/test-utils";
import { makeOfflineId } from "../utils/offlines";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import {
  getSyncingExperience,
  putOrRemoveSyncingExperience,
} from "../apollo/syncing-experience-ledger";
import {
  insertReplaceRemoveExperiencesInGetExperiencesMiniQuery,
  purgeExperience,
} from "../apollo/update-get-experiences-mini-query";
import {
  E2EWindowObject,
  StateValue,
  FETCH_EXPERIENCES_TIMEOUTS,
} from "../utils/types";
import {
  getUnSyncEntriesErrorsLedger,
  removeUnsyncedExperiences,
} from "../apollo/unsynced-ledger";
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
import { sammelnZwischengespeicherteErfahrung } from "../apollo/get-detailed-experience-query";
import { activeClassName } from "../utils/utils.dom";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { GenericHasEffect } from "../utils/effects";

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockSammelnZwischengespeicherteErfahrung = sammelnZwischengespeicherteErfahrung as jest.Mock;

jest.mock("../components/Header/header.component", () => () => null);

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockDeleteExperiences = jest.fn();
const mockUseDeleteExperiencesMutation = useDeleteExperiencesMutation as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../apollo/syncing-experience-ledger");

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchDetailedExperience = manuallyFetchDetailedExperience as jest.Mock;
const mockManuallyFetchEntries = manuallyFetchEntries as jest.Mock;

const mockGetIsConnected = getIsConnected as jest.Mock;
jest.mock("../utils/connections");

jest.mock("../apollo/delete-experience-cache");

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

jest.mock("../apollo/syncing-experience-ledger");
const mockGetSyncingExperience = getSyncingExperience as jest.Mock;
const mockPutOrRemoveSyncingExperience = putOrRemoveSyncingExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = insertReplaceRemoveExperiencesInGetExperiencesMiniQuery as jest.Mock;
const mockPurgeExperience = purgeExperience as jest.Mock;

const mockCreateNewEntryId = "?a?";
const mockDismissNewEntryUiId = "?b?";
const mockActionType = ActionType;
const mockNewlyCreatedEntry = {
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
jest.mock("../components/DetailExperience/detail-experience.lazy", () => {
  return {
    NewEntry: ({
      detailedExperienceDispatch,
    }: DetailedExperienceChildDispatchProps) => (
      <div>
        <button
          id={mockCreateNewEntryId}
          onClick={() => {
            detailedExperienceDispatch({
              type:
                mockActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
              mayBeNewEntry: {
                neuEintragDaten: mockNewlyCreatedEntry,
                zustand: "synchronisiert",
              },
              mayBeEntriesErrors: [
                {
                  meta: {
                    index: 1,
                    clientId: "b",
                  },
                  error: "a",
                  experienceId: null,
                  dataObjects: [
                    {
                      meta: {
                        index: 2,
                      },
                      data: "a",
                      definition: null,
                    },
                  ],
                } as CreateEntryErrorFragment,
              ],
            });
          }}
        />

        <button
          id={mockDismissNewEntryUiId}
          onClick={() => {
            detailedExperienceDispatch({
              type: mockActionType.TOGGLE_NEW_ENTRY_ACTIVE,
            });
          }}
        />
      </div>
    ),
  };
});

jest.mock("../apollo/unsynced-ledger");
const mockGetSyncEntriesErrorsLedger = getUnSyncEntriesErrorsLedger as jest.Mock;
const mockRemoveUnsyncedExperiences = removeUnsyncedExperiences as jest.Mock;

const mockLoadingId = "l-o-a-d-i-n-g";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingId}></div>;
});

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
});

const onlineId = "onlineId";

const DEFAULT_ERFAHRUNG = {
  id: onlineId,
  dataDefinitions: [
    {
      id: "1",
      name: "aa",
      type: DataTypes.INTEGER,
    },
  ],
} as ExperienceFragment;

////////////////////////// TESTS //////////////////////////////

describe("components", () => {
  const entryOfflineClassName = "entry--is-danger";

  const EINTRAG_KLIENT_ID = "aa";

  const EINTRAG = {
    id: "a",
    clientId: EINTRAG_KLIENT_ID,
    insertedAt: "2020-09-16T20:00:37Z",
    updatedAt: "2020-09-16T20:00:37Z",
    dataObjects: [
      {
        id: "a",
        definitionId: "1",
        data: `{"integer":1}`,
      },
    ],
  };

  const einträgeErfolg = {
    __typename: "GetEntriesSuccess",
    entries: {
      edges: [
        {
          node: EINTRAG,
        },
      ],
      pageInfo: {},
    },
  };

  it("has connection/holen erzeugt Ausnahme/entry added/entry errors auto close notification", async () => {
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
    const wiederholenErfahrungTaste = await waitForElement(() => {
      return document.getElementById(refetchExperienceId) as HTMLElement;
    });

    mockManuallyFetchDetailedExperience.mockRejectedValueOnce(new Error("b"));

    wiederholenErfahrungTaste.click();
    jest.runAllTimers();

    await wait(() => true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
      },
    } as DetailedExperienceQueryResult);

    wiederholenErfahrungTaste.click();
    jest.runAllTimers();

    expect(kriegNeueHolenEinträge()).toBeNull();
    const neueHolenEinträgeEl = await waitForElement(kriegNeueHolenEinträge);

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...einträgeErfolg,
          entries: {
            edges: [] as any,
            pageInfo: {},
          },
        },
      },
    } as GetEntriesQueryResult);

    act(() => {
      neueHolenEinträgeEl.click();
    });

    expect(getNoEntryEl()).toBeNull();
    jest.runAllTimers();
    const noEntryEl = await waitForElement(getNoEntryEl);

    expect(document.getElementById(mockDismissNewEntryUiId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entlassenNeuEintragUiEl = await waitForElement(() => {
      return document.getElementById(mockDismissNewEntryUiId) as HTMLElement;
    });

    act(() => {
      entlassenNeuEintragUiEl.click();
    });

    expect(document.getElementById(mockDismissNewEntryUiId)).toBeNull();

    expect(document.getElementById(mockCreateNewEntryId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entryEl = document.getElementById(
      mockCreateNewEntryId,
    ) as HTMLElement;

    expect(getNewEntryNotificationEl()).toBeNull();
    expect(getEntriesErrorsNotificationEl()).toBeNull();

    act(() => {
      entryEl.click();
    });

    const schließNeuEintragEl = getNewEntryNotificationEl();
    const eintragFehlerNachrichten = getEntriesErrorsNotificationEl();

    act(() => {
      schließNeuEintragEl.click();
    });
    expect(getNewEntryNotificationEl()).toBeNull();

    act(() => {
      eintragFehlerNachrichten.click();
    });
    expect(getEntriesErrorsNotificationEl()).toBeNull();
  });

  it("es gibt Einträge von zwischengespeicherte/löschen erfahrung", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
        getEntries: einträgeErfolg,
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    render(ui);

    const menüEl = getMenuEl();
    const menüElEltern = menüEl.previousSibling as HTMLElement;

    expect(menüElEltern.classList).not.toContain(activeClassName);

    act(() => {
      menüEl.click();
    });

    expect(menüElEltern.classList).toContain(activeClassName);

    const erfahrungLöschenEl = document
      .getElementsByClassName("delete-experience-link")
      .item(0) as HTMLElement;

    expect(kriegStornierenErfahrungLöschenEl()).toBeNull();

    act(() => {
      erfahrungLöschenEl.click();
    });

    act(() => {
      kriegStornierenErfahrungLöschenEl().click();
    });

    expect(kriegOkErfahrungLöschenEl()).toBeNull();

    act(() => {
      erfahrungLöschenEl.click();
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
      kriegOkErfahrungLöschenEl().click();
    });

    await wait(() => true);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0].key).toBe(
      StateValue.deleted,
    );

    expect(mockRemoveUnsyncedExperiences.mock.calls[0][0][0]).toBe(onlineId);

    expect(mockPersistFunc).toHaveBeenCalled();

    expect(mockHistoryPushFn).toHaveBeenCalled();
  });

  it("Einträge paginierung", async () => {
    mockUseWithSubscriptionContext.mockReturnValueOnce({ connected: true });
    mockGetSyncEntriesErrorsLedger.mockReturnValueOnce({
      [EINTRAG_KLIENT_ID]: {},
    });

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: EINTRAG,
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

    const holenNächstenEinträgeEl = kriegHolenNächstenEinträgeEl();
    mockUseWithSubscriptionContext.mockReturnValue({ connected: true });

    mockManuallyFetchEntries.mockResolvedValueOnce({ error: "a" });

    act(() => {
      holenNächstenEinträgeEl.click();
    });

    expect(kriegPaginierungFehlerEl()).toBeNull();

    await waitForElement(kriegPaginierungFehlerEl);

    mockUseWithSubscriptionContext.mockReturnValue({});

    mockManuallyFetchEntries.mockResolvedValueOnce({
      data: {
        getEntries: {
          ...einträgeErfolg,
          entries: {
            edges: [
              {
                node: {
                  ...EINTRAG,
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
      holenNächstenEinträgeEl.click();
    });

    expect(document.getElementById("b")).toBeNull();

    await waitForElement(() => {
      return document.getElementById("b");
    });

    expect(kriegPaginierungFehlerEl()).toBeNull();
    // weil es gibt kein Netzwerk
    expect(kriegHolenNächstenEinträgeEl()).toBeNull();
  });

  it("nichtSynchronisiertFehler ", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetSyncEntriesErrorsLedger.mockReturnValueOnce({
      [EINTRAG_KLIENT_ID]: {},
    });

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            edges: [
              {
                node: EINTRAG,
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
    expect(document.getElementById(mockCreateNewEntryId)).toBeNull();

    act(() => {
      kriegNichtSynchronisiertFehler().click();
    });

    act(() => {
      (document.getElementById(mockCreateNewEntryId) as HTMLElement).click();
    });

    expect(getNewEntryNotificationEl()).not.toBeNull();

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

  it("Neu Eintrag erstelltet während Einträge könnten nicht holen", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    const holenEinträgeScheitertStatten = (statten.states as DataState).data
      .states.einträge;

    expect(holenEinträgeScheitertStatten.wert).toBe(StateValue.versagen);

    statten = reducer(statten, {
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry: {
        neuEintragDaten: mockNewlyCreatedEntry,
        zustand: "synchronisiert",
      },
    });

    const stattenNachEintragErstelltet = (statten.states as DataState).data
      .states.einträge as EinträgeMitHolenFehler;

    expect(stattenNachEintragErstelltet.wert).toBe(
      StateValue.einträgeMitHolenFehler,
    );

    expect(
      stattenNachEintragErstelltet.einträgeMitHolenFehler.context.einträge
        .length,
    ).toBe(1);

    statten = reducer(statten, {
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry: {
        neuEintragDaten: mockNewlyCreatedEntry,
        zustand: "synchronisiert",
      },
    });

    const stattenNachEintragErstelltet1 = (statten.states as DataState).data
      .states.einträge as EinträgeMitHolenFehler;

    expect(
      stattenNachEintragErstelltet1.einträgeMitHolenFehler.context.einträge
        .length,
    ).toBe(2);
  });

  it("löschen Erfahrung Anforderung", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    const [wirkung1, wirkung2] = (statten.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc2 = effectFunctions[wirkung2.key];

    mockGetDeleteExperienceLedger.mockReturnValueOnce({
      key: StateValue.requested,
    });

    wirkungFunc2(wirkung2.ownArgs as any, props, effectArgs);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0]).toEqual([]);
    expect(mockDispatchFn.mock.calls[0][0]).toEqual({
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: StateValue.requested,
    });

    const offlineExperienceId = "a";
    mockGetSyncingExperience.mockReturnValueOnce({
      offlineExperienceId,
      newEntryClientId: "c",
      entriesErrors: {},
    });

    const eintragDaten = {
      clientId: "c",
    };

    const wirkungOwnArgs1 = {
      ...wirkung1.ownArgs,
      einträge: [
        {
          eintragDaten,
        },
      ],
    };

    expect(mockPersistFunc).not.toHaveBeenCalled();
    const wirkungFunc1 = effectFunctions[wirkung1.key];
    wirkungFunc1(wirkungOwnArgs1 as any, props, effectArgs);

    expect(mockPutOrRemoveSyncingExperience.mock.calls[0][0]).toEqual(onlineId);
    expect(mockPurgeExperience.mock.calls[0][0]).toEqual(offlineExperienceId);
    expect(mockPersistFunc).toHaveBeenCalled();

    expect(mockDispatchFn.mock.calls[1][0]).toEqual({
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry: {
        neuEintragDaten: eintragDaten,
        zustand: "ganz-nue",
      },
      mayBeEntriesErrors: {},
    });
  });

  it("Erhalten Einträge handhaben erfolg, wenn Einträge mit Fehler", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    statten = reducer(statten, {
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry: {
        neuEintragDaten: mockNewlyCreatedEntry,
        zustand: "synchronisiert",
      },
    });

    const stattenNachEintragErstelltet = (statten.states as DataState).data
      .states.einträge as EinträgeMitHolenFehler;

    expect(stattenNachEintragErstelltet.wert).toBe(
      StateValue.einträgeMitHolenFehler,
    );

    statten = reducer(statten, {
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.erfolg,
      seiteInfo: {} as any,
      einträge: [
        {
          eintragDaten: {} as any,
        },
      ],
    });

    const stattenHolenEinträgeErfolg = (statten.states as DataState).data.states
      .einträge as EinträgeDatenErfolg;

    expect(stattenHolenEinträgeErfolg.wert).toBe(StateValue.erfolg);
    expect(stattenHolenEinträgeErfolg.erfolg.context).toEqual({
      seiteInfo: {},
      einträge: [
        {
          eintragDaten: {},
        },
      ],
    });
  });

  it("Erhalten Einträge handhaben scheitern, wenn Einträge mit Fehler", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    statten = reducer(statten, {
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry: {
        neuEintragDaten: mockNewlyCreatedEntry,
        zustand: "synchronisiert",
      },
    });

    const stattenNachEintragErstelltet = (statten.states as DataState).data
      .states.einträge as EinträgeMitHolenFehler;

    expect(stattenNachEintragErstelltet.wert).toBe(
      StateValue.einträgeMitHolenFehler,
    );

    statten = reducer(statten, {
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.versagen,
      fehler: "a",
    });

    const stattenHolenEinträgeVersagen = (statten.states as DataState).data
      .states.einträge as EinträgeMitHolenFehler;

    expect(stattenHolenEinträgeVersagen.wert).toBe(
      StateValue.einträgeMitHolenFehler,
    );
    expect(
      stattenHolenEinträgeVersagen.einträgeMitHolenFehler.context.holenFehler,
    ).toEqual("a");
  });

  it("stornieren löschen Erfahrung", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    statten = reducer(statten, {
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: StateValue.requested,
    });

    statten = reducer(statten, {
      type: ActionType.DELETE_EXPERIENCE_CANCELLED,
    });

    const [wirkung] = (statten.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc = effectFunctions[wirkung.key];

    expect(mockHistoryPushFn).not.toBeCalled();

    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0]).toEqual({
      key: StateValue.cancelled,
      id: onlineId,
      title: DEFAULT_ERFAHRUNG.title,
    });

    expect(mockHistoryPushFn).toBeCalled();
  });

  it("handhaben zeigen vollständig optionen menü", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
      key: StateValue.data,
      erfahrung: DEFAULT_ERFAHRUNG,
      einträgeDaten: {
        schlüssel: StateValue.versagen,
        fehler: "a",
      },
    });

    expect(
      (statten.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.inactive);

    statten = reducer(statten, {
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
    });

    expect(
      (statten.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.active);

    statten = reducer(statten, {
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
    });

    expect(
      (statten.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.inactive);
  });

  it("holen Erfahrungen mit timeouts", async () => {
    let statten = initState();

    const [wirkung] = (statten.effects.general as GenericHasEffect<
      EffectType
    >).hasEffects.context.effects;

    const wirkungFunc = effectFunctions[wirkung.key];
    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);
    jest.runAllTimers()


    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);
    mockGetIsConnected.mockReturnValue(true)
    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);
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
      experienceId: DEFAULT_ERFAHRUNG.id,
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

function getNewEntryTriggerEl() {
  return document
    .getElementsByClassName("new-entry-trigger")
    .item(0) as HTMLElement;
}

function getNewEntryNotificationEl() {
  return document.getElementById(
    newEntryCreatedNotificationCloseId,
  ) as HTMLElement;
}

function getEntriesErrorsNotificationEl() {
  return document.getElementById(
    entriesErrorsNotificationCloseId,
  ) as HTMLElement;
}

function getMenuEl() {
  return document
    .getElementsByClassName("top-options-menu")
    .item(0) as HTMLDivElement;
}

function kriegStornierenErfahrungLöschenEl() {
  return document
    .getElementsByClassName("delete-experience__cancel-button")
    .item(0) as HTMLElement;
}

function kriegOkErfahrungLöschenEl() {
  return document
    .getElementsByClassName("delete-experience__ok-button")
    .item(0) as HTMLElement;
}

function kriegNeueHolenEinträge() {
  return document.getElementById(neueHolenEinträgeId) as HTMLElement;
}

function kriegHolenNächstenEinträgeEl() {
  return document.getElementById(holenNächstenEinträgeId) as HTMLElement;
}

function kriegPaginierungFehlerEl() {
  return document
    .getElementsByClassName("detailed-experience__paginierung-fehler")
    .item(0);
}

function kriegNichtSynchronisiertFehler(index: number = 0) {
  return document
    .getElementsByClassName("detailed-experience__entry-edit")
    .item(index) as HTMLElement;
}
