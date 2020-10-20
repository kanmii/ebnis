/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, wait } from "@testing-library/react";
import { E2EWindowObject } from "../utils/types";
import {
  cleanupWithSubscriptions,
  useOnExperiencesDeletedSubscription,
} from "../components/WithSubscriptions/with-subscriptions.injectables";
import { WithSubscriptions } from "../components/WithSubscriptions/with-subscriptions.component";
import {
  makeObservable,
  EmitActionType,
  makeBChannel,
} from "../utils/observable-manager";
import { act } from "react-dom/test-utils";
import {
  windowChangeUrl,
  getLocation,
  ChangeUrlType,
} from "../utils/global-window";
import { MY_URL } from "../utils/urls";

// jest.mock("../utils/observable-manager");
// const { makeObservable } = jest.requireActual("../utils/observable-manager");

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;
const mockGetLocation = getLocation as jest.Mock;

let mockWithEmitterProviderValue = null as any;
jest.mock(
  "../components/WithSubscriptions/with-subscriptions.injectables",
  () => ({
    WithSubscriptionProvider: ({ children, value }: any) => {
      mockWithEmitterProviderValue = value;

      return children;
    },
    cleanupWithSubscriptions: jest.fn(),
    useOnExperiencesDeletedSubscription: jest.fn(),
    WithSubscriptionsDispatchProvider: ({ children }: any) => {
      return children;
    },
  }),
);
const mockCleanupWithSubscription = cleanupWithSubscriptions as jest.Mock;
const mockUseOnExperiencesDeletedSubscription = useOnExperiencesDeletedSubscription as jest.Mock;

const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as any;

const globals = {
  persistor,
} as E2EWindowObject;

beforeAll(() => {
  makeBChannel(globals);
  window.____ebnis = globals;
});

afterAll(() => {
  const { bc, emitter } = globals;
  bc.close();
  emitter.complete();
  delete globals.bc;
  delete globals.emitter;
  delete globals.observable

  delete window.____ebnis;
});

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

it("renders", async (done) => {
  mockUseOnExperiencesDeletedSubscription.mockReturnValue({
    data: {
      onExperiencesDeleted: {
        experiences: [
          {
            id: "a",
          },
        ],
      },
    },
  });

  mockGetLocation.mockReturnValue({
    pathname: MY_URL,
  });

  expect(mockPersistFn).not.toHaveBeenCalled();

  const { ui } = makeComp();
  const { unmount } = render(ui);

  // no network connection
  expect(mockWithEmitterProviderValue.connected).toBe(null);

  // now connected
  act(() => {
    globals.emitData({
      type: EmitActionType.connectionChanged,
      connected: true,
    });
  });

  expect(mockWithEmitterProviderValue.connected).toBe(true);

  await wait(() => true);

  expect(mockWindowChangeUrl.mock.calls[0]).toEqual([
    MY_URL,
    ChangeUrlType.replace,
  ]);

  expect(mockPersistFn).toHaveBeenCalled();

  // not time to cleanup
  expect(mockCleanupWithSubscription).not.toHaveBeenCalled();
  unmount();

  //cleanup
  mockCleanupWithSubscription.mock.calls[0][0]();

  done();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithSubscriptionsP = WithSubscriptions as ComponentType<Partial<{}>>;

function makeComp() {
  makeObservable(globals);

  return {
    ui: (
      <WithSubscriptionsP {...globals}>
        <div />
      </WithSubscriptionsP>
    ),
  };
}
