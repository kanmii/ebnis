/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement } from "@testing-library/react";
import { App } from "../components/App/app.component";
import { buildClientCache, restoreCacheOrPurgeStorage } from "../apollo/setup";

const mockLoadingId = "a";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingId} />;
});

const mockChildId = "b";
jest.mock("../components/App/app-inner.component", () => {
  return () => <div id={mockChildId} />;
});

jest.mock("../apollo/setup");
const mockBuildClientCache = buildClientCache as jest.Mock;
const mockRestoreCacheOrPurgeStorage = restoreCacheOrPurgeStorage as jest.Mock;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

it("restores cache and renders main app", async () => {
  const { ui } = makeComp();

  render(ui);

  expect(document.getElementById(mockLoadingId)).not.toBeNull();

  expect(document.getElementById(mockChildId)).toBeNull();

  const mainUi = await waitForElement(() => {
    return document.getElementById(mockChildId);
  });

  expect(mainUi).not.toBeNull();

  /**
   * And cache should be restored
   */
  expect(mockRestoreCacheOrPurgeStorage).toHaveBeenCalled();

  /**
   * Then loading UI should not be visible
   */
  expect(document.getElementById(mockLoadingId)).toBeNull();
});

it("did not restore cache and renders main app", async () => {
  mockRestoreCacheOrPurgeStorage.mockRejectedValue({});

  const { ui } = makeComp();

  /**
   * Given app is newly loaded
   */
  render(ui);

  /**
   * App main UI should not be visible
   */
  expect(document.getElementById(mockChildId)).toBeNull();

  /**
   * After a while, app main UI should be visible
   */
  const mainUi = await waitForElement(() => {
    return document.getElementById(mockChildId);
  });

  expect(mainUi).not.toBeNull();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const AppP = App as ComponentType<Partial<{}>>;

function makeComp({ props = {} }: { props?: Partial<{}> } = {}) {
  mockBuildClientCache.mockReturnValue({
    cache: {},
  });

  return {
    ui: <AppP {...props}></AppP>,
  };
}
