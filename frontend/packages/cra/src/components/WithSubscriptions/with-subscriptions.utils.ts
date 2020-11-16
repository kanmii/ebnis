import { Reducer, Dispatch, PropsWithChildren } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { StateValue } from "../../utils/types";
import {
  BChannel,
  BroadcastMessageConnectionChangedPayload,
} from "../../utils/types";
import { MY_URL } from "../../utils/urls";
import {
  getLocation,
  windowChangeUrl,
  ChangeUrlType,
} from "../../utils/global-window";
import { OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences } from "@ebnis/commons/src/graphql/apollo-types/OnExperiencesDeletedSubscription";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import {
  purgeExperiencesFromCache1,
  purgeEntry,
} from "../../apollo/update-get-experiences-mini-query";
import { syncToServer } from "../../apollo/sync-to-server";
import {
  OnSyncedData,
  OfflineIdToOnlineExperienceMap,
  OnlineExperienceIdToOfflineEntriesMap,
} from "../../utils/sync-to-server.types";
import { WithSubscriptionContextProps } from "../../utils/app-context";
import { readEntryFragment } from "../../apollo/get-detailed-experience-query";
import { EntryFragment } from "@ebnis/commons/src/graphql/apollo-types/EntryFragment";
import { deleteObjectKey } from "../../utils";
import { subscribeToGraphqlEvents } from "./with-subscriptions.injectables";
import { getUser } from "../../utils/manage-user-auth";

export enum ActionType {
  CONNECTION_CHANGED = "@with-subscription/connection-changed",
  ON_SUBSCRIBED_TO_GRAPHQL_EVENTS = "@with-subscription/on-subscribed-to-graphql-events",
  ON_SYNC = "@with-subscription/on-sync",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

        switch (type) {
          case ActionType.CONNECTION_CHANGED:
            handleConnectionChangedAction(
              proxy,
              payload as BroadcastMessageConnectionChangedPayload,
            );
            break;

          case ActionType.ON_SUBSCRIBED_TO_GRAPHQL_EVENTS:
            handleOnSubscribeToGraphqlEvents(proxy);
            break;

          case ActionType.ON_SYNC:
            handleOnSyncAction(proxy, payload as OnSycPayload);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(): StateMachine {
  return {
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    context: {
      connected: null,
    },
  };
}

function handleOnSubscribeToGraphqlEvents(proxy: DraftState) {
  proxy.context.subscribedToGraphqlEvents = true;
}

function handleConnectionChangedAction(
  proxy: DraftState,
  payload: BroadcastMessageConnectionChangedPayload,
) {
  const { connected } = payload;
  const { context } = proxy;
  context.connected = connected;

  const effects = getGeneralEffects<EffectType, DraftState>(proxy);
  effects.push({
    key: "connectionChangedEffect",
    ownArgs: context,
  });
}

function handleOnSyncAction(proxy: DraftState, { data }: OnSycPayload) {
  proxy.context.onSyncData = data;
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const connectionChangedEffect: DefConnectionChangedEffect["func"] = (
  { connected, subscribedToGraphqlEvents },
  _,
  effectArgs,
) => {
  if (!connected) {
    return;
  }

  setTimeout(() => {
    syncToServer();
  }, 100);

  const { dispatch } = effectArgs;

  if (!subscribedToGraphqlEvents && getUser()) {
    subscribeToGraphqlEvents().subscribe(
      async function OnSuccess(result) {
        const data = result && result.data && result.data.onExperiencesDeleted;

        // istanbul ignore else:
        if (data) {
          const ids = data.experiences.map((experience) => {
            return (experience as OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences)
              .id;
          });

          purgeExperiencesFromCache1(ids);
          const { persistor } = window.____ebnis;
          await persistor.persist();

          // istanbul ignore else:
          if (getLocation().pathname.includes(MY_URL)) {
            windowChangeUrl(MY_URL, ChangeUrlType.replace);
          }
        }
      },
      function onError() {},
    );

    dispatch({
      type: ActionType.ON_SUBSCRIBED_TO_GRAPHQL_EVENTS,
    });
  }
};

type DefConnectionChangedEffect = EffectDefinition<
  "connectionChangedEffect",
  Context
>;

export const effectFunctions = {
  connectionChangedEffect,
};

export async function cleanUpOfflineExperiences(
  data: OfflineIdToOnlineExperienceMap,
) {
  purgeExperiencesFromCache1(Object.keys(data));
  const { persistor } = window.____ebnis;
  await persistor.persist();
}

export async function cleanUpSyncedOfflineEntries(
  data: OnlineExperienceIdToOfflineEntriesMap,
) {
  const { persistor } = window.____ebnis;

  const toPurge = Object.values(data).flatMap((offlineIdToEntryMap) =>
    Object.keys(offlineIdToEntryMap),
  );

  toPurge.forEach((id) => {
    purgeEntry(readEntryFragment(id) as EntryFragment);
  });

  persistor.persist();
}

////////////////////////// END EFFECTS SECTION ////////////////////////////

type DraftState = Draft<StateMachine>;

type Context = WithSubscriptionContextProps & {
  subscribedToGraphqlEvents?: true;
};

export type StateMachine = GenericGeneralEffect<EffectType> & {
  context: Context;
};

type Action =
  | ({
      type: ActionType.CONNECTION_CHANGED;
    } & BroadcastMessageConnectionChangedPayload)
  | {
      type: ActionType.ON_SUBSCRIBED_TO_GRAPHQL_EVENTS;
    }
  | ({
      type: ActionType.ON_SYNC;
    } & OnSycPayload);

export type OnSycPayload = {
  data?: OnSyncedData;
};

export type CallerProps = PropsWithChildren<{
  bc: BChannel;
}>;

export type Props = CallerProps;

export type DispatchType = Dispatch<Action>;

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, CallerProps, Key, OwnArgs>;

export type EffectType = DefConnectionChangedEffect;
