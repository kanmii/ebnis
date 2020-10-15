import { Reducer, Dispatch, PropsWithChildren } from "react";
import { Observable } from "zen-observable-ts";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { StateValue } from "../../utils/types";
import {
  EmitPayload,
  BChannel,
  EmitActionConnectionChangedPayload,
  BroadcastMessage,
} from "../../utils/types";
import { MY_URL } from "../../utils/urls";
import {
  getLocation,
  windowChangeUrl,
  ChangeUrlType,
} from "../../utils/global-window";
import { BroadcastMessageType } from "../../utils/observable-manager";
import {
  OnExperiencesDeletedSubscription,
  OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences,
} from "../../graphql/apollo-types/OnExperiencesDeletedSubscription";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { purgeExperiencesFromCache1 } from "../../apollo/update-get-experiences-mini-query";
import { syncToServer } from "../../apollo/sync-to-server";
import { putSyncFlag } from "../../apollo/sync-flag";
import { SyncFlag } from "../../utils/sync-flag.types";

export enum ActionType {
  CONNECTION_CHANGED = "@with-subscription/connection-changed",
  EXPERIENCE_DELETED = "@with-subscription/experience-deleted",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        switch (type) {
          case ActionType.CONNECTION_CHANGED:
            handleConnectionChangedAction(
              proxy,
              payload as EmitActionConnectionChangedPayload,
            );
            break;

          case ActionType.EXPERIENCE_DELETED:
            handleExperienceDeletedAction(
              proxy,
              payload as ExperienceDeletedPayload,
            );
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
    states: {
      connected: null,
    },
  };
}

function handleExperienceDeletedAction(
  proxy: DraftState,
  payload: ExperienceDeletedPayload,
) {
  const { data } = payload;

  if (data) {
    const effects = getGeneralEffects<EffectType, DraftState>(proxy);
    effects.push({
      key: "onExperiencesDeletedEffect",
      ownArgs: data,
    });
  }
}

function handleConnectionChangedAction(
  proxy: DraftState,
  payload: EmitActionConnectionChangedPayload,
) {
  const { connected } = payload;
  proxy.states.connected = connected;

  const effects = getGeneralEffects<EffectType, DraftState>(proxy);
  effects.push({
    key: "syncToServerEffect",
    ownArgs: {
      connected,
    },
  });
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

export function onMessage({ type, payload }: BroadcastMessage) {
  switch (type) {
    case BroadcastMessageType.experienceDeleted:
      // istanbul ignore else:
      if (getLocation().pathname.includes(MY_URL)) {
        windowChangeUrl(MY_URL, ChangeUrlType.replace);
      }
      break;
  }
}

const onExperiencesDeletedEffect: DefOnExperiencesDeletedEffect["func"] = async (
  ownArgs,
) => {
  const data = ownArgs.onExperiencesDeleted;

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
};

type DefOnExperiencesDeletedEffect = EffectDefinition<
  "onExperiencesDeletedEffect",
  OnExperiencesDeletedSubscription
>;

const syncToServerEffect: DefSyncToServerEffect["func"] = ({ connected }) => {
  if (!connected) {
    putSyncFlag({ canSync: false } as SyncFlag);
    return;
  }

  putSyncFlag({ canSync: true } as SyncFlag);
  syncToServer();
};

type DefSyncToServerEffect = EffectDefinition<
  "syncToServerEffect",
  {
    connected: boolean;
  }
>;

export const effectFunctions = {
  onExperiencesDeletedEffect,
  syncToServerEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: Readonly<{
      connected: boolean | null;
    }>;
  }>;

type Action =
  | ({
      type: ActionType.CONNECTION_CHANGED;
    } & EmitActionConnectionChangedPayload)
  | ({
      type: ActionType.EXPERIENCE_DELETED;
    } & ExperienceDeletedPayload);

interface ExperienceDeletedPayload {
  data?: OnExperiencesDeletedSubscription;
}

export type CallerProps = PropsWithChildren<{
  observable: Observable<EmitPayload>;
  bc: BChannel;
}>;

export type Props = CallerProps;

type DispatchType = Dispatch<Action>;

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, CallerProps, Key, OwnArgs>;

type EffectType = DefOnExperiencesDeletedEffect | DefSyncToServerEffect;
