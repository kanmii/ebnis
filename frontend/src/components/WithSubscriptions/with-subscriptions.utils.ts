import { Reducer, Dispatch } from "react";
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
            proxy.states.connected = (payload as EmitActionConnectionChangedPayload).connected;
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
      connected: false,
    },
  };
}

function handleExperienceDeletedAction(
  proxy: DraftState,
  payload: ExperienceDeletedPayload,
) {
  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "onExperiencesDeletedEffect",
    ownArgs: payload.data,
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
  const data = ownArgs && ownArgs.onExperiencesDeleted;

  if (!data) {
    return;
  }

  const ids = data.experiences.map((experience) => {
    return (experience as OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences)
      .id;
  });

  purgeExperiencesFromCache1(ids);
  const { persistor } = window.____ebnis;
  await persistor.persist();

  if (getLocation().pathname.includes(MY_URL)) {
    windowChangeUrl(MY_URL, ChangeUrlType.replace);
  }
};

type DefOnExperiencesDeletedEffect = EffectDefinition<
  "onExperiencesDeletedEffect",
  OnExperiencesDeletedSubscription
>;

export const effectFunctions = {
  onExperiencesDeletedEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: Readonly<{
      connected: boolean;
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

export interface CallerProps {
  observable: Observable<EmitPayload>;
  bc: BChannel;
}

type DispatchType = Dispatch<Action>;

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, CallerProps, Key, OwnArgs>;

type EffectType = DefOnExperiencesDeletedEffect;
