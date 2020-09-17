/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement } from "@testing-library/react";
import { My } from "../components/My/my.component";
import {
  Props,
  reducer,
  initState,
  ActionType,
  MyChildDispatchProps,
  DataState,
} from "../components/My/my.utils";
import {
  activateNewDomId,
  noExperiencesActivateNewDomId,
  domPrefix,
  experiencesDomId,
  searchInputDomId,
  experienceWarningClassName,
  experienceDangerClassName,
  descriptionMoreClassName,
  descriptionSummaryClassName,
  descriptionFullClassName,
  descriptionLessClassName,
  descriptionControlClassName,
  dropdownTriggerClassName,
  dropdownIsActiveClassName,
  fetchErrorRetryDomId,
} from "../components/My/my.dom";
import { act } from "react-dom/test-utils";
// import { ExperienceMiniFragment } from "../graphql/apollo-types/ExperienceMiniFragment";
// import { makeOfflineId } from "../utils/offlines";
import { fillField } from "../tests.utils";
import { StateValue } from "../utils/types";
import {
  manuallyFetchExperienceConnectionMini,
  KleinErfahrüngenAbfrageErgebnisse,
} from "../utils/experience.gql.types";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { getIsConnected } from "../utils/connections";
import { getDeleteExperienceLedger } from "../apollo/delete-experience-cache";
import { GetExperienceConnectionMini_getExperiences_edges } from "../graphql/apollo-types/GetExperienceConnectionMini";
import { WithSubscriptionContext } from "../utils/app-context";

jest.mock("../utils/experience.gql.types");
const mockManuallyFetchExperienceConnectionMini = manuallyFetchExperienceConnectionMini as jest.Mock;

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/delete-experience-cache");
jest.mock("../components/Header/header.component", () => () => null);
jest.mock("../utils/global-window");

const mockNewExperienceId = "new-experience";
const mockActionType = require("../components/My/my.utils").ActionType;
jest.mock("../components/My/my.lazy", () => ({
  NewExperience: ({ myDispatch }: MyChildDispatchProps) => {
    return (
      <div
        id={mockNewExperienceId}
        onClick={() => {
          myDispatch({
            type: mockActionType.DEACTIVATE_NEW_EXPERIENCE,
          });
        }}
      />
    );
  },
}));

const onlineId = "1";
const mockPartOnlineId = "2";
// const offlineId = makeOfflineId(3);

jest.mock("../apollo/unsynced-ledger", () => ({
  getUnsyncedExperience: (id: string) => {
    return id === mockPartOnlineId ? {} : null;
  },
}));

jest.mock("react-router-dom", () => ({
  Link: ({ className = "", to, children }: any) => {
    to = typeof to === "string" ? to : JSON.stringify(to);

    return (
      <a className={className} href={to}>
        {" "}
        {children}{" "}
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

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

function getContainer() {
  return document.getElementById(domPrefix) as HTMLElement;
}

describe("component", () => {
  const experienceClassName = "experience";
  const dropdownMenuClassName = "dropdown";
  const descriptionClassName = "description";

  it("verbunden/sammeln Erfahrüngen Fehler/wiederholen aber kein Erfahrung/erstellen eine Erfahrung aktivieren/deaktivieren", async () => {
    mockGetIsConnected.mockResolvedValue(true);

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      error: new Error("a"),
    } as KleinErfahrüngenAbfrageErgebnisse);

    const { ui } = makeComp();
    render(ui);

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

    const aktivierenNeueErfahrungTaste = await waitForElement(() => {
      return document.getElementById(
        noExperiencesActivateNewDomId,
      ) as HTMLElement;
    });

    expect(document.getElementById(mockNewExperienceId)).toBeNull();

    aktivierenNeueErfahrungTaste.click();

    expect(document.getElementById(mockNewExperienceId)).not.toBeNull();
  });

  fit("Holenerfahrungen erzeuge Ausnahme/ es gibt Erfahrungen", async () => {
    mockGetIsConnected.mockResolvedValue(true);

    mockManuallyFetchExperienceConnectionMini.mockRejectedValue(new Error("a"));

    const { ui } = makeComp();
    render(ui);

    expect(document.getElementById(mockLoadingId)).not.toBeNull();

    expect(document.getElementById(fetchErrorRetryDomId)).toBeNull();

    let wiederholenTaste = await waitForElement(() => {
      return document.getElementById(fetchErrorRetryDomId) as HTMLElement;
    });

    mockManuallyFetchExperienceConnectionMini.mockResolvedValue({
      data: {
        getExperiences: {
          edges: [
            {
              node: {
                id: "a",
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

    expect(document.getElementById(noExperiencesActivateNewDomId)).toBeNull();

    expect(document.getElementsByClassName("my-experiences__next").item(0))
      .toBeUndefined;

    const aktivierenNeueErfahrungTaste = await waitForElement(() => {
      return document
        .getElementsByClassName("my-experiences__next")
        .item(0) as HTMLDivElement;
    });

    return;

    expect(document.getElementById(mockNewExperienceId)).toBeNull();

    aktivierenNeueErfahrungTaste.click();

    expect(document.getElementById(mockNewExperienceId)).not.toBeNull();
  });

  // const experiences = [
  //   {
  //     id: onlineId,
  //     title: "aa",
  //     description: "aa",
  //   },
  //   {
  //     id: mockPartOnlineId,
  //     title: "bb",
  //   },
  //   {
  //     id: offlineId,
  //     title: "cc",
  //     description: "cc",
  //   },
  // ] as ExperienceMiniFragment[];

  it("with experiences", async () => {
    const { ui } = makeComp();

    render(ui);

    const experiencesEls = document.getElementsByClassName(experienceClassName);

    // online, part online, fully offline
    const experiencesEls0 = experiencesEls.item(0) as HTMLElement;
    expect(experiencesEls0.className).not.toContain(experienceDangerClassName);
    expect(experiencesEls0.className).not.toContain(experienceWarningClassName);

    const experiencesEls1 = experiencesEls.item(1) as HTMLElement;
    expect(experiencesEls1.className).toContain(experienceWarningClassName);
    expect(experiencesEls1.className).not.toContain(experienceDangerClassName);

    const experiencesEls2 = experiencesEls.item(2) as HTMLElement;
    expect(experiencesEls2.className).toContain(experienceDangerClassName);
    expect(experiencesEls2.className).not.toContain(experienceWarningClassName);

    // do not show description UI if no description
    expect(
      experiencesEls1.getElementsByClassName(descriptionClassName).length,
    ).toBe(0);

    // toggle description b4 options menu
    const descriptionEl2 = experiencesEls2
      .getElementsByClassName(descriptionClassName)
      .item(0) as HTMLElement;

    expect(
      descriptionEl2.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(1);

    expect(
      descriptionEl2.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(0);

    act(() => {
      (descriptionEl2
        .getElementsByClassName(descriptionControlClassName)
        .item(0) as HTMLElement).click();
    });

    expect(
      descriptionEl2.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(0);

    expect(
      descriptionEl2.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(1);

    // options menu/dropdown
    const dropdownMenuEl0 = experiencesEls0
      .getElementsByClassName(dropdownMenuClassName)
      .item(0) as HTMLElement;

    expect(dropdownMenuEl0.classList).not.toContain(dropdownIsActiveClassName);

    act(() => {
      (experiencesEls0
        .getElementsByClassName(dropdownTriggerClassName)
        .item(0) as HTMLElement).click();
    });

    // clear search and experiences menu
    const containerEl = getContainer();
    act(() => {
      containerEl.click();
    });
    expect(dropdownMenuEl0.classList).not.toContain(dropdownIsActiveClassName);

    // toggle description after dropdown toggle

    const descriptionEl0 = experiencesEls0
      .getElementsByClassName(descriptionClassName)
      .item(0) as HTMLElement;

    expect(
      descriptionEl0.getElementsByClassName(descriptionMoreClassName).length,
    ).toBe(1);

    expect(
      descriptionEl0.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(1);

    expect(
      descriptionEl0.getElementsByClassName(descriptionLessClassName).length,
    ).toBe(0);

    expect(
      descriptionEl0.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(0);

    act(() => {
      (descriptionEl0
        .getElementsByClassName(descriptionControlClassName)
        .item(0) as HTMLElement).click();
    });

    expect(
      descriptionEl0.getElementsByClassName(descriptionMoreClassName).length,
    ).toBe(0);

    expect(
      descriptionEl0.getElementsByClassName(descriptionSummaryClassName).length,
    ).toBe(0);

    expect(
      descriptionEl0.getElementsByClassName(descriptionLessClassName).length,
    ).toBe(1);

    expect(
      descriptionEl0.getElementsByClassName(descriptionFullClassName).length,
    ).toBe(1);

    const searchLinkClassName = "search__link";
    const searchNoResultClassName = "search__no-results";

    // search

    expect(document.getElementsByClassName(searchLinkClassName).length).toBe(0);

    const searchInputEl = document.getElementById(
      searchInputDomId,
    ) as HTMLElement;

    fillField(searchInputEl, "a");

    const searchLinkEl = document
      .getElementsByClassName(searchLinkClassName)
      .item(0) as HTMLAnchorElement;

    expect(searchLinkEl.href).toContain(onlineId);

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(0);

    fillField(searchInputEl, "aaaaa");

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(1);

    expect(document.getElementsByClassName(searchLinkClassName).length).toBe(0);

    act(() => {
      containerEl.click();
    });

    expect(
      document.getElementsByClassName(searchNoResultClassName).length,
    ).toBe(0);
  });
});

describe("reducer", () => {
  test("deactivate new experience", () => {
    let state = initState();

    state = reducer(state, {
      type: ActionType.ACTIVATE_NEW_EXPERIENCE,
    });

    let dataState = (state.states as DataState).data.states;

    expect(dataState.newExperienceActivated.value).toBe(StateValue.active);

    state = reducer(state, {
      type: ActionType.DEACTIVATE_NEW_EXPERIENCE,
    });

    dataState = (state.states as DataState).data.states;

    expect(dataState.newExperienceActivated.value).toBe(StateValue.inactive);
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const MyP = My as ComponentType<Partial<Props>>;

// const pageInfo = {
//   hasPreviousPage: false,
//   hasNextPage: false,
//   __typename: "PageInfo",
// };

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  const location = (props.location || {}) as any;

  return {
    ui: (
      <WithSubscriptionContext.Provider
        value={{
          connected: true,
        }}
      >
        <MyP {...props} location={location} />{" "}
      </WithSubscriptionContext.Provider>
    ),
  };
}
