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
} from "../components/DetailExperience/complete-experience-utils";
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
} from "../components/DetailExperience/detail-experience.dom";
import { act } from "react-dom/test-utils";
import { makeOfflineId } from "../utils/offlines";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import { getSyncingExperience } from "../apollo/syncing-experience-ledger";
import { insertReplaceRemoveExperiencesInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { E2EWindowObject, StateValue } from "../utils/types";
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
} from "../utils/experience.gql.types";
import { useDeleteExperiencesMutation } from "../components/DetailExperience/detail-experience.injectables";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { sammelnZwischengespeicherteErfahrung } from "../apollo/get-detailed-experience-query";
import { activeClassName } from "../utils/utils.dom";

jest.mock("../apollo/get-detailed-experience-query");
const mockSammelnZwischengespeicherteErfahrung = sammelnZwischengespeicherteErfahrung as jest.Mock;

jest.mock("../components/Header/header.component", () => () => null);

const mockDeleteExperiences = jest.fn();
const mockUseDeleteExperiencesMutation = useDeleteExperiencesMutation as jest.Mock;
jest.mock("../components/DetailExperience/detail-experience.injectables");
mockUseDeleteExperiencesMutation.mockReturnValue([mockDeleteExperiences]);

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

jest.mock("../apollo/syncing-experience-ledger");

const mockManuallyFetchDetailedExperience = manuallyFetchDetailedExperience as jest.Mock;
jest.mock("../utils/experience.gql.types");

const mockGetIsConnected = getIsConnected as jest.Mock;
jest.mock("../utils/connections");

jest.mock("../apollo/delete-experience-cache");

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

jest.mock("../apollo/syncing-experience-ledger");
const mockGetSyncingExperience = getSyncingExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = insertReplaceRemoveExperiencesInGetExperiencesMiniQuery as jest.Mock;

const mockNewEntryId = "aa";
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
      <div
        id={mockNewEntryId}
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
});

const onlineId = "onlineId";

const defaultExperience = {
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

  const eintrag = {
    id: "a",
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
          node: eintrag,
        },
      ],
    },
  };

  fit("has connection/holen erzeugt Ausnahme/entry added/entry errors auto close notification", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      error: new Error("a"),
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    const { debug } = render(ui);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();
    expect(document.getElementById(refetchExperienceId)).toBeNull();

    jest.runAllTimers();
    const wiederholenTaste = await waitForElement(() => {
      return document.getElementById(refetchExperienceId) as HTMLElement;
    });

    mockManuallyFetchDetailedExperience.mockRejectedValueOnce(new Error("b"));

    wiederholenTaste.click();
    jest.runAllTimers();

    await wait(() => true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: {
          ...defaultExperience,
        },
      },
    } as DetailedExperienceQueryResult);

    wiederholenTaste.click();
    jest.runAllTimers();

    expect(kriegNeueHolenEinträge()).toBeNull();
    await waitForElement(kriegNeueHolenEinträge);


    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: {
          ...defaultExperience,
        },
        getEntries: {
          ...einträgeErfolg,
          entries: {
            edges: [] as any,
          },
        },
      },
    } as DetailedExperienceQueryResult);

    wiederholenTaste.click();
    jest.runAllTimers();
    await wait(() => true);
    debug()
    return;

    expect(getNoEntryEl()).toBeNull();
    const noEntryEl = await waitForElement(getNoEntryEl);
    expect(document.getElementById(mockNewEntryId)).toBeNull();

    act(() => {
      noEntryEl.click();
    });

    const entryEl = document.getElementById(mockNewEntryId) as HTMLElement;

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

  it("es gibt Einträge von zwischengespeicherte, löschen erfahrung", async () => {
    mockSammelnZwischengespeicherteErfahrung.mockReturnValueOnce({
      data: {
        getExperience: {
          ...defaultExperience,
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
      experienceId: defaultExperience.id,
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
