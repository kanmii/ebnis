/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { E2EWindowObject } from "../utils/types";
import {
  cleanupObservableSubscription,
  useOnExperiencesDeletedSubscription,
} from "../components/WithSubscriptions/with-subscriptions.injectables";
import { WithSubscriptions } from "../components/WithSubscriptions/with-subscriptions.component";
import {
  makeObservable,
  EmitActionType,
  makeBChannel,
} from "../utils/observable-manager";
import { act } from "react-dom/test-utils";

let mockWithEmitterProviderValue = null as any;
jest.mock(
  "../components/WithSubscriptions/with-subscriptions.injectables",
  () => ({
    WithEmitterProvider: ({ children, value }: any) => {
      mockWithEmitterProviderValue = value;

      return children;
    },
    cleanupObservableSubscription: jest.fn(),
    useOnExperiencesDeletedSubscription: jest.fn(),
  }),
);
const mockCleanupObservableSubscription = cleanupObservableSubscription as jest.Mock;
const mockUseOnExperiencesDeletedSubscription = useOnExperiencesDeletedSubscription as jest.Mock;

const zen = {} as E2EWindowObject;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
  (zen.observable as any) = null;
  (zen.emitData as any) = null;
});

it("defaults", () => {
  mockUseOnExperiencesDeletedSubscription.mockReturnValue({});
  const { ui } = makeComp();
  const { unmount } = render(ui);

  // no network connection
  expect(mockWithEmitterProviderValue.connected).toBe(false);

  // now connected
  act(() => {
    zen.emitData({
      type: EmitActionType.connectionChanged,
      connected: true,
    });
  });

  expect(mockWithEmitterProviderValue.connected).toBe(true);

  // not time to cleanup
  expect(mockCleanupObservableSubscription).not.toHaveBeenCalled();
  unmount();

  //cleanup
  expect(mockCleanupObservableSubscription).toHaveBeenCalled();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithSubscriptionsP = WithSubscriptions as ComponentType<Partial<{}>>;

function makeComp() {
  makeObservable(zen);
  makeBChannel(zen);

  return {
    ui: (
      <WithSubscriptionsP {...zen}>
        <div />
      </WithSubscriptionsP>
    ),
  };
}

