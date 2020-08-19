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
} from "../components/DetailExperience/utils";
import { EntryConnectionFragment } from "../graphql/apollo-types/EntryConnectionFragment";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
  noEntryTrigger,
} from "../components/DetailExperience/detail-experience.dom";
import { act } from "react-dom/test-utils";
import { defaultExperience } from "../tests.utils";
import { makeOfflineId } from "../utils/offlines";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import { getSyncingExperience } from "../apollo/syncing-experience-ledger";
import { replaceOrRemoveExperiencesInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { E2EWindowObject } from "../utils/types";
import { getUnSyncEntriesErrorsLedger } from "../apollo/unsynced-ledger";
import { getDeleteExperienceLedger } from "../apollo/delete-experience-cache";
import { getIsConnected } from "../utils/connections";
import {
  manuallyFetchDetailedExperience,
  DetailedExperienceQueryResult,
} from "../utils/experience.gql.types";
import { useDeleteExperiencesMutation } from "../components/DetailExperience/detail-experience.injectables";

jest.mock("../components/Header/header.component", () => () => null);

const mockDeleteExperiences = jest.fn();
const mockUseDeleteExperiencesMutation = useDeleteExperiencesMutation as jest.Mock;
jest.mock("../components/DetailExperience/detail-experience.injectables");
mockUseDeleteExperiencesMutation.mockReturnValue([mockDeleteExperiences]);

const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
jest.mock("../apollo/delete-experience-cache");

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
const mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = replaceOrRemoveExperiencesInGetExperiencesMiniQuery as jest.Mock;

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
            mayBeNewEntry: mockNewlyCreatedEntry,
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

describe("components", () => {
  const timeout = 100000;
  const entryOfflineClassName = "entry--is-danger";

  it("has connection/nothing to sync/no entries/entry added/entry errors auto close notification", async () => {
    mockGetSyncingExperience.mockReturnValue(null);
    mockGetDeleteExperienceLedger.mockReturnValue(null);
    mockGetIsConnected.mockReturnValue(true);

    mockManuallyFetchDetailedExperience.mockResolvedValueOnce({
      data: {
        getExperience: {
          ...defaultExperience, // no entries
        },
      },
    } as DetailedExperienceQueryResult);

    const { ui } = makeComp();
    render(ui);

    // no entries to display
    expect(getEntriesEl()).toBeNull();

    expect(document.getElementById(mockNewEntryId)).toBeNull();

    // new entry UI initially not visible while experience is being fetched
    // so we must wait till the next tick
    const noEntryEl = await waitForElement(getNoEntryEl);

    act(() => {
      noEntryEl.click();
    });

    // assertions to show new entry has not been created / error received
    expect(mockScrollDocumentToTop).not.toHaveBeenCalled();
    expect(getNewEntryNotificationEl()).toBeNull();
    expect(getEntriesErrorsNotificationEl()).toBeNull();

    // let's simulate new entry created but with error and one entry created
    const newEntryEl = document.getElementById(mockNewEntryId) as HTMLElement;

    act(() => {
      newEntryEl.click();
    });

    // UI has not been updated with newly created entry
    expect(document.getElementById(mockNewEntryId)).toBeNull();

    // now UI is updated with newly created entry
    await waitForElement(getNewEntryNotificationEl);

    const entriesErrorsNotificationEl = getEntriesErrorsNotificationEl();

    expect(mockScrollDocumentToTop).toHaveBeenCalled();

    act(() => {
      entriesErrorsNotificationEl.click();
    });

    expect(getEntriesErrorsNotificationEl()).toBeNull();

    // simulate auto close notification

    act(() => {
      jest.advanceTimersByTime(timeout);
    });

    expect(getNewEntryNotificationEl()).toBeNull();
  });
});

describe("reducer", () => {
  //
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  const location = props.location || ({} as any);

  props.match = {
    params: {
      experienceId: defaultExperience.id,
    },
  } as Match;

  return {
    ui: <DetailExperienceP location={location} {...props} />,
  };
}

function getNoEntryEl() {
  return document.getElementsByClassName(noEntryTrigger).item(0) as HTMLElement;
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
