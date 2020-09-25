/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, wait } from "@testing-library/react";
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
import {
  windowChangeUrl,
  getLocation,
  ChangeUrlType,
} from "../utils/global-window";
import { BroadcastMessageType } from "../utils/observable-manager";
import { MY_URL } from "../utils/urls";
import { onMessage } from "../components/WithSubscriptions/with-subscriptions.utils";

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
    cleanupObservableSubscription: jest.fn(),
    useOnExperiencesDeletedSubscription: jest.fn(),
  }),
);
const mockCleanupObservableSubscription = cleanupObservableSubscription as jest.Mock;
const mockUseOnExperiencesDeletedSubscription = useOnExperiencesDeletedSubscription as jest.Mock;

const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as any;

const globals = {
  persistor,
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = globals;
});

afterAll(() => {
  delete window.____ebnis;
});

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
  (globals.observable as any) = null;
  (globals.emitData as any) = null;
});

it("renders", async () => {
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

  mockGetLocation.mockReturnValueOnce({
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
  expect(mockCleanupObservableSubscription).not.toHaveBeenCalled();
  unmount();

  //cleanup
  expect(mockCleanupObservableSubscription).toHaveBeenCalled();
});

it("utils/on broadcast channel message", () => {
  mockGetLocation.mockReturnValueOnce({
    pathname: MY_URL,
  });

  onMessage({
    type: BroadcastMessageType.experienceDeleted,
    payload: {
      id: "a",
      title: "b",
    },
  });

  expect(mockWindowChangeUrl.mock.calls[0]).toEqual([
    MY_URL,
    ChangeUrlType.replace,
  ]);
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithSubscriptionsP = WithSubscriptions as ComponentType<Partial<{}>>;

function makeComp() {
  makeObservable(globals);
  makeBChannel(globals);

  return {
    ui: (
      <WithSubscriptionsP {...globals}>
        <div />
      </WithSubscriptionsP>
    ),
  };
}
