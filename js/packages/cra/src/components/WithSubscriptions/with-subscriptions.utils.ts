import { ChangeUrlType } from "@eb/shared/src/global-window";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences } from "@eb/shared/src/graphql/apollo-types/OnExperiencesDeletedSubscription";
import { wrapReducer } from "@eb/shared/src/logger";
import {
  Any,
  EbnisGlobals,
  EmitActionConnectionChangedPayload,
  OnlineExperienceIdToOfflineEntriesMap,
  OnSyncedData,
  StateValue,
} from "@eb/shared/src/utils/types";
import immer, { Draft } from "immer";
import { Dispatch, PropsWithChildren, Reducer } from "react";
import { deleteObjectKey } from "../../utils";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import { WithSubscriptionContextProps } from "../../utils/react-app-context";
import { MY_URL } from "../../utils/urls";

export enum ActionType {
  CONNECTION_CHANGED = "@with-subscription/connection-changed",
  ON_SUBSCRIBED_TO_GRAPHQL_EVENTS = "@with-subscription/on-subscribed-to-graphql-events",
  ON_SYNC = "@with-subscription/on-sync",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (proxy) => {
      proxy.effects.general.value = StateValue.noEffect;
      deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

      switch (type) {
        case ActionType.CONNECTION_CHANGED:
          handleConnectionChangedAction(
            proxy,
            payload as EmitActionConnectionChangedPayload,
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
  });

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(props: Props): StateMachine {
  const { useMsw } = props;

  return {
    id: "@with-subscription",
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    context: {
      connected: useMsw || null,
    },
  };
}

function handleOnSubscribeToGraphqlEvents(proxy: DraftState) {
  proxy.context.subscribedToGraphqlEvents = true;
}

function handleConnectionChangedAction(
  proxy: DraftState,
  payload: EmitActionConnectionChangedPayload,
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

  const { syncToServerInject } =
    window.____ebnis.withSubscriptionsComponentInjections;

  setTimeout(() => {
    syncToServerInject();
  }, 100);

  const { dispatch } = effectArgs;

  const {
    purgeExperiencesFromCacheInject,
    getUserInject,
    windowChangeUrlInject,
    getLocationInject,
    subscribeToGraphqlExperiencesDeletedEventInject,
  } = window.____ebnis.withSubscriptionsComponentInjections;

  if (!subscribedToGraphqlEvents && getUserInject()) {
    subscribeToGraphqlExperiencesDeletedEventInject().subscribe(
      async function onSubscriptionData(result) {
        const validResult =
          result && result.data && result.data.onExperiencesDeleted;

        // istanbul ignore else:
        if (validResult) {
          const ids = validResult.experiences.map((experience) => {
            return (
              experience as OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences
            ).id;
          });

          purgeExperiencesFromCacheInject(ids);
          const { persistor } = window.____ebnis;
          await persistor.persist();

          // istanbul ignore else:
          if (getLocationInject().pathname.includes(MY_URL)) {
            windowChangeUrlInject(MY_URL, ChangeUrlType.replace);
          }
        }
      },
      function onError() {
        //
      },
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

export async function cleanUpSyncedOfflineEntries(
  data: OnlineExperienceIdToOfflineEntriesMap,
) {
  const {
    persistor,
    withSubscriptionsComponentInjections: {
      purgeEntryInject,
      readEntryFragmentInject,
    },
  } = window.____ebnis;

  const toPurge = Object.values(data).flatMap((offlineIdToEntryMap) =>
    Object.keys(offlineIdToEntryMap),
  );

  toPurge.forEach((id) => {
    purgeEntryInject(readEntryFragmentInject(id) as EntryFragment);
  });

  persistor.persist();
}

export type CleanUpSyncedOfflineEntriesInjectType = {
  cleanUpSyncedOfflineEntriesInject: typeof cleanUpSyncedOfflineEntries;
};

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
    } & EmitActionConnectionChangedPayload)
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
  bcBroadcaster: EbnisGlobals["bcBroadcaster"];
  useMsw?: boolean | null;
  observable: EbnisGlobals["observable"];
}>;

export type Props = CallerProps;

export type DispatchType = Dispatch<Action>;

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Any,
> = GenericEffectDefinition<EffectArgs, CallerProps, Key, OwnArgs>;

export type EffectType = DefConnectionChangedEffect;
