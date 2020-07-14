import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { GetExperienceConnectionMini } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { GetExperienceConnectionMini_getExperiences_edges } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { ApolloQueryResult } from "apollo-client";
import { manuallyFetchExperienceConnectionMini } from "../../utils/experience.gql.types";
import { parseStringError } from "../../utils/common-errors";
import {
  StateValue,
  LoadingVal,
  NoEffectVal,
  ErrorsVal,
  DataVal,
  HasEffectsVal,
  InitialVal,
} from "../../utils/types";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";

export enum ActionType {
  ON_DATA_RECEIVED = "@my-index/on-data-received",
  DATA_RE_FETCH_REQUEST = "@my-index/data-re-fetch-request",
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
        }
      });
    },

    // true,
  );

function handleOnDataReceivedAction(
  proxy: DraftState,
  payload: OnDataReceivedPayload,
) {
  switch (payload.key) {
    case StateValue.data:
      {
        const { data, loading } = payload.data;

        if (loading) {
          proxy.states = {
            value: StateValue.loading,
          };
        } else {
          proxy.states = {
            value: StateValue.data,
            data: experienceNodesFromEdges(data),
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
}

async function handleDataReFetchRequestAction(proxy: DraftState) {
  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "fetchExperiencesEffect",
    ownArgs: {},
  });
}

export function experienceNodesFromEdges(data?: GetExperienceConnectionMini) {
  const d = data && data.getExperiences;

  return d
    ? (d.edges as GetExperienceConnectionMini_getExperiences_edges[]).map(
        (edge) => {
          return edge.node as ExperienceMiniFragment;
        },
      )
    : // istanbul ignore next:
      ([] as ExperienceMiniFragment[]);
}

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
                key: "fetchExperiencesEffect",
                ownArgs: {},
              },
            ],
          },
        },
      },
    },
  };
}

type DraftState = Draft<StateMachine>;

interface StateMachine {
  readonly states:
    | {
        value: LoadingVal;
      }
    | ErrorState
    | DataState;
  readonly effects: {
    readonly general: EffectState | { value: NoEffectVal };
  };
}

interface ErrorState {
  value: ErrorsVal;
  error: string;
}

interface DataState {
  value: DataVal;
  data: ExperienceMiniFragment[];
}

type Action =
  | ({
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.DATA_RE_FETCH_REQUEST;
    };

export interface EffectState {
  value: HasEffectsVal;
  hasEffects: {
    context: {
      effects: EffectsList;
    };
  };
}

interface EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> {
  key: Key;
  ownArgs: OwnArgs;
  func?: (
    ownArgs: OwnArgs,
    args: EffectArgs,
  ) => void | Promise<void | (() => void)> | (() => void);
}

type EffectsList = DefFetchExperiencesEffect[];

export interface EffectArgs {
  dispatch: MyIndexDispatchType;
}
export type MyIndexDispatchType = Dispatch<Action>;

type DefFetchExperiencesEffect = EffectDefinition<
  "fetchExperiencesEffect",
  {
    initial?: InitialVal;
  }
>;

const fetchExperiencesEffect: DefFetchExperiencesEffect["func"] = async (
  _,
  { dispatch },
) => {
  try {
    const data = await manuallyFetchExperienceConnectionMini("cache-first");

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

export const effectFunctions = {
  fetchExperiencesEffect,
};

function getGeneralEffects(proxy: DraftState) {
  const generalEffects = proxy.effects.general as EffectState;
  generalEffects.value = StateValue.hasEffects;
  let effects: EffectsList = [];

  // istanbul ignore next: trivial
  if (!generalEffects.hasEffects) {
    generalEffects.hasEffects = {
      context: {
        effects,
      },
    };
  } else {
    // istanbul ignore next: trivial
    effects = generalEffects.hasEffects.context.effects;
  }

  return effects;
}

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: ApolloQueryResult<GetExperienceConnectionMini>;
    }
  | {
      key: ErrorsVal;
      error: Error;
    };
