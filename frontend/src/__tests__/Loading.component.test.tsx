/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { Loading } from "../components/Loading/loading.component";
import { defaultLoadingDomId } from "../components/Loading/loading-dom";
import { act } from "react-dom/test-utils";
import { onUnmount } from "../components/Loading/loading.injectables";

jest.mock("../components/Loading/loading.injectables");
const mockOnUnmount = onUnmount as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.resetAllMocks();
});

it("renders loading UI", () => {
  const { ui } = makeComp();
  act(() => {
    const { unmount } = render(ui);

    // loading UI will be visible after timer completes
    expect(document.getElementById(defaultLoadingDomId)).toBeNull();

    jest.runAllTimers();

    expect(document.getElementById(defaultLoadingDomId)).not.toBeNull();

    // cleanup code
    expect(mockOnUnmount).not.toHaveBeenCalled();

    unmount();
    expect(mockOnUnmount).toHaveBeenCalled();
  });
});

it("does not render loading UI", () => {
  const { ui } = makeComp({
    props: {
      loading: false,
    },
  });
  act(() => {
    const { unmount } = render(ui);

    // loading UI will never be rendered
    expect(document.getElementById(defaultLoadingDomId)).toBeNull();

    jest.runAllTimers();

    // loading UI will never be rendered
    expect(document.getElementById(defaultLoadingDomId)).toBeNull();

    expect(mockOnUnmount).not.toHaveBeenCalled();

    unmount();
    expect(mockOnUnmount).not.toHaveBeenCalled();
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const LoadingP = Loading as ComponentType<Partial<{}>>;

function makeComp({ props = {} }: { props?: Partial<{}> } = {}) {
  return {
    ui: <LoadingP {...props} />,
  };
}
