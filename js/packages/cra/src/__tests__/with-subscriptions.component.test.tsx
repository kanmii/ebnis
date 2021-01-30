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
  subscribeToGraphqlEvents,
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
} from "../apollo/update-get-experiences-list-view-query";
import { clearNodeFolder } from "broadcast-channel";
import { readEntryFragment } from "../apollo/get-detailed-experience-query";
import { cleanUpOfflineExperiences } from "../components/WithSubscriptions/with-subscriptions.utils";
import { deleteObjectKey } from "../utils";
import { getUser } from "../utils/manage-user-auth";
import {
  initState,
  reducer,
  effectFunctions,
  ActionType,
  EffectType,
} from "../components/WithSubscriptions/with-subscriptions.utils";
import { GenericHasEffect } from "../utils/effects";

jest.mock("../utils/manage-user-auth");
const mockGetUser = getUser as jest.Mock;

jest.mock("../apollo/update-get-experiences-list-view-query");
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
  () => {
    return {
      WithSubscriptionProvider: ({ children, value }: any) => {
        mockWithEmitterProviderValue = value;

        return children;
      },
      cleanupWithSubscriptions: jest.fn(),
      subscribeToGraphqlEvents: jest.fn(),
      WithSubscriptionsDispatchProvider: ({ children }: any) => {
        return children;
      },
    };
  },
);
const mockCleanupWithSubscription = cleanupWithSubscriptions as jest.Mock;
const mockSubscribeToGraphqlEvents = subscribeToGraphqlEvents as jest.Mock;
const mockSubscribeToGraphqlEventsSubscribe = jest.fn();

const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as any;

const globals = {
  persistor,
} as E2EWindowObject;

const mockDispatch = jest.fn();

beforeAll(() => {
  clearNodeFolder();
  makeBChannel(globals);
  window.____ebnis = globals;
});

beforeEach(() => {
  jest.useFakeTimers();

  mockSubscribeToGraphqlEvents.mockReturnValue({
    subscribe: mockSubscribeToGraphqlEventsSubscribe,
  });
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

it("renders/ does not subscribe when no network", async () => {
  mockGetUser.mockReturnValue({});

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

  // We should not be subscribed to graphql events
  expect(mockSubscribeToGraphqlEventsSubscribe).not.toHaveBeenCalled();

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

  // We should be subscribed to graphql events
  const subscribeToGraphqlEventsCb =
    mockSubscribeToGraphqlEventsSubscribe.mock.calls[0][0];

  await subscribeToGraphqlEventsCb({
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

  // Deleted experiences should be purged from cache
  // (from mockSubscribeToGraphqlEventsSubscribe)
  expect(mockPurgeExperiencesFromCache1).toHaveBeenCalledWith(["a"]);

  // Cached data should be persisted
  expect(mockPersistFn).toHaveBeenCalled();

  // And app should navigate to 'my_url' (after successful purge)
  expect(mockWindowChangeUrl.mock.calls[0]).toEqual([
    MY_URL,
    ChangeUrlType.replace,
  ]);

  // After a while that app is connected to network
  jest.runTimersToTime(MAX_TIMEOUT_MS);

  // App should start syncing data to backend
  expect(mockSyncToServer.mock.calls.length).toBe(1);

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

  // App should not subscribe to graphql events again
  expect(mockSubscribeToGraphqlEventsSubscribe.mock.calls.length).toBe(1);

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

describe("reducer", () => {
  const effectArgs = {
    dispatch: mockDispatch,
  } as any;

  const props = {} as any;

  it("subscribes to graphql events only once", () => {
    // Giver user is logged
    mockGetUser.mockReturnValue({});

    let state = initState();

    // When there is connection
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // We should subscribe to graphql events
    let effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    let connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    expect(mockSubscribeToGraphqlEventsSubscribe.mock.calls.length).toBe(1);
    const args = mockDispatch.mock.calls[0][0];
    state = reducer(state, args);

    // When there is connection again
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // And we attempt to subscribe again
    effect = (state.effects.general as GenericHasEffect<EffectType>).hasEffects
      .context.effects[0];

    connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    // It should not be possible
    expect(mockSubscribeToGraphqlEventsSubscribe.mock.calls.length).toBe(1);
  });

  it("does not subscribe when there is no user", () => {
    // Giver user is logged
    mockGetUser.mockReturnValue(undefined);

    let state = initState();

    // When there is connection
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // We should subscribe to graphql events
    let effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    let connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    expect(mockSubscribeToGraphqlEventsSubscribe).not.toHaveBeenCalled();
  });

  it("calls error function when graphql subscription errors", () => {
    // Giver user is logged
    mockGetUser.mockReturnValue({});

    let state = initState();

    // When there is connection
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // We should subscribe to graphql events
    let effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    let connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    const onError = mockSubscribeToGraphqlEventsSubscribe.mock.calls[0][1];
    expect(onError()).toBeUndefined();
  });
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
