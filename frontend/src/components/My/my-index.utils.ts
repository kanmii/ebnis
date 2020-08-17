import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { GetExperienceConnectionMini } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { GetExperienceConnectionMini_getExperiences_edges } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { ApolloQueryResult, FetchPolicy } from "@apollo/client";
import { manuallyFetchExperienceConnectionMini } from "../../utils/experience.gql.types";
import {
  parseStringError,
  DATA_FETCHING_FAILED,
} from "../../utils/common-errors";
import {
  StateValue,
  LoadingVal,
  ErrorsVal,
  DataVal,
  HasEffectsVal,
  InitialVal,
} from "../../utils/types";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { getIsConnected } from "../../utils/connections";

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

type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states:
      | {
          value: LoadingVal;
        }
      | ErrorState
      | DataState;
  }>;

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

type Props = {};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type EffectsList = DefFetchExperiencesEffect[];

export interface EffectArgs {
  dispatch: MyIndexDispatchType;
}
export type MyIndexDispatchType = Dispatch<Action>;

////////////////////////// EFFECTS SECTION ////////////////////////////

let fetchExperiencesAttemptCount = 1;

const fetchExperiencesEffect: DefFetchExperiencesEffect["func"] = (
  _,
  __,
  { dispatch },
) => {
  let timeoutId: null | NodeJS.Timeout = null;
  fetchExperiencesAttemptCount = 1;

  function fetchExperiencesAfter() {
    const isConnected = getIsConnected();

    // we are connected
    if (isConnected) {
      fetchExperiences("cache-first");
      return;
    }

    // we are not connected
    if (isConnected === false) {
      fetchExperiences("cache-only");
      return;
    }

    // we are still trying to connect
    // isConnected === null
    if (fetchExperiencesAttemptCount > 3) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      });

      return;
    }

    ++fetchExperiencesAttemptCount;

    timeoutId = setTimeout(fetchExperiencesAfter, 5000);
  }

  async function fetchExperiences(fetchPolicy: FetchPolicy) {
    try {
      const data = await manuallyFetchExperienceConnectionMini(fetchPolicy);

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

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  fetchExperiencesAfter();
};

type DefFetchExperiencesEffect = EffectDefinition<
  "fetchExperiencesEffect",
  {
    initial?: InitialVal;
  }
>;

export const effectFunctions = {
  fetchExperiencesEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////////

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: ApolloQueryResult<GetExperienceConnectionMini>;
    }
  | {
      key: ErrorsVal;
      error: Error | string;
    };

type EffectType = DefFetchExperiencesEffect;
