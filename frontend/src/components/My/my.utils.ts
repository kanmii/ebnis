import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";
import fuzzysort from "fuzzysort";
import { RouteChildrenProps } from "react-router-dom";
import {
  StateValue,
  InActiveVal,
  ActiveVal,
  DeletedVal,
  CancelledVal,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import {
  putOrRemoveDeleteExperienceLedger,
  getDeleteExperienceLedger,
  DeletedExperienceLedgerDeleted,
  DeletedExperienceLedgerCancelled,
} from "../../apollo/delete-experience-cache";
import { purgeExperiencesFromCache1 } from "../../apollo/update-get-experiences-mini-query";
import {
  MyIndexDispatchType,
  ActionType as ParentActionType,
} from "./my-index.utils";
import { unstable_batchedUpdates } from "react-dom";

export enum ActionType {
  ACTIVATE_NEW_EXPERIENCE = "@my/activate-new-experience",
  DEACTIVATE_NEW_EXPERIENCE = "@my/deactivate-new-experience",
  TOGGLE_SHOW_DESCRIPTION = "@my/toggle-show-description",
  TOGGLE_SHOW_OPTIONS_MENU = "@my/toggle-show-options-menu",
  CLOSE_ALL_OPTIONS_MENU = "@my/close-all-options-menu",
  SEARCH = "@my/search",
  CLEAR_SEARCH = "@my/clear-search",
  CLOSE_DELETE_EXPERIENCE_NOTIFICATION = "@my/close-delete-experience-notification",
  DELETE_EXPERIENCE_REQUEST = "@my/delete-experience-request",
  ON_DELETE_EXPERIENCE_PROCESSED = "@my/on-delete-experience-processed",
}

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
              payload as WithExperienceIdPayload,
            );
            break;

          case ActionType.TOGGLE_SHOW_OPTIONS_MENU:
            handleToggleShowOptionsMenuAction(
              proxy,
              payload as WithExperienceIdPayload,
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

          case ActionType.CLOSE_DELETE_EXPERIENCE_NOTIFICATION:
            handleDeleteExperienceNotificationAction(proxy);
            break;

          case ActionType.DELETE_EXPERIENCE_REQUEST:
            handleDeleteExperienceRequestAction(
              proxy,
              payload as WithExperienceIdPayload,
            );
            break;

          case ActionType.ON_DELETE_EXPERIENCE_PROCESSED:
            handleOnDeleteExperienceProcessed(
              proxy,
              payload as OnDeleteExperienceProcessedPayload,
            );
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
    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "onDeleteExperienceProcessedEffect",
                ownArgs: {},
              },
            ],
          },
        },
      },
    },

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
      deletedExperience: {
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
  { id }: WithExperienceIdPayload,
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
  { id }: WithExperienceIdPayload,
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

function handleDeleteExperienceNotificationAction(proxy: DraftState) {
  proxy.states.deletedExperience.value = StateValue.inactive;
}

function handleDeleteExperienceRequestAction(
  proxy: DraftState,
  payload: WithExperienceIdPayload,
) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "deletedExperienceRequestEffect",
    ownArgs: {
      id: payload.id,
    },
  });
}

function handleOnDeleteExperienceProcessed(
  proxy: DraftState,
  payload: OnDeleteExperienceProcessedPayload,
) {
  const {
    states: { deletedExperience },
  } = proxy;

  const context = {
    context: {
      title: payload.title,
    },
  };

  switch (payload.key) {
    case StateValue.cancelled:
      {
        const state = deletedExperience as Draft<
          DeletedExperienceCancelledState
        >;

        state.value = StateValue.cancelled;
        state.cancelled = context;
      }
      break;

    case StateValue.deleted:
      {
        const state = deletedExperience as Draft<DeletedExperienceSuccessState>;

        state.value = StateValue.deleted;
        state.deleted = context;
      }
      break;
  }
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const deletedExperienceRequestEffect: DefDeleteExperienceRequestEffect["func"] = (
  { id },
  props,
) => {
  putOrRemoveDeleteExperienceLedger({
    key: StateValue.requested,
    id,
  });

  props.history.push(makeDetailedExperienceRoute(id));
};

type DefDeleteExperienceRequestEffect = EffectDefinition<
  "deletedExperienceRequestEffect",
  WithExperienceIdPayload
>;

const onDeleteExperienceProcessedEffect: DefOnDeleteExperienceProcessedEffect["func"] = async (
  _,
  props,
  { dispatch },
) => {
  const deletedExperience = getDeleteExperienceLedger();

  if (!deletedExperience) {
    return;
  }

  const { id } = deletedExperience;
  const { parentDispatch } = props;

  putOrRemoveDeleteExperienceLedger();

  switch (deletedExperience.key) {
    case StateValue.cancelled:
      dispatch({
        type: ActionType.ON_DELETE_EXPERIENCE_PROCESSED,
        ...deletedExperience,
      });

      break;

    case StateValue.deleted:
      /* eslint-disable-next-line no-lone-blocks*/
      {
        purgeExperiencesFromCache1([id]);
        const { persistor } = window.____ebnis;
        await persistor.persist();

        unstable_batchedUpdates(() => {
          parentDispatch({
            type: ParentActionType.DATA_RE_FETCH_REQUEST,
          });

          dispatch({
            type: ActionType.ON_DELETE_EXPERIENCE_PROCESSED,
            ...deletedExperience,
          });
        });
      }

      break;
  }
};

type DefOnDeleteExperienceProcessedEffect = EffectDefinition<
  "onDeleteExperienceProcessedEffect"
>;

export const effectFunctions = {
  deletedExperienceRequestEffect,
  onDeleteExperienceProcessedEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    context: {
      experiencesPrepared: ExperiencesSearchPrepared;
    };
    states: Readonly<{
      newExperienceActivated:
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          };
      experiences: ExperiencesMap;
      search: SearchState;
      deletedExperience: DeletedExperienceState;
    }>;
  }>;

export type DeletedExperienceState = Readonly<
  | {
      value: InActiveVal;
    }
  | DeletedExperienceCancelledState
  | DeletedExperienceSuccessState
>;

type DeletedExperienceSuccessState = Readonly<{
  value: DeletedVal;
  deleted: Readonly<{
    context: Readonly<{
      title: string;
    }>;
  }>;
}>;

type DeletedExperienceCancelledState = Readonly<{
  value: CancelledVal;
  cancelled: Readonly<{
    context: Readonly<{
      title: string;
    }>;
  }>;
}>;

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
    } & WithExperienceIdPayload)
  | ({
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU;
    } & WithExperienceIdPayload)
  | {
      type: ActionType.CLOSE_ALL_OPTIONS_MENU;
    }
  | {
      type: ActionType.CLEAR_SEARCH;
    }
  | ({
      type: ActionType.SEARCH;
    } & SetSearchTextPayload)
  | {
      type: ActionType.CLOSE_DELETE_EXPERIENCE_NOTIFICATION;
    }
  | ({
      type: ActionType.DELETE_EXPERIENCE_REQUEST;
    } & WithExperienceIdPayload)
  | ({
      type: ActionType.ON_DELETE_EXPERIENCE_PROCESSED;
    } & OnDeleteExperienceProcessedPayload);

type OnDeleteExperienceProcessedPayload =
  | DeletedExperienceLedgerDeleted
  | DeletedExperienceLedgerCancelled;

interface WithExperienceIdPayload {
  id: string;
}

interface SetSearchTextPayload {
  text: string;
}

export type DispatchType = Dispatch<Action>;

export interface MyChildDispatchProps {
  myDispatch: DispatchType;
}

export type CallerProps = RouteChildrenProps<
  {},
  {
    cancelledExperienceDelete: string;
  }
> & {
  parentDispatch: MyIndexDispatchType;
};

export type Props = CallerProps & {
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

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectType =
  | DefDeleteExperienceRequestEffect
  | DefOnDeleteExperienceProcessedEffect;

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;
