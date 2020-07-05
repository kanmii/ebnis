/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { My } from "../components/My/my.component";
import {
  Props,
  reducer,
  initState,
  StateValue,
  ActionType,
  MyChildDispatchProps,
} from "../components/My/my.utils";
import {
  activateNewDomId,
  noExperiencesActivateNewDomId,
  domPrefix,
  experiencesDomId,
  searchInputDomId,
} from "../components/My/my.dom";
import { act } from "react-dom/test-utils";
import { ExperienceMiniFragment } from "../graphql/apollo-types/ExperienceMiniFragment";
import { makeOfflineId } from "../utils/offlines";
import { fillField } from "../tests.utils";

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
const offlineId = makeOfflineId(3);

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

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

function getContainer() {
  return document.getElementById(domPrefix) as HTMLElement;
}

describe("component", () => {
  const experienceClassName = "experience";
  const experienceDangerClassName = "experience--is-danger";
  const experienceWarningClassName = "experience--is-warning";
  const dropdownTriggerClassName = "dropdown-trigger media-right";
  const dropdownMenuClassName = "dropdown";
  const dropdownIsActiveClassName = "is-active";
  const descriptionClassName = "description";
  const descriptionControlClassName = "description__control";
  const descriptionMoreClassName = "description__control--more";
  const descriptionLessClassName = "description__control--less";
  const descriptionFullClassName = "description__text--full";
  const descriptionSummaryClassName = "description__text--summary";

  it("no experiences", () => {
    const { ui } = makeComp();
    render(ui);

    // no search/experiences UI cos no experiences
    expect(document.getElementById(searchInputDomId)).toBeNull();
    expect(document.getElementById(experiencesDomId)).toBeNull();

    expect(document.getElementById(mockNewExperienceId)).toBeNull();

    // activate new using new button
    (document.getElementById(activateNewDomId) as HTMLElement).click();

    const newExperienceEl = document.getElementById(
      mockNewExperienceId,
    ) as HTMLElement;
    expect(newExperienceEl).not.toBeNull();

    act(() => {
      newExperienceEl.click();
    });

    expect(document.getElementById(mockNewExperienceId)).toBeNull();

    act(() => {
      // activate new using 'no experiences' button
      (document.getElementById(
        noExperiencesActivateNewDomId,
      ) as HTMLElement).click();
    });

    expect(document.getElementById(mockNewExperienceId)).not.toBeNull();
  });

  const experiences = [
    {
      id: onlineId,
      title: "aa",
      description: "aa",
    },
    {
      id: mockPartOnlineId,
      title: "bb",
    },
    {
      id: offlineId,
      title: "cc",
      description: "cc",
    },
  ] as ExperienceMiniFragment[];

  it("with experiences", async () => {
    const { ui } = makeComp({
      props: {
        experiences,
      },
    });

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
    let state = initState({ experiences: [] } as Props);

    state = reducer(state, {
      type: ActionType.ACTIVATE_NEW_EXPERIENCE,
    });
    expect(state.states.newExperienceActivated.value).toBe(StateValue.active);

    state = reducer(state, {
      type: ActionType.DEACTIVATE_NEW_EXPERIENCE,
    });
    expect(state.states.newExperienceActivated.value).toBe(StateValue.inactive);
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const MyP = My as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  const experiences = props.experiences || [];

  return {
    ui: <MyP {...props} experiences={experiences} />,
  };
}
