/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  broadcastMessage,
  makeBChannel,
} from "@eb/shared/src/broadcast-channel-manager";
import { ChangeUrlType } from "@eb/shared/src/global-window";
import { WithSubscriptionsComponentInjections } from "@eb/shared/src/injections";
import { makeObservable } from "@eb/shared/src/observable-manager";
import {
  Any,
  BroadcastMessageExperienceDeleted,
  BroadcastMessageOnSyncData,
  BroadcastMessageType,
  EbnisGlobals,
  EmitActionType,
} from "@eb/shared/src/utils/types";
import { cleanup, render } from "@testing-library/react";
// import { clearNodeFolder } from "broadcast-channel";
import React, { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { WithSubscriptions } from "../components/WithSubscriptions/with-subscriptions.component";
import { cleanupWithSubscriptions } from "../components/WithSubscriptions/with-subscriptions.injectables";
import {
  ActionType,
  effectFunctions,
  EffectType,
  initState,
  reducer,
} from "../components/WithSubscriptions/with-subscriptions.utils";
import { deleteObjectKey } from "../utils";
import { GenericHasEffect } from "../utils/effects";
import { MAX_TIMEOUT_MS } from "../utils/timers";
import { MY_URL } from "../utils/urls";

const mockGetUser = jest.fn();
const mockPurgeExperiencesFromCache1 = jest.fn();
const mockPurgeEntry = jest.fn();
const mockReadEntryFragment = jest.fn();
const mockSyncToServer = jest.fn();
const mockWindowChangeUrl = jest.fn();
const mockGetLocation = jest.fn();
const mockSubscribeToGraphqlExperiencesDeletedEvent = jest.fn();

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
      WithSubscriptionsDispatchProvider: ({ children }: any) => {
        return children;
      },
    };
  },
);
const mockCleanupWithSubscription = cleanupWithSubscriptions as jest.Mock;
const mockSubscribeToGraphqlEventsSubscribe = jest.fn();

const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as any;

const withSubscriptionsComponentInjections: WithSubscriptionsComponentInjections =
  {
    purgeEntryInject: mockPurgeEntry,
    purgeExperiencesFromCacheInject: mockPurgeExperiencesFromCache1,
    getUserInject: mockGetUser,
    readEntryFragmentInject: mockReadEntryFragment,
    syncToServerInject: mockSyncToServer,
    windowChangeUrlInject: mockWindowChangeUrl,
    getLocationInject: mockGetLocation,
    subscribeToGraphqlExperiencesDeletedEventInject:
      mockSubscribeToGraphqlExperiencesDeletedEvent,
  };

const ebnisObject = {
  persistor,
} as EbnisGlobals;

const mockDispatch = jest.fn();

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

beforeEach(() => {
  ebnisObject.withSubscriptionsComponentInjections =
    withSubscriptionsComponentInjections;

  mockSubscribeToGraphqlExperiencesDeletedEvent.mockReturnValue({
    subscribe: mockSubscribeToGraphqlEventsSubscribe,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("component", () => {
  beforeAll(() => {
    makeBChannel(ebnisObject);
    makeObservable(ebnisObject);
    window.____ebnis = ebnisObject;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    const { bcBroadcaster } = ebnisObject;
    bcBroadcaster.close();
    deleteObjectKey(ebnisObject, "bcBroadcaster");
    deleteObjectKey(ebnisObject, "emitter");
    deleteObjectKey(ebnisObject, "observable");
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
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
    act(() => {
      ebnisObject.emitData({
        type: EmitActionType.connectionChanged,
        connected: true,
      });
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
    act(() => {
      ebnisObject.emitData({
        type: EmitActionType.connectionChanged,
        connected: false,
      });
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
      id: "b",
      title: "c",
    } as BroadcastMessageExperienceDeleted;

    broadcastMessage(messageExperienceDeleted, { plusSelf: true });

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
      ...synData,
    } as BroadcastMessageOnSyncData;

    act(() => {
      broadcastMessage(messageSyncData, {
        plusSelf: true,
      });
    });

    // App should purge offline entries
    expect(mockPurgeEntry.mock.calls[0][0]).toBe("a");

    // App should set `onSyncData` context
    expect(mockWithEmitterProviderValue.onSyncData).toEqual(synData);

    // not time to cleanup
    expect(mockCleanupWithSubscription).not.toHaveBeenCalled();
    unmount();

    //cleanup
    mockCleanupWithSubscription.mock.calls[0][0]();
  });
});

describe("reducer", () => {
  const effectArgs = {
    dispatch: mockDispatch,
  } as any;

  const props = {} as any;

  it("subscribes to graphql events only once", () => {
    // Giver user is logged
    mockGetUser.mockReturnValue({});

    let state = initState(props);

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

    let state = initState({
      ...props,
      useMsw: true,
    });

    // When there is connection
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // We should subscribe to graphql events
    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    expect(mockSubscribeToGraphqlEventsSubscribe).not.toHaveBeenCalled();
  });

  it("calls error function when graphql subscription errors", () => {
    // Giver user is logged
    mockGetUser.mockReturnValue({});

    let state = initState(props);

    // When there is connection
    state = reducer(state, {
      type: ActionType.CONNECTION_CHANGED,
      connected: true,
    });

    // We should subscribe to graphql events
    const effect = (state.effects.general as GenericHasEffect<EffectType>)
      .hasEffects.context.effects[0];

    const connectionChangedEffect = effectFunctions[effect.key];

    connectionChangedEffect(effect.ownArgs, props, effectArgs);
    const onError = mockSubscribeToGraphqlEventsSubscribe.mock.calls[0][1];
    expect(onError()).toBeUndefined();
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const WithSubscriptionsP = WithSubscriptions as ComponentType<Partial<Any>>;

function makeComp() {
  return {
    ui: (
      <WithSubscriptionsP {...ebnisObject}>
        <div />
      </WithSubscriptionsP>
    ),
  };
}
