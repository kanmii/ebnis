import { readEntryFragment } from "@eb/shared/src/apollo/get-detailed-experience-query";
import { syncToServer } from "@eb/shared/src/apollo/sync-to-server";
import {
  purgeEntry,
  purgeExperiencesFromCache1,
} from "@eb/shared/src/apollo/update-get-experiences-list-view-query";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences } from "@eb/shared/src/graphql/apollo-types/OnExperiencesDeletedSubscription";
import { wrapReducer } from "@eb/shared/src/logger";
import { getUser } from "@eb/shared/src/utils/manage-user-auth";
import {
  Any,
  EbnisGlobals,
  EmitActionConnectionChangedPayload,
  OfflineIdToOnlineExperienceMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnSyncedData,
  StateValue,
} from "@eb/shared/src/utils/types";
import immer, { Draft } from "immer";
import { Dispatch, PropsWithChildren, Reducer } from "react";
import { deleteObjectKey } from "../../utils";
import { WithSubscriptionContextProps } from "../../utils/app-context";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import {
  ChangeUrlType,
  getLocation,
  windowChangeUrl,
} from "../../utils/global-window";
import { MY_URL } from "../../utils/urls";
import { subscribeToGraphqlEvents } from "./with-subscriptions.injectables";

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
            return (
              experience as OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences
            ).id;
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

export async function cleanUpOfflineExperiences(
  data: OfflineIdToOnlineExperienceMap,
) {
  purgeExperiencesFromCache1(Object.keys(data));
  const { persistor } = window.____ebnis;
  await persistor.persist();
}

export type CleanUpOfflineExperiencesFn = {
  cleanUpOfflineExperiencesFn: typeof cleanUpOfflineExperiences;
};

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
