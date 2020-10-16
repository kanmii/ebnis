import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";
import fuzzysort from "fuzzysort";
import { RouteChildrenProps } from "react-router-dom";
import {
  StateValue,
  Timeouts,
  InActiveVal,
  ActiveVal,
  DeletedVal,
  CancelledVal,
  DataVal,
  ErrorsVal,
  LoadingVal,
  InitialVal,
  LoadingState,
  FETCH_EXPERIENCES_TIMEOUTS,
  BroadcastMessageType,
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
  DeletedExperienceLedger,
} from "../../apollo/delete-experience-cache";
import {
  purgeExperiencesFromCache1,
  writeGetExperiencesMiniQuery,
} from "../../apollo/update-get-experiences-mini-query";
import { getIsConnected } from "../../utils/connections";
import {
  DATA_FETCHING_FAILED,
  parseStringError,
} from "../../utils/common-errors";
import {
  manuallyFetchExperienceConnectionMini,
  EXPERIENCES_MINI_FETCH_COUNT,
  ExperiencesData,
} from "../../utils/experience.gql.types";
import {
  GetExperienceConnectionMini_getExperiences,
  GetExperienceConnectionMini_getExperiences_edges,
  GetExperienceConnectionMiniVariables,
} from "../../graphql/apollo-types/GetExperienceConnectionMini";
import { getExperiencesMiniQuery } from "../../apollo/get-experiences-mini-query";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { nonsenseId } from "../../utils/utils.dom";
import { handlePreFetchExperiences } from "./my.injectables";
import {
  ExperienceConnectionFragment_edges,
  ExperienceConnectionFragment_edges_node,
} from "../../graphql/apollo-types/ExperienceConnectionFragment";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { makeScrollToDomId } from "./my.dom";
import { OfflineIdToOnlineExperienceMap } from "../../utils/sync-flag.types";
import { broadcastMessage } from "../../utils/observable-manager";
import { cleanUpOfflineExperiences } from "../WithSubscriptions/with-subscriptions.utils";

export enum ActionType {
  ACTIVATE_UPSERT_EXPERIENCE = "@my/activate-upsert-experience",
  CANCEL_UPSERT_EXPERIENCE = "@my/deactivate-upsert-experience",
  ON_UPDATE_EXPERIENCE_SUCCESS = "@my/on-update-experience-success",
  TOGGLE_SHOW_DESCRIPTION = "@my/toggle-show-description",
  TOGGLE_SHOW_OPTIONS_MENU = "@my/toggle-show-options-menu",
  CLOSE_ALL_OPTIONS_MENU = "@my/close-all-options-menu",
  SEARCH = "@my/search",
  CLEAR_SEARCH = "@my/clear-search",
  CLOSE_DELETE_EXPERIENCE_NOTIFICATION = "@my/close-delete-experience-notification",
  DELETE_EXPERIENCE_REQUEST = "@my/delete-experience-request",
  ON_DATA_RECEIVED = "@my/on-data-received",
  DATA_RE_FETCH_REQUEST = "@my/data-re-fetch-request",
  FETCH_NEXT_EXPERIENCES_PAGE = "@my/fetch-next=experiences-page",
  SET_TIMEOUT = "@my/set-timeout",
  ON_SYNC = "@my/on-sync",
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
          case ActionType.ACTIVATE_UPSERT_EXPERIENCE:
            handleActivateUpsertExperienceAction(
              proxy,
              payload as UpsertExperiencePayload,
            );
            break;

          case ActionType.CANCEL_UPSERT_EXPERIENCE:
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

          case ActionType.ON_DATA_RECEIVED:
            handleOnDataReceivedAction(proxy, payload as OnDataReceivedPayload);
            break;

          case ActionType.DATA_RE_FETCH_REQUEST:
            handleDataReFetchRequestAction(proxy);
            break;

          case ActionType.FETCH_NEXT_EXPERIENCES_PAGE:
            handleFetchPrevNextExperiencesPageAction(proxy);
            break;

          case ActionType.ON_UPDATE_EXPERIENCE_SUCCESS:
            handleOnUpdateExperienceSuccessAction(
              proxy,
              payload as WithExperiencePayload,
            );
            break;

          case ActionType.SET_TIMEOUT:
            handleSetTimeoutAction(proxy, payload as SetTimeoutPayload);
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
    timeouts: {},
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

    states: {
      value: StateValue.loading,
    },
  };
}

function handleActivateUpsertExperienceAction(
  proxy: DraftState,
  payload: UpsertExperiencePayload,
) {
  const { states } = proxy;
  const { experience } = payload;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const upsertExperienceActivated = states.data.states
      .upsertExperienceActivated as Draft<UpsertExperienceActiveState>;

    upsertExperienceActivated.value = StateValue.active;

    upsertExperienceActivated.active = {
      context: {
        experience,
      },
    };
  }
}

function handleDeactivateNewExperienceAction(proxy: StateMachine) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const upsertExperienceActivated = states.data.states
      .upsertExperienceActivated as Draft<
      DataState["data"]["states"]["upsertExperienceActivated"]
    >;

    upsertExperienceActivated.value = StateValue.inactive;
  }
}

function handleToggleShowDescriptionAction(
  proxy: StateMachine,
  { id }: WithExperienceIdPayload,
) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { experiences: experiencesState },
    } = states.data;

    const state = experiencesState[id] || ({} as ExperienceState);
    state.showingDescription = !state.showingDescription;
    state.showingOptionsMenu = false;
    experiencesState[id] = state;
  }
}

function handleToggleShowOptionsMenuAction(
  proxy: StateMachine,
  { id }: WithExperienceIdPayload,
) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { experiences: experiencesState },
    } = states.data;

    const state = experiencesState[id] || ({} as ExperienceState);
    state.showingOptionsMenu = !state.showingOptionsMenu;
    experiencesState[id] = state;
  }
}

function handleCloseAllOptionsMenuAction(proxy: StateMachine) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { experiences: experiencesState },
    } = states.data;

    Object.values(experiencesState).forEach((state) => {
      state.showingOptionsMenu = false;
    });
  }
}

function handleSearchAction(proxy: DraftState, payload: SetSearchTextPayload) {
  const { states } = proxy;
  const { text } = payload;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { search },
      context: { experiencesPrepared },
    } = states.data;

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
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const search = states.data.states.search;
    const state = search;

    if (search.value === StateValue.inactive) {
      return;
    } else {
      search.active = makeDefaultSearchActive();
      state.value = StateValue.inactive;
    }
  }
}

function handleDeleteExperienceNotificationAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    states.data.states.deletedExperience.value = StateValue.inactive;
  }
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

function handleOnDataReceivedAction(
  proxy: DraftState,
  payload: OnDataReceivedPayload,
) {
  switch (payload.key) {
    case StateValue.data:
      {
        const { data, deletedExperience } = payload;
        const { experiences, pageInfo } = data;

        const state = {
          value: StateValue.data,
          data: {
            context: {
              experiencesPrepared: prepareExperiencesForSearch(experiences),
              experiences,
              pageInfo,
            },

            states: {
              upsertExperienceActivated: {
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
          },
        } as DataState;

        proxy.states = state;

        handleOnDeleteExperienceProcessedHelper(state, deletedExperience);
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

function handleFetchPrevNextExperiencesPageAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const { endCursor } = states.data.context.pageInfo;

    const effects = getGeneralEffects(proxy);

    effects.push({
      key: "fetchExperiencesEffect",
      ownArgs: {
        paginationInput: {
          after: endCursor,
          first: EXPERIENCES_MINI_FETCH_COUNT,
        },
      },
    });
  }
}

function handleOnUpdateExperienceSuccessAction(
  proxy: DraftState,
  { experience }: WithExperiencePayload,
) {
  const { states, timeouts } = proxy;
  const { id, title } = experience;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { experiences: experiencesState, upsertExperienceActivated },
      context,
    } = states.data;

    const upsertExperienceUiInactive = upsertExperienceActivated;

    if (upsertExperienceActivated.value === StateValue.active) {
      upsertExperienceUiInactive.value = StateValue.inactive;
    }

    const state = experiencesState[id] || ({} as ExperienceState);
    const showingUpdateSuccess = state.showingUpdateSuccess;
    state.showingUpdateSuccess = !showingUpdateSuccess;
    experiencesState[id] = state;

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    if (showingUpdateSuccess) {
      effects.push({
        key: "timeoutsEffect",
        ownArgs: {
          clear: timeouts.genericTimeout,
        },
      });

      delete timeouts.genericTimeout;
      return;
    } else {
      const { experiences, experiencesPrepared } = context;

      effects.push({
        key: "timeoutsEffect",
        ownArgs: {
          set: {
            key: "set-close-upsert-experience-success-notification",
            experience,
          },
        },
      });

      for (let index = 0; index < experiences.length; index++) {
        const iterExperience = experiences[index];

        // istanbul ignore else:
        if (iterExperience.id === id) {
          experiences[index] = experience;
          const prepared = experiencesPrepared[index];
          prepared.title = title;
          prepared.target = fuzzysort.prepare(title) as Fuzzysort.Prepared;

          effects.push({
            key: "scrollToViewEffect",
            ownArgs: {
              id: makeScrollToDomId(id),
            },
          });

          break;
        }
      }
    }
  }
}

function handleSetTimeoutAction(proxy: DraftState, payload: SetTimeoutPayload) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key] = val;
  });
}

function handleOnDeleteExperienceProcessedHelper(
  proxy: DataState,
  deletedExperience?: DeletedExperienceLedger,
) {
  if (!deletedExperience) {
    return;
  }

  const deletedExperienceState = proxy.data.states.deletedExperience;

  switch (deletedExperience.key) {
    case StateValue.cancelled:
      {
        const state = deletedExperienceState as Draft<
          DeletedExperienceCancelledState
        >;

        state.value = StateValue.cancelled;
        state.cancelled = {
          context: {
            title: deletedExperience.title,
          },
        };
      }
      break;

    case StateValue.deleted:
      {
        const state = deletedExperienceState as Draft<
          DeletedExperienceSuccessState
        >;

        state.value = StateValue.deleted;
        state.deleted = {
          context: {
            title: deletedExperience.title,
          },
        };
      }
      break;
  }
}

function handleOnSyncAction(proxy: DraftState, { data }: OnSycPayload) {
  // istanbul ignore else
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const experiences = states.data.context.experiences;
    const len = experiences.length;
    const toPurge: string[] = [];
    const toSkip: [string, null][] = [];

    for (let i = 0; i < len; i++) {
      const { id } = experiences[i];
      const newExperience = data[id];
      if (newExperience) {
        experiences[i] = newExperience;
        toPurge.push(id);
        toSkip.push([id, null]);
      }
    }

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    effects.push({
      key: "postSyncEffect",
      ownArgs: {
        data,
      },
    });
  }
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

/////////////////// START STATE UPDATE HELPERS SECTION //////////////////

function prepareExperiencesForSearch(experiences: ExperienceMiniFragment[]) {
  return experiences.map(({ id, title }) => {
    return {
      id,
      title,
      target: fuzzysort.prepare(title) as Fuzzysort.Prepared,
    };
  });
}

/////////////////// END STATE UPDATE HELPERS SECTION //////////////////

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

const fetchExperiencesEffect: DefFetchExperiencesEffect["func"] = async (
  { paginationInput },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  let timeoutId: null | NodeJS.Timeout = null;
  let fetchExperiencesAttemptsCount = 0;
  const timeoutsLen = FETCH_EXPERIENCES_TIMEOUTS.length - 1;

  const deletedExperience = await deleteExperienceProcessedEffectHelper(
    effectArgs,
  );

  // bei seitennummerierung wurden wir zwischengespeicherte Erfahrungen nicht
  // gebraucht
  const zwischengespeicherteErgebnis = getExperiencesMiniQuery();

  // für folgenden Situation:
  // Kein Paginierung und:
  //    Netzwerk = false
  //    Netzwerk = true und gibt es zwischengespeicherte Daten
  if (!paginationInput && zwischengespeicherteErgebnis) {
    verarbeitenZwischengespeichertetErfahrungen(
      dispatch,
      zwischengespeicherteErgebnis,
      deletedExperience,
    );
    return;
  }

  function fetchExperiencesAfter() {
    // we are connected
    if (getIsConnected()) {
      fetchExperiences();
      return;
    }

    // we are still trying to connect and have tried enough times
    // isConnected === null
    if (fetchExperiencesAttemptsCount > timeoutsLen) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      });

      return;
    }

    timeoutId = setTimeout(
      fetchExperiencesAfter,
      FETCH_EXPERIENCES_TIMEOUTS[fetchExperiencesAttemptsCount++],
    );
  }

  async function fetchExperiences() {
    try {
      const abfrageDaten = await manuallyFetchExperienceConnectionMini(
        "network-only",
        paginationInput || {
          first: EXPERIENCES_MINI_FETCH_COUNT,
        },
      );

      const { data, error } = abfrageDaten;
      if (error) {
        dispatch({
          type: ActionType.ON_DATA_RECEIVED,
          key: StateValue.errors,
          error,
        });
      } else {
        const sammelnErfahrungen = (data &&
          data.getExperiences) as GetExperienceConnectionMini_getExperiences;

        const [
          ergebnisse,
          blätterZuId,
          erfahrungenIds,
        ] = appendNewToGetExperiencesQuery(
          !!paginationInput,
          sammelnErfahrungen,
          zwischengespeicherteErgebnis,
        );

        dispatch({
          type: ActionType.ON_DATA_RECEIVED,
          key: StateValue.data,
          data: ergebnisse,
          deletedExperience,
        });

        if (paginationInput) {
          scrollIntoView(blätterZuId);
        }

        const idToExperienceMap = (sammelnErfahrungen.edges as ExperienceConnectionFragment_edges[]).reduce(
          (acc, e) => {
            const edge = e as ExperienceConnectionFragment_edges;
            const node = edge.node as ExperienceConnectionFragment_edges_node;
            acc[node.id] = node;
            return acc;
          },
          {} as { [experienceId: string]: ExperienceFragment },
        );

        setTimeout(() => {
          handlePreFetchExperiences(erfahrungenIds, idToExperienceMap);
        });
      }
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
    paginationInput?: GetExperienceConnectionMiniVariables;
    initial?: InitialVal;
  }
>;

const scrollToViewEffect: DefScrollToViewEffect["func"] = ({ id }) => {
  scrollIntoView(id);
};

type DefScrollToViewEffect = EffectDefinition<
  "scrollToViewEffect",
  {
    id: string;
  }
>;

const timeoutsEffect: DefTimeoutsEffect["func"] = (
  { set, clear },
  __,
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  if (clear) {
    clearTimeout(clear);
  }

  if (set) {
    const timeout = 10 * 1000;
    let timeoutCb = (undefined as unknown) as () => void;

    switch (set.key) {
      case "set-close-upsert-experience-success-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.ON_UPDATE_EXPERIENCE_SUCCESS,
            experience: set.experience,
          });
        };

        break;
    }

    const timeoutId = setTimeout(timeoutCb, timeout);

    dispatch({
      type: ActionType.SET_TIMEOUT,
      genericTimeout: timeoutId,
    });
  }
};

type DefTimeoutsEffect = EffectDefinition<
  "timeoutsEffect",
  {
    set?: {
      key: "set-close-upsert-experience-success-notification";
    } & WithExperiencePayload;
    clear?: NodeJS.Timeout;
  }
>;

const postSyncEffect: DefPostSyncEffect["func"] = ({ data }) => {
  cleanUpOfflineExperiences(data);
};

type DefPostSyncEffect = EffectDefinition<
  "postSyncEffect",
  {
    data: OfflineIdToOnlineExperienceMap;
  }
>;

export const effectFunctions = {
  deletedExperienceRequestEffect,
  fetchExperiencesEffect,
  scrollToViewEffect,
  timeoutsEffect,
  postSyncEffect,
};

async function deleteExperienceProcessedEffectHelper({ dispatch }: EffectArgs) {
  const deletedExperience = getDeleteExperienceLedger();

  if (!deletedExperience) {
    return;
  }

  putOrRemoveDeleteExperienceLedger();

  // istanbul ignore else
  if (deletedExperience.key === StateValue.deleted) {
    const { id } = deletedExperience;
    purgeExperiencesFromCache1([id]);
    const { persistor, cache } = window.____ebnis;
    cache.evict({ id });
    await persistor.persist();

    broadcastMessage({
      type: BroadcastMessageType.experienceDeleted,
      payload: {
        id,
        title: deletedExperience.title,
      },
    });
  }

  return deletedExperience;
}

function appendNewToGetExperiencesQuery(
  istPaginierung: boolean,
  { edges, pageInfo }: GetExperienceConnectionMini_getExperiences,
  storeData?: GetExperienceConnectionMini_getExperiences | null,
): [ExperiencesData, string, string[]] {
  const previousEdges = ((storeData && storeData.edges) ||
    []) as GetExperienceConnectionMini_getExperiences_edges[];

  const newEdges = edges as GetExperienceConnectionMini_getExperiences_edges[];

  const allEdges = [...previousEdges, ...newEdges];

  if (istPaginierung) {
    writeGetExperiencesMiniQuery({
      edges: allEdges,
      pageInfo,
    });
  }

  const [neuenErfahrungen, erfahrungenIds] = newEdges.reduce(
    ([neuenErfahrungen, erfahrungenIds], edge) => {
      const node = edge.node as ExperienceMiniFragment;
      neuenErfahrungen.push(node);
      erfahrungenIds.push(node.id);

      return [neuenErfahrungen, erfahrungenIds];
    },
    [[], []] as [ExperienceMiniFragment[], string[]],
  );

  const zuletztErfahrüngen = previousEdges.map(
    (edge) => edge.node as ExperienceMiniFragment,
  );

  const zuletztErfahrüngenLänge = zuletztErfahrüngen.length;

  return [
    {
      experiences: zuletztErfahrüngen.concat(neuenErfahrungen),
      pageInfo: pageInfo,
    },
    zuletztErfahrüngenLänge === 0
      ? (neuenErfahrungen[0] || ({ id: nonsenseId } as ExperienceMiniFragment))
          .id
      : zuletztErfahrüngen[zuletztErfahrüngenLänge - 1].id,
    erfahrungenIds,
  ];
}

function verarbeitenZwischengespeichertetErfahrungen(
  dispatch: DispatchType,
  daten: GetExperienceConnectionMini_getExperiences,
  deletedExperience?: DeletedExperienceLedger,
) {
  const experiences = (daten.edges as GetExperienceConnectionMini_getExperiences_edges[]).map(
    (e) => e.node as ExperienceMiniFragment,
  );

  dispatch({
    type: ActionType.ON_DATA_RECEIVED,
    key: StateValue.data,
    data: {
      experiences,
      pageInfo: daten.pageInfo,
    },
    deletedExperience,
  });
}

////////////////////////// END EFFECTS SECTION ////////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: LoadingState | ErrorState | DataState;
    timeouts: Readonly<Timeouts>;
  }>;

type ErrorState = Readonly<{
  value: ErrorsVal;
  error: string;
}>;

export type DataState = Readonly<{
  value: DataVal;
  data: {
    context: DataStateContext;
    states: Readonly<{
      upsertExperienceActivated:
        | Readonly<{
            value: InActiveVal;
          }>
        | UpsertExperienceActiveState;
      experiences: ExperiencesMap;
      search: SearchState;
      deletedExperience: DeletedExperienceState;
    }>;
  };
}>;

type UpsertExperienceActiveState = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<UpsertExperiencePayload>;
  }>;
}>;

type DataStateContext = ExperiencesData &
  Readonly<{
    experiencesPrepared: ExperiencesSearchPrepared;
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
  | ({
      type: ActionType.ACTIVATE_UPSERT_EXPERIENCE;
    } & UpsertExperiencePayload)
  | {
      type: ActionType.CANCEL_UPSERT_EXPERIENCE;
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
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.DATA_RE_FETCH_REQUEST;
    }
  | {
      type: ActionType.FETCH_NEXT_EXPERIENCES_PAGE;
    }
  | ({
      type: ActionType.ON_UPDATE_EXPERIENCE_SUCCESS;
    } & WithExperiencePayload)
  | ({
      type: ActionType.SET_TIMEOUT;
    } & SetTimeoutPayload)
  | ({
      type: ActionType.ON_SYNC;
    } & OnSycPayload);

type OnSycPayload = {
  data: OfflineIdToOnlineExperienceMap;
};

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

type WithExperiencePayload = {
  experience: ExperienceMiniFragment;
};

type UpsertExperiencePayload = {
  experience?: ExperienceMiniFragment;
};

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: ExperiencesData;
      deletedExperience?: DeletedExperienceLedger;
    }
  | {
      key: ErrorsVal;
      error: Error | string;
    }
  | {
      key: LoadingVal;
    };

interface WithExperienceIdPayload {
  id: string;
}

interface SetSearchTextPayload {
  text: string;
}

export type DispatchType = Dispatch<Action>;

export type CallerProps = RouteChildrenProps<
  {},
  {
    cancelledExperienceDelete: string;
  }
>;

export type Props = CallerProps;

export interface ExperiencesMap {
  [experienceId: string]: ExperienceState;
}

export interface ExperienceState {
  showingDescription: boolean;
  showingOptionsMenu: boolean;
  showingUpdateSuccess?: boolean;
}

export type ExperiencesSearchPrepared = {
  target: Fuzzysort.Prepared;
  title: string;
  id: string;
}[];

export interface EffectArgs {
  dispatch: DispatchType;
}

export type EffectType =
  | DefDeleteExperienceRequestEffect
  | DefFetchExperiencesEffect
  | DefScrollToViewEffect
  | DefTimeoutsEffect
  | DefPostSyncEffect;

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;
