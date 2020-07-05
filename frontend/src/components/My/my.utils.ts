import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";
import fuzzysort from "fuzzysort";
import { GetExperienceConnectionMini } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { GetExperienceConnectionMini_getExperiences_edges } from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { ApolloQueryResult } from "apollo-client";
import { manuallyFetchExperienceConnectionMini } from "../../utils/experience.gql.types";
import { parseStringError } from "../../utils/common-errors";

export enum ActionType {
  ACTIVATE_NEW_EXPERIENCE = "@my/activate-new-experience",
  DEACTIVATE_NEW_EXPERIENCE = "@my/deactivate-new-experience",
  TOGGLE_SHOW_DESCRIPTION = "@my/toggle-show-description",
  TOGGLE_SHOW_OPTIONS_MENU = "@my/toggle-show-options-menu",
  CLOSE_ALL_OPTIONS_MENU = "@my/close-all-options-menu",
  SEARCH = "@my/search",
  CLEAR_SEARCH = "@my/clear-search",
  ON_DATA_RECEIVED = "@my/on-data-received",
  ON_DATA_RE_FETCHED = "@my/on-data-reFetched",
}

export const StateValue = {
  inactive: "inactive" as InActiveVal,
  active: "active" as ActiveVal,
  error: "error" as ErrorVal,
  loading: "loading" as LoadingVal,
  data: "data" as DataVal,
  noEffect: "noEffect" as NoEffectVal,
  hasEffects: "hasEffects" as HasEffectsVal,
  initial: "initial" as InitialVal,
};

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        switch (type) {
          case ActionType.ACTIVATE_NEW_EXPERIENCE:
            handleActivateNewExperienceAction(proxy);
            break;

          case ActionType.DEACTIVATE_NEW_EXPERIENCE:
            handleDeactivateNewExperienceAction(proxy);
            break;

          case ActionType.TOGGLE_SHOW_DESCRIPTION:
            handleToggleShowDescriptionAction(
              proxy,
              payload as ToggleDescriptionPayload,
            );
            break;

          case ActionType.TOGGLE_SHOW_OPTIONS_MENU:
            handleToggleShowOptionsMenuAction(
              proxy,
              payload as ToggleDescriptionPayload,
            );
            break;

          case ActionType.CLOSE_ALL_OPTIONS_MENU:
            handleCloseAllOptionsMenuAction(proxy);
            break;

          case ActionType.SEARCH:
            handleSearchAction(proxy, payload as SetSearchTextPayload);
            break;

          case ActionType.CLEAR_SEARCH:
            handleClearSearchAction(proxy);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(props: Props): StateMachine {
  const { experiences } = props;

  return {
    context: {
      experiencesPrepared: prepareExperiencesForSearch(experiences),
    },

    states: {
      newExperienceActivated: {
        value: StateValue.inactive,
      },
      experiences: {},
      search: {
        value: StateValue.inactive,
      },
    },
  };
}

function prepareExperiencesForSearch(experiences: ExperienceMiniFragment[]) {
  return experiences.map(({ id, title }) => {
    return {
      id,
      title,
      target: fuzzysort.prepare(title) as Fuzzysort.Prepared,
    };
  });
}

function handleActivateNewExperienceAction(proxy: DraftState) {
  proxy.states.newExperienceActivated.value = StateValue.active;
}

function handleDeactivateNewExperienceAction(proxy: StateMachine) {
  proxy.states.newExperienceActivated.value = StateValue.inactive;
}

function handleToggleShowDescriptionAction(
  proxy: StateMachine,
  { id }: ToggleDescriptionPayload,
) {
  const {
    states: { experiences: experiencesState },
  } = proxy;

  const state = experiencesState[id] || ({} as ExperienceState);
  state.showingDescription = !state.showingDescription;
  state.showingOptionsMenu = false;
  experiencesState[id] = state;
}

function handleToggleShowOptionsMenuAction(
  proxy: StateMachine,
  { id }: ToggleDescriptionPayload,
) {
  const {
    states: { experiences: experiencesState },
  } = proxy;

  const state = experiencesState[id] || ({} as ExperienceState);
  state.showingOptionsMenu = !state.showingOptionsMenu;
  experiencesState[id] = state;
}

function handleCloseAllOptionsMenuAction(proxy: StateMachine) {
  const {
    states: { experiences: experiencesState },
  } = proxy;

  Object.values(experiencesState).forEach((state) => {
    state.showingOptionsMenu = false;
  });
}

function handleSearchAction(proxy: DraftState, payload: SetSearchTextPayload) {
  const { text } = payload;
  const {
    context: { experiencesPrepared },
    states: { search },
  } = proxy;

  const activeSearch = search as Draft<SearchActive>;
  activeSearch.value = StateValue.active;
  const active = activeSearch.active || makeDefaultSearchActive();

  const context = active.context;
  context.value = text;
  activeSearch.active = active;

  context.results = fuzzysort
    .go(text, experiencesPrepared, {
      key: "title",
    })
    .map((searchResult) => {
      const { obj } = searchResult;

      return {
        title: obj.title,
        id: obj.id,
      };
    });
}

export function makeDefaultSearchActive() {
  return {
    context: {
      value: "",
      results: [],
    },
  };
}

function handleClearSearchAction(proxy: DraftState) {
  const {
    states: { search },
  } = proxy;

  const state = search;

  if (search.value === StateValue.inactive) {
    return;
  } else {
    search.active = makeDefaultSearchActive();
    state.value = StateValue.inactive;
  }
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

type DraftState = Draft<StateMachine>;

export interface StateMachine {
  readonly context: {
    experiencesPrepared: ExperiencesSearchPrepared;
  };
  readonly states: {
    readonly newExperienceActivated:
      | {
          value: InActiveVal;
        }
      | {
          value: ActiveVal;
        };
    readonly experiences: ExperiencesMap;
    readonly search: SearchState;
  };
}

////////////////////////// STRINGY TYPES SECTION ///////////
type InActiveVal = "inactive";
type ActiveVal = "active";
type LoadingVal = "loading";
type ErrorVal = "error";
type DataVal = "data";
type HasEffectsVal = "hasEffects";
type NoEffectVal = "noEffect";
type InitialVal = "initial";
////////////////////////// END STRINGY TYPES SECTION /////////

export type SearchState =
  | {
      value: InActiveVal;
    }
  | SearchActive;

export interface SearchActive {
  readonly value: ActiveVal;
  readonly active: {
    readonly context: {
      readonly value: string;
      readonly results: MySearchResult[];
    };
  };
}

interface MySearchResult {
  title: string;
  id: string;
}

type Action =
  | {
      type: ActionType.ACTIVATE_NEW_EXPERIENCE;
    }
  | {
      type: ActionType.DEACTIVATE_NEW_EXPERIENCE;
    }
  | ({
      type: ActionType.TOGGLE_SHOW_DESCRIPTION;
    } & ToggleDescriptionPayload)
  | ({
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU;
    } & ToggleDescriptionPayload)
  | {
      type: ActionType.CLOSE_ALL_OPTIONS_MENU;
    }
  | {
      type: ActionType.CLEAR_SEARCH;
    }
  | ({
      type: ActionType.SEARCH;
    } & SetSearchTextPayload);

interface ToggleDescriptionPayload {
  id: string;
}

interface SetSearchTextPayload {
  text: string;
}

export type DispatchType = Dispatch<Action>;

export interface MyChildDispatchProps {
  myDispatch: DispatchType;
}

export type Props = {
  experiences: ExperienceMiniFragment[];
};

export interface ExperiencesMap {
  [experienceId: string]: ExperienceState;
}

export interface ExperienceState {
  showingDescription: boolean;
  showingOptionsMenu: boolean;
}

export type ExperiencesSearchPrepared = {
  target: Fuzzysort.Prepared;
  title: string;
  id: string;
}[];

////////////////////////// INDEX ////////////////////////////

export const indexReducer: Reducer<IndexStateMachine, IndexAction> = (
  state,
  action,
) =>
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

          case ActionType.ON_DATA_RE_FETCHED:
            handleOnDataReFetchedAction(proxy);
            break;
        }
      });
    },

    // true,
  );

function handleOnDataReceivedAction(
  proxy: IndexDraftState,
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

    case StateValue.error:
      proxy.states = {
        value: StateValue.error,
        error: parseStringError(payload.error),
      };

      break;
  }
}

async function handleOnDataReFetchedAction(proxy: IndexDraftState) {
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

export function initIndexState(): IndexStateMachine {
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

////////////////////////// END INDEX ////////////////////////////

type IndexDraftState = Draft<IndexStateMachine>;

interface IndexStateMachine {
  readonly states:
    | {
        value: LoadingVal;
      }
    | IndexErrorState
    | IndexDataState;
  readonly effects: {
    readonly general: EffectState | { value: NoEffectVal };
  };
}

interface IndexErrorState {
  value: ErrorVal;
  error: string;
}

interface IndexDataState {
  value: DataVal;
  data: ExperienceMiniFragment[];
}

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
  dispatch: Dispatch<IndexAction>;
}

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
      key: StateValue.error,
      error,
    });
  }
};

export const effectFunctions = {
  fetchExperiencesEffect,
};

function getGeneralEffects(proxy: IndexDraftState) {
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

type IndexAction =
  | ({
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.ON_DATA_RE_FETCHED;
    };

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: ApolloQueryResult<GetExperienceConnectionMini>;
    }
  | {
      key: ErrorVal;
      error: Error;
    };
