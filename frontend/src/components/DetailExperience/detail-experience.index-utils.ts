import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { manuallyFetchDetailedExperience } from "../../utils/experience.gql.types";
import {
  parseStringError,
  GENERIC_SERVER_ERROR,
} from "../../utils/common-errors";
import {
  StateValue,
  LoadingVal,
  ErrorsVal,
  DataVal,
  InitialVal,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { entriesPaginationVariables } from "../../graphql/entry.gql";
import { IndexProps, Match } from "./detail-experience.utils";
import { DetailedExperienceQueryResult } from "../../utils/experience.gql.types";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { ApolloError } from "@apollo/client";

export enum ActionType {
  ON_DATA_RECEIVED = "@detailed-experience/on-data-received",
  DATA_RE_FETCH_REQUEST = "@detailed-experience/data-re-fetch-request",
  SET_TIMEOUT = "@detailed-experience/set-timeout",
  CLEAR_TIMEOUT = "@detailed-experience/clear-timeout",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        delete proxy.effects.general[StateValue.hasEffects];

        switch (type) {
          case ActionType.ON_DATA_RECEIVED:
            handleOnDataReceivedAction(proxy, payload as OnDataReceivedPayload);
            break;

          case ActionType.DATA_RE_FETCH_REQUEST:
            handleDataReFetchRequestAction(proxy);
            break;

          case ActionType.SET_TIMEOUT:
            handleSetTimeoutAction(proxy, payload as SetTimeoutPayload);
            break;

          case ActionType.CLEAR_TIMEOUT:
            handleClearTimoutAction(proxy, payload as ClearTimeoutPayload);
            break;
        }
      });
    },

    // true,
  );
////////////////////////// STATE UPDATE ////////////////////////////

export function initState(): StateMachine {
  return {
    states: {
      value: StateValue.loading,
    },

    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "fetchDetailedExperienceEffect",
                ownArgs: {},
              },
            ],
          },
        },
      },
    },

    timeouts: {},
  };
}

function handleOnDataReceivedAction(
  proxy: DraftState,
  payload: OnDataReceivedPayload,
) {
  const { timeouts } = proxy;

  switch (payload.key) {
    case StateValue.data:
      {
        const { data, loading, error } = payload.data;

        if (data) {
          const experience = data.getExperience;

          if (experience) {
            proxy.states = {
              value: StateValue.data,
              data: experience,
            };
          } else {
            proxy.states = {
              value: StateValue.errors,
              error: GENERIC_SERVER_ERROR,
            };
          }
        } else if (loading) {
          proxy.states = {
            value: StateValue.loading,
          };
        } else {
          proxy.states = {
            value: StateValue.errors,
            error: parseStringError(error as ApolloError),
          };
        }
      }
      break;

    case StateValue.errors:
      proxy.states = {
        value: StateValue.errors,
        error: parseStringError(payload.error),
      };
      break;
  }

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "clearTimeoutEffect",
    ownArgs: {
      timeoutId: timeouts.fetchExperience,
    },
  });
}

async function handleDataReFetchRequestAction(proxy: DraftState) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleSetTimeoutAction(proxy: DraftState, payload: SetTimeoutPayload) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key] = val;
  });
}

function handleClearTimoutAction(
  proxy: DraftState,
  payload: ClearTimeoutPayload,
) {
  const { key, timedOut } = payload;
  const { timeouts } = proxy;

  switch (key) {
    case "fetchExperience":
      timeouts.fetchExperience = undefined;

      if (timedOut) {
        proxy.states = {
          value: StateValue.errors,
          error: GENERIC_SERVER_ERROR,
        };
      }
      break;
  }
}

function getExperienceId(props: IndexProps) {
  return (props.match as Match).params.experienceId;
}

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////////////// TYPES //////////////////////////////

type DraftState = Draft<StateMachine>;

type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: LoadingState | ErrorState | DataState;
    timeouts: Timeouts;
  }>;

type Timeouts = Readonly<{
  fetchExperience?: NodeJS.Timeout;
}>;

type LoadingState = Readonly<{
  value: LoadingVal;
}>;

type ErrorState = Readonly<{
  value: ErrorsVal;
  error: string;
}>;

type DataState = Readonly<{
  value: DataVal;
  data: ExperienceFragment;
}>;

type Action =
  | ({
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.DATA_RE_FETCH_REQUEST;
    }
  | ({
      type: ActionType.SET_TIMEOUT;
    } & SetTimeoutPayload)
  | ({
      type: ActionType.CLEAR_TIMEOUT;
    } & ClearTimeoutPayload);

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

type ClearTimeoutPayload = {
  key: keyof Timeouts;
  timedOut?: true;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, IndexProps, Key, OwnArgs>;

type EffectsList = DefFetchDetailedExperienceEffect | DefClearTimeoutEffect;

export interface EffectArgs {
  dispatch: CompleteExperienceIndexDispatchType;
}
export type CompleteExperienceIndexDispatchType = Dispatch<Action>;

const fetchDetailedExperienceEffect: DefFetchDetailedExperienceEffect["func"] = async (
  _,
  props,
  { dispatch },
) => {
  try {
    const experienceId = getExperienceId(props);
    const timeout = 15 * 1000;

    const timeoutId = setTimeout(() => {
      dispatch({
        type: ActionType.CLEAR_TIMEOUT,
        key: "fetchExperience",
        timedOut: true,
      });
    }, timeout);

    dispatch({
      type: ActionType.SET_TIMEOUT,
      fetchExperience: timeoutId,
    });

    const data = await manuallyFetchDetailedExperience({
      id: experienceId,
      entriesPagination: entriesPaginationVariables.entriesPagination,
    });

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.data,
      data,
    });
  } catch (error) {
    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.errors,
      error,
    });
  }
};

type DefFetchDetailedExperienceEffect = EffectDefinition<
  "fetchDetailedExperienceEffect",
  {
    initial?: InitialVal;
  }
>;

const clearTimeoutEffect: DefClearTimeoutEffect["func"] = (ownArgs) => {
  clearTimeout(ownArgs.timeoutId);
};

type DefClearTimeoutEffect = EffectDefinition<
  "clearTimeoutEffect",
  {
    timeoutId: NodeJS.Timeout;
  }
>;

export const effectFunctions = {
  fetchDetailedExperienceEffect,
  clearTimeoutEffect,
};

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: DetailedExperienceQueryResult;
    }
  | {
      key: ErrorsVal;
      error: Error;
    };

type EffectType = DefFetchDetailedExperienceEffect;
