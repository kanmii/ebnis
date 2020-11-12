/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import {
  E2EWindowObject,
  BroadcastMessageType,
  BroadcastMessageExperienceDeleted,
  BroadcastMessageOnSyncData,
} from "../utils/types";
import {
  cleanupWithSubscriptions,
  useOnExperiencesDeletedSubscription,
} from "../components/WithSubscriptions/with-subscriptions.injectables";
import { WithSubscriptions } from "../components/WithSubscriptions/with-subscriptions.component";
import {
  makeBChannel,
  broadcastMessage,
} from "../utils/broadcast-channel-manager";
import { act } from "react-dom/test-utils";
import {
  windowChangeUrl,
  getLocation,
  ChangeUrlType,
} from "../utils/global-window";
import { MY_URL } from "../utils/urls";
import { syncToServer } from "../apollo/sync-to-server";
import { MAX_TIMEOUT_MS } from "../utils/timers";
import {
  purgeExperiencesFromCache1,
  purgeEntry,
} from "../apollo/update-get-experiences-mini-query";
import { clearNodeFolder } from "broadcast-channel";
import { readEntryFragment } from "../apollo/get-detailed-experience-query";
import { cleanUpOfflineExperiences } from "../components/WithSubscriptions/with-subscriptions.utils";
import { deleteObjectKey } from "../utils";

jest.mock("../apollo/update-get-experiences-mini-query");
const mockPurgeExperiencesFromCache1 = purgeExperiencesFromCache1 as jest.Mock;
const mockPurgeEntry = purgeEntry as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockReadEntryFragment = readEntryFragment as jest.Mock;

jest.mock("../apollo/sync-to-server");
const mockSyncToServer = syncToServer as jest.Mock;

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
  clearNodeFolder();
  makeBChannel(globals);
  window.____ebnis = globals;
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  const { bc } = globals;
  bc.close();
  deleteObjectKey(globals, "bc");
  deleteObjectKey(window, "____ebnis");
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.resetAllMocks();
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

  mockGetLocation.mockReturnValue({
    pathname: MY_URL,
  });

  expect(mockPersistFn).not.toHaveBeenCalled();

  const { ui } = makeComp();
  const { unmount } = render(ui);

  // There should be no network connection
  expect(mockWithEmitterProviderValue.connected).toBe(null);

  // And we should not be syncing data to backend (of course there is no network)
  expect(mockSyncToServer).not.toHaveBeenCalled();

  // When app is connected to network
  await act(async () => {
    broadcastMessage(
      {
        type: BroadcastMessageType.connectionChanged,
        payload: {
          connected: true,
        },
      },
      {
        selfOnly: true,
      },
    );
  });

  // App should indicate network connection
  expect(mockWithEmitterProviderValue.connected).toBe(true);

  // After a while that app is connected to network
  jest.runTimersToTime(MAX_TIMEOUT_MS);

  // App should start syncing data to backend
  expect(mockSyncToServer.mock.calls.length).toBe(1);

  // Deleted experiences should be purged from cache
  // (from useOnExperiencesDeletedSubscription)
  expect(mockPurgeExperiencesFromCache1).toHaveBeenCalledWith(["a"]);

  // Cached data should be persisted
  expect(mockPersistFn).toHaveBeenCalled();

  // And app should navigate to 'my_url' (after successful purge)
  expect(mockWindowChangeUrl.mock.calls[0]).toEqual([
    MY_URL,
    ChangeUrlType.replace,
  ]);

  // When connection is lost
  await act(async () => {
    broadcastMessage(
      {
        type: BroadcastMessageType.connectionChanged,
        payload: {
          connected: false,
        },
      },
      {
        selfOnly: true,
      },
    );
  });

  // App should indicate no network connection
  expect(mockWithEmitterProviderValue.connected).toBe(false);

  // App should not sync data
  expect(mockSyncToServer.mock.calls.length).toBe(1);

  // When app receives external broadcastMessage that experience deleted
  const messageExperienceDeleted = {
    type: BroadcastMessageType.experienceDeleted,
    payload: {
      id: "b",
      title: "c",
    },
  } as BroadcastMessageExperienceDeleted;

  await act(async () => {
    broadcastMessage(messageExperienceDeleted, { plusSelf: true });
  });

  // App should change URL in response to delete experience message
  expect(mockWindowChangeUrl.mock.calls[1]).toEqual([
    MY_URL,
    ChangeUrlType.replace,
  ]);

  // App should not set `onSyncData` context
  expect(mockWithEmitterProviderValue.onSyncData).toBeUndefined();

  // App should not have purged entries
  expect(mockPurgeEntry).not.toHaveBeenCalled();

  // When app receives broadcastMessage that data synced to backend
  mockReadEntryFragment.mockReturnValue("a");

  const synData = {
    onlineExperienceIdToOfflineEntriesMap: {
      a: {
        a: 1,
      },
    } as any,
  };

  const messageSyncData = {
    type: BroadcastMessageType.syncDone,
    payload: synData,
  } as BroadcastMessageOnSyncData;

  await act(async () => {
    broadcastMessage(messageSyncData, {
      selfOnly: true,
    });
  });

  // App should purge offline entries
  expect(mockPurgeEntry.mock.calls[0][0]).toBe("a");

  // App should set `onSyncData` context
  expect(mockWithEmitterProviderValue.onSyncData).toBe(synData);

  // not time to cleanup
  expect(mockCleanupWithSubscription).not.toHaveBeenCalled();
  unmount();

  //cleanup
  mockCleanupWithSubscription.mock.calls[0][0]();
});

it("cleans up offline experiences", async () => {
  expect(mockPurgeExperiencesFromCache1).not.toHaveBeenCalled();
  expect(mockPersistFn).not.toHaveBeenCalled();

  await cleanUpOfflineExperiences({ a: 1 } as any);

  expect(mockPurgeExperiencesFromCache1.mock.calls[0][0]).toEqual(["a"]);
  expect(mockPersistFn).toHaveBeenCalled();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithSubscriptionsP = WithSubscriptions as ComponentType<Partial<{}>>;

function makeComp() {
  return {
    ui: (
      <WithSubscriptionsP {...globals}>
        <div />
      </WithSubscriptionsP>
    ),
  };
}
