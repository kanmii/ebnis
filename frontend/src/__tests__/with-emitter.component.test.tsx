/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { E2EWindowObject } from "../utils/types";
import { cleanupObservableSubscription } from "../components/App/app.injectables";
import { WithEmitter } from "../components/App/with-emitter.component";
import { makeObservable, EmitActionType } from "../utils/observable-manager";
import { act } from "react-dom/test-utils";

let withEmitterProviderValue = null as any;
jest.mock("../components/App/app.injectables", () => ({
  WithEmitterProvider: ({ children, value }: any) => {
    withEmitterProviderValue = value;

    return children;
  },
  cleanupObservableSubscription: jest.fn(),
}));
const mockCleanupObservableSubscription = cleanupObservableSubscription as jest.Mock;

const zen = {} as E2EWindowObject;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
  (zen.observable as any) = null;
  (zen.emitData as any) = null;
});

it("x", () => {
  const { ui } = makeComp();
  const { unmount } = render(ui);

  // not network connection
  expect(withEmitterProviderValue.connected).toBe(false);

  // now connected
  act(() => {
    zen.emitData({
      type: EmitActionType.connectionChanged,
      connected: true,
    });
  });

  expect(withEmitterProviderValue.connected).toBe(true);

  // not time to cleanup
  expect(mockCleanupObservableSubscription).not.toHaveBeenCalled();
  unmount();

  //cleanup
  expect(mockCleanupObservableSubscription).toHaveBeenCalled();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithEmitterP = WithEmitter as ComponentType<Partial<{}>>;

function makeComp() {
  makeObservable(zen);

  return {
    ui: (
      <WithEmitterP {...zen}>
        <div />
      </WithEmitterP>
    ),
  };
}
