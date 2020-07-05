/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement } from "@testing-library/react";
import My from "../components/My/my.index";
import { manuallyFetchExperienceConnectionMini } from "../utils/experience.gql.types";
import {
  fetchExperiencesErrorsDomId,
  fetchErrorRetryDomId,
} from "../components/My/my.dom";

jest.mock("../components/Header/header.component", () => () => null);

const mockLoadingComponentId = "ll";
jest.mock("../components/Loading/loading.component", () => () => (
  <div id={mockLoadingComponentId} />
));

jest.mock("../utils/connections");

jest.mock("../utils/experience.gql.types");

const mockMyComponentId = "aa";
jest.mock("../components/My/my.component", () => ({
  My: () => <div id={mockMyComponentId} />,
}));

const mockManuallyFetchExperienceConnectionMini = manuallyFetchExperienceConnectionMini as jest.Mock;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const dataResult = {
  data: {
    getExperiences: {
      edges: [
        {
          node: {},
        },
      ],
    },
  },
};

it("re fetch on error", async () => {
  mockManuallyFetchExperienceConnectionMini.mockRejectedValueOnce(
    new Error("a"),
  );

  const { ui } = makeComp();
  render(ui);

  await waitForElement(getLoadingEl);
  expect(getErrorEl()).not.toBeNull();
  expect(getDataEl()).toBeNull();

  expect(mockManuallyFetchExperienceConnectionMini).toHaveBeenCalled();

  // re fetch
  const fetchEl = document.getElementById(fetchErrorRetryDomId) as HTMLElement;

  mockManuallyFetchExperienceConnectionMini.mockReset();

  mockManuallyFetchExperienceConnectionMini.mockResolvedValueOnce({
    loading: true,
  });

  fetchEl.click();
  await waitForElement(getLoadingEl);
  expect(getDataEl()).toBeNull();
  expect(getErrorEl()).toBeNull();
});

it("data", async () => {
  mockManuallyFetchExperienceConnectionMini.mockResolvedValue(dataResult);

  const { ui } = makeComp();
  render(ui);
  await waitForElement(getDataEl);
  expect(getErrorEl()).toBeNull();

  expect(mockManuallyFetchExperienceConnectionMini.mock.calls[0][0]).toBe(
    "cache-first",
  );
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const MyP = My as ComponentType<Partial<{}>>;

function makeComp({ props = {} }: { props?: Partial<{}> } = {}) {
  return {
    ui: <MyP {...props} />,
  };
}

function getLoadingEl() {
  return document.getElementById(mockLoadingComponentId) as HTMLElement;
}

function getDataEl() {
  return document.getElementById(mockMyComponentId) as HTMLElement;
}

function getErrorEl() {
  return document.getElementById(fetchExperiencesErrorsDomId) as HTMLElement;
}
