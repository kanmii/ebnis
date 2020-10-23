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
  EinträgeMitHolenFehler,
  EffectType,
  effectFunctions,
  EinträgeDatenErfolg,
  EinträgeDatenVersagen,
  ExperienceSyncError,
} from "../components/DetailExperience/detailed-experience-utils";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import {
  newEntryCreatedNotificationCloseId,
  syncErrorsNotificationId,
  noEntryTriggerId,
  refetchExperienceId,
  neueHolenEinträgeId,
  holenNächstenEinträgeId,
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
  sammelnZwischengespeicherteErfahrung,
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
} from "../utils/sync-to-server.types";
import { DefinitionErrorFragment } from "../graphql/apollo-types/DefinitionErrorFragment";
import { Props as UpsertExperienceProps } from "../components/UpsertExperience/upsert-experience.utils";
import { DataObjectErrorFragment } from "../graphql/apollo-types/DataObjectErrorFragment";

jest.mock("../apollo/sync-to-server-cache");
const mockGetSyncError = getSyncError as jest.Mock;

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockSammelnZwischengespeicherteErfahrung = sammelnZwischengespeicherteErfahrung as jest.Mock;

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

const DEFAULT_ERFAHRUNG = {
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

const EINTRAG_KLIENT_ID = "aa";
const EINTRAG_ID = "a";

const onlineEntry = {
  __typename: "Entry",
  id: EINTRAG_ID,
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
};

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
          ...onlineEntrySuccess,
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

    expect(getNewEntryNotificationEl()).toBeNull();
    expect(getSyncErrorsNotificationEl()).toBeNull();

    act(() => {
      entryEl.click();
    });

    const schließNeuEintragEl = getNewEntryNotificationEl();
    const eintragFehlerNachrichten = getSyncErrorsNotificationEl();

    act(() => {
      schließNeuEintragEl.click();
    });

    expect(getNewEntryNotificationEl()).toBeNull();
  });

  it("es gibt Einträge von zwischengespeicherte/löschen erfahrung", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
        getEntries: onlineEntrySuccess,
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

    mockGetSyncError.mockReturnValue({
      createEntries: {
        [onlineEntry.id]: {
          error: "a",
        },
      } as OfflineIdToCreateEntrySyncErrorMap,
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
      kriegNichtSynchronisiertFehler().click();
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

  it("Neu Eintrag erstelltet als Einträge könnten nicht holen", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    const holenEinträgeScheitertStatten = (statten.states as DataState).data
      .states.einträge;

    expect(holenEinträgeScheitertStatten.wert).toBe(StateValue.versagen);

    statten = reducer(statten, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online,
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
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online,
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
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.offline,
      },
    });

    const [wirkung2] = (statten.effects.general as GenericHasEffect<
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
  });

  it("Erhalten Einträge handhaben erfolg, wenn Einträge mit Fehler", () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    statten = reducer(statten, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online, // oldEntry too ??
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
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    statten = reducer(statten, {
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
      newData: {
        entry: mockNewlyCreatedEntry,
        onlineStatus: StateValue.online,
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
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
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
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    expect(
      (statten.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.inactive);

    statten = reducer(statten, {
      type: ActionType.TOGGLE_EXPERIENCE_MENU,
    });

    expect(
      (statten.states as DataState).data.states.showingOptionsMenu.value,
    ).toBe(StateValue.active);

    statten = reducer(statten, {
      type: ActionType.TOGGLE_EXPERIENCE_MENU,
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
    jest.runAllTimers();

    wirkungFunc(wirkung.ownArgs as any, props, effectArgs);
    mockGetIsConnected.mockReturnValue(true);
    jest.runTimersToTime(FETCH_EXPERIENCES_TIMEOUTS[0]);
  });

  it("holen Einträge warf Ausnahme, dann ohne erfolg", async () => {
    let statten = initState();

    statten = reducer(statten, {
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: {
        key: StateValue.data,
        erfahrung: DEFAULT_ERFAHRUNG,
        einträgeDaten: {
          schlüssel: StateValue.versagen,
          fehler: "a",
        },
        onlineStatus: StateValue.online,
      },
    });

    statten = reducer(statten, {
      type: ActionType.RE_FETCH_ENTRIES,
    });

    const [wirkung] = (statten.effects.general as GenericHasEffect<
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
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.versagen,
      fehler: error,
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
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.versagen,
      fehler: "b",
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
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
        [EINTRAG_ID]: "a" as UpdateEntrySyncErrors,
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
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
    expect(kriegNichtSynchronisiertFehler()).not.toBeNull();

    // There is button user can click to edit entry
    const triggerUpdateEntryEl = kriegNichtSynchronisiertFehler();

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
    expect(kriegNichtSynchronisiertFehler()).toBeNull();
  });

  it("displays sync errors for update entries", () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given an experience has update entries sync errors
    mockGetSyncError.mockReturnValue({
      updateEntries: {
        [EINTRAG_ID]: "a" as UpdateEntrySyncErrors,
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
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
    const triggerUpdateEntryEl = kriegNichtSynchronisiertFehler();
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
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

    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...DEFAULT_ERFAHRUNG,
        },
        getEntries: emptyEntriesSuccessList,
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    const { debug } = render(ui);

    // experience menu should be visible

    expect(getUpdateExperienceEl()).not.toBeNull();
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

function getUpsertEntryTriggerEl() {
  return document
    .getElementsByClassName("upsert-entry-trigger")
    .item(0) as HTMLElement;
}

function getNewEntryNotificationEl() {
  return document.getElementById(
    newEntryCreatedNotificationCloseId,
  ) as HTMLElement;
}

function getSyncErrorsNotificationEl() {
  return document.getElementById(syncErrorsNotificationId) as HTMLElement;
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
