/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars*/
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement } from "@testing-library/react";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  Props,
  ActionType,
  DetailedExperienceChildDispatchProps,
} from "../components/DetailExperience/detail-experience.utils";
import { EntryConnectionFragment } from "../graphql/apollo-types/EntryConnectionFragment";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
} from "../components/DetailExperience/detail-experience.dom";
import { act } from "react-dom/test-utils";
import { defaultExperience } from "../tests.utils";
import { makeOfflineId } from "../utils/offlines";
import { CreateEntryErrorFragment } from "../graphql/apollo-types/CreateEntryErrorFragment";
import { getSyncingExperience } from "../components/NewExperience/new-experience.resolvers";
import { replaceOrRemoveExperiencesInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { E2EWindowObject } from "../utils/types";
import { getSyncEntriesErrorsLedger } from "../apollo/unsynced-ledger";

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

jest.mock("../components/NewExperience/new-experience.resolvers");
const mockGetSyncingExperience = getSyncingExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = replaceOrRemoveExperiencesInGetExperiencesMiniQuery as jest.Mock;

const mockNewEntryId = "aa";
const mockActionType = ActionType;
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
              updatedAt: "2020-05-08T06:49:19Z",
              id: "c",
              clientId: "d",
            } as EntryFragment,
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
const mockGetSyncEntriesErrorsLedger = getSyncEntriesErrorsLedger as jest.Mock;

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

  it("no entries/entry added/auto close notification", async () => {
    const { ui } = makeComp();
    render(ui);

    // no entries to display
    expect(getEntriesEl()).toBeNull();

    // new entry UI initially not visible
    expect(document.getElementById(mockNewEntryId)).toBeNull();

    getNoEntryEl().click();

    expect(mockScrollDocumentToTop).not.toHaveBeenCalled();

    expect(getNewEntryNotificationEl()).toBeNull();
    expect(getEntriesErrorsNotificationEl()).toBeNull();

    // new entry UI now visible: let's simulate new entry created
    const newEntryEl = await waitForElement(() => {
      return document.getElementById(mockNewEntryId) as HTMLElement;
    });

    newEntryEl.click();
    expect(document.getElementById(mockNewEntryId)).toBeNull();
    let newEntryNotificationEl = await waitForElement(
      getNewEntryNotificationEl,
    );
    const entriesErrorsNotificationEl = getEntriesErrorsNotificationEl();

    expect(mockScrollDocumentToTop).toHaveBeenCalled();

    newEntryNotificationEl.click();
    expect(getNewEntryNotificationEl()).toBeNull();

    entriesErrorsNotificationEl.click();
    expect(getEntriesErrorsNotificationEl()).toBeNull();

    // simulate auto close notification
    const newEntryToggleEl = getNewEntryTriggerEl();
    newEntryToggleEl.click();
    (document.getElementById(mockNewEntryId) as HTMLElement).click();
    await waitForElement(getNewEntryNotificationEl); // exists

    act(() => {
      jest.advanceTimersByTime(timeout);
    });

    expect(getNewEntryNotificationEl()).toBeNull();
  });

  it("with online entry", async () => {
    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          entries: {
            edges: [
              {
                node: {
                  id: "1",
                  dataObjects: [
                    {
                      id: "1",
                      definitionId: "1",
                      data: `{"integer":1}`,
                    },
                  ],
                  updatedAt: "2020-05-08T01:40:07.160Z",
                },
              },
            ],
          } as EntryConnectionFragment,
        },
      },
    });

    render(ui);

    // we have an entry, no entry UI should not be visible
    expect(getNoEntryEl()).toBeNull();

    expect(document.getElementById(mockNewEntryId)).toBeNull();

    const newEntryToggleEl = getNewEntryTriggerEl();
    newEntryToggleEl.click();
    expect(document.getElementById(mockNewEntryId)).not.toBeNull();
    newEntryToggleEl.click();
    expect(document.getElementById(mockNewEntryId)).toBeNull();

    const entryEl = document.querySelector(".entry") as HTMLElement;
    expect(entryEl.classList).not.toContain(entryOfflineClassName);
  });

  it("with offline entry", () => {
    const id = makeOfflineId(1);

    mockGetSyncingExperience.mockReturnValue({
      offlineExperienceId: "1",
      newEntryClientId: id,
    });

    const { ui } = makeComp({
      syncEntriesErrors: {
        [id]: [],
      },
      props: {
        experience: {
          ...defaultExperience,
          entries: {
            edges: [
              {
                node: {
                  id,
                  clientId: id,
                  dataObjects: [
                    {
                      id,
                      definitionId: "1",
                      data: `{"integer":1}`,
                    },
                  ],
                  updatedAt: "2020-05-08T01:40:07.160Z",
                },
              },
              {
                node: {
                  id: "2",
                  clientId: "3",
                  dataObjects: [],
                  updatedAt: "2020-05-08T01:40:07.160Z",
                },
              },
            ],
          } as EntryConnectionFragment,
        },
      },
    });

    render(ui);

    const entryEl = document.querySelector(
      `.entry.${entryOfflineClassName}`,
    ) as HTMLElement;

    expect(entryEl.classList).toContain(entryOfflineClassName);

    expect(
      mockReplaceOrRemoveExperiencesInGetExperiencesMiniQuery,
    ).toHaveBeenCalled();
  });

  it("edit entry", async () => {
    mockGetSyncingExperience.mockReturnValue({
      offlineExperienceId: "1",
      newEntryClientId: "3",
    });

    const id = makeOfflineId(1);

    const { ui } = makeComp({
      syncEntriesErrors: {
        [id]: [],
      },
      props: {
        experience: {
          ...defaultExperience,
          entries: {
            edges: [
              {
                node: {
                  id,
                  clientId: id,
                  dataObjects: [
                    {
                      id,
                      definitionId: "1",
                      data: `{"integer":1}`,
                    },
                  ],
                  updatedAt: "2020-05-08T01:40:07.160Z",
                },
              },
              {
                node: {
                  id: "2",
                  clientId: "3",
                  dataObjects: [],
                  updatedAt: "2020-05-08T01:40:07.160Z",
                },
              },
            ],
          } as EntryConnectionFragment,
        },
      },
    });

    const { debug } = render(ui);

    const entryEl = document.querySelector(
      `.entry.${entryOfflineClassName}`,
    ) as HTMLElement;

    expect(document.getElementById(mockNewEntryId)).toBeNull();

    (entryEl.querySelector(".entry__edit") as HTMLElement).click();

    await waitForElement(() => {
      return document.getElementById(mockNewEntryId) as HTMLElement;
    });
  });
});

describe("reducer", () => {
  //
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
  syncEntriesErrors,
}: {
  props?: Partial<Props>;
  syncEntriesErrors?: { [key: string]: [] };
} = {}) {
  mockGetSyncEntriesErrorsLedger.mockReturnValue(syncEntriesErrors || {});

  const experience = props.experience || defaultExperience;

  return {
    ui: <DetailExperienceP {...props} experience={experience} />,
  };
}

function getNoEntryEl() {
  return document
    .getElementsByClassName("no-entry-alert")
    .item(0) as HTMLElement;
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
