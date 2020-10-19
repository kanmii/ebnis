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
  LoadingState,
  FETCH_EXPERIENCES_TIMEOUTS,
  BroadcastMessageType,
  OnlineStatus,
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
  ExperienceData,
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
import { makeScrollToDomId } from "./my.dom";
import {
  OfflineIdToOnlineExperienceMap,
  OnSyncedData,
} from "../../utils/sync-to-server.types";
import { broadcastMessage } from "../../utils/observable-manager";
import { cleanUpOfflineExperiences } from "../WithSubscriptions/with-subscriptions.utils";
import { getSyncErrors } from "../../apollo/sync-to-server-cache";
import { isOfflineId } from "../../utils/offlines";
import { getUnsyncedExperience } from "../../apollo/unsynced-ledger";

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
      const {
        data,
        deletedExperience,
        paginating,
        preparedExperiences,
      } = payload;
      const { experiences, pageInfo } = data;

      const state = {
        value: StateValue.data,
      } as Draft<DataState>;

      if (paginating) {
        const { context } = (proxy.states as Draft<DataState>).data;
        context.experiences = [...context.experiences, ...experiences];
        context.pageInfo = pageInfo;
        context.experiencesPrepared = [
          ...context.experiencesPrepared,
          ...preparedExperiences,
        ];
      } else {
        state.data = {
          context: {
            experiencesPrepared: preparedExperiences,
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
        };

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
    const {
      context: {
        pageInfo: { endCursor },
        experiences,
      },
    } = states.data;

    let previousLastId = nonsenseId;
    const len = experiences.length;

    if (len) {
      previousLastId = experiences[len - 1].experience.id;
    }

    const effects = getGeneralEffects(proxy);

    effects.push({
      key: "fetchExperiencesEffect",
      ownArgs: {
        paginationInput: {
          after: endCursor,
          first: EXPERIENCES_MINI_FETCH_COUNT,
        },
        previousLastId,
      },
    });
  }
}

function handleOnUpdateExperienceSuccessAction(
  proxy: DraftState,
  { experience: updatedExperience, onlineStatus }: WithExperiencePayload,
) {
  const { states, timeouts } = proxy;
  const { id, title } = updatedExperience;

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
            experience: updatedExperience,
          },
        },
      });

      for (let index = 0; index < experiences.length; index++) {
        const iter = experiences[index];
        const prevExperience = iter.experience;

        // istanbul ignore else:
        if (prevExperience.id === id) {
          experiences[index] = {
            ...iter,
            experience: updatedExperience,
            // TODO: Should we not compute new syncError
            syncError: undefined,
            onlineStatus: onlineStatus || iter.onlineStatus,
          };
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
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const offlineIdToOnlineExperienceMap =
      data.offlineIdToOnlineExperienceMap || {};

    const syncErrors = data.syncErrors || {};
    const onlineExperienceUpdatedMap = data.onlineExperienceUpdatedMap || {};

    const experiences = states.data.context.experiences;
    const len = experiences.length;

    for (let i = 0; i < len; i++) {
      const iter = experiences[i];
      const { id } = iter.experience;
      const newExperience = offlineIdToOnlineExperienceMap[id];
      const syncError = syncErrors[id];
      const isUpdated = onlineExperienceUpdatedMap[id];

      // offline experience synced, may have sync error
      if (newExperience) {
        iter.experience = newExperience;
        iter.syncError = syncError;
        iter.onlineStatus = syncError
          ? StateValue.partOffline
          : StateValue.online;
      } else if (syncError) {
        iter.syncError = syncError;
        iter.onlineStatus = StateValue.partOffline;
      } else if (isUpdated) {
        iter.onlineStatus = StateValue.online;
      }
    }

    if (
      data.offlineIdToOnlineExperienceMap &&
      Object.keys(offlineIdToOnlineExperienceMap).length
    ) {
      const effects = getGeneralEffects<EffectType, DraftState>(proxy);

      effects.push({
        key: "postSyncEffect",
        ownArgs: {
          data: offlineIdToOnlineExperienceMap,
        },
      });
    }
  }
}

////////////////////////// END STATE UPDATE SECTION //////////////////////

/////////////////// START STATE UPDATE HELPERS SECTION //////////////////

function prepareExperienceForSearch({ id, title }: ExperienceMiniFragment) {
  return {
    id,
    title,
    target: fuzzysort.prepare(title) as Fuzzysort.Prepared,
  };
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
  { paginationInput, previousLastId },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  let timeoutId: null | NodeJS.Timeout = null;
  let fetchExperiencesAttemptsCount = 0;
  const timeoutsLen = FETCH_EXPERIENCES_TIMEOUTS.length - 1;

  // bei seitennummerierung wurden wir zwischengespeicherte Erfahrungen nicht
  // gebraucht
  const zwischengespeicherteErgebnis = getExperiencesMiniQuery();

  const deletedExperience = await deleteExperienceProcessedEffectHelper(
    effectArgs,
  );

  if (paginationInput) {
    fetchExperiences();
    return;
  }

  if (zwischengespeicherteErgebnis) {
    const [experiences, preparedExperiences] = processGetExperiencesQuery(
      zwischengespeicherteErgebnis,
    );

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.data,
      data: experiences,
      preparedExperiences,
      deletedExperience,
    });

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

        const [ergebnisse, preparedExperiences] = processGetExperiencesQuery(
          sammelnErfahrungen,
          !!paginationInput,
          zwischengespeicherteErgebnis,
        );

        dispatch({
          type: ActionType.ON_DATA_RECEIVED,
          key: StateValue.data,
          data: ergebnisse,
          preparedExperiences,
          deletedExperience,
          paginating: !!paginationInput,
        });

        if (previousLastId) {
          scrollIntoView(previousLastId);
        }
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
    previousLastId?: string;
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

function processGetExperiencesQuery(
  { edges, pageInfo }: GetExperienceConnectionMini_getExperiences,
  preFetchEntries?: boolean,
  storeData?: GetExperienceConnectionMini_getExperiences | null,
): [ExperiencesData, PreparedExperience[]] {
  const previousEdges = ((storeData && storeData.edges) ||
    []) as GetExperienceConnectionMini_getExperiences_edges[];

  const newEdges = edges as GetExperienceConnectionMini_getExperiences_edges[];

  const allEdges = [...previousEdges, ...newEdges];

  const syncErrors = getSyncErrors();

  const preparedExperiences: PreparedExperience[] = [];

  const idToExperienceMap: {
    [experienceId: string]: ExperienceMiniFragment;
  } = {};

  const [experiences, erfahrungenIds] = newEdges.reduce(
    ([neuenErfahrungen, erfahrungenIds], edge) => {
      const experience = edge.node as ExperienceMiniFragment;
      const { id } = experience;
      const syncError = syncErrors[id];
      erfahrungenIds.push(id);
      idToExperienceMap[id] = experience;
      preparedExperiences.push(prepareExperienceForSearch(experience));

      neuenErfahrungen.push({
        experience,
        syncError,
        onlineStatus: getOnlineStatus(id),
      });

      return [neuenErfahrungen, erfahrungenIds];
    },
    [[], []] as [ExperienceData[], string[]],
  );

  if (preFetchEntries) {
    writeGetExperiencesMiniQuery({
      edges: allEdges,
      pageInfo,
    });
  }

  if (arguments.length > 1) {
    setTimeout(() => {
      handlePreFetchExperiences(erfahrungenIds, idToExperienceMap);
    });
  }

  const data = {
    experiences,
    pageInfo: pageInfo,
  };

  return [data, preparedExperiences];
}

function getOnlineStatus(id: string): OnlineStatus {
  const isOffline = isOfflineId(id);

  if (isOffline) {
    return StateValue.offline;
  }

  const hasUnsaved = getUnsyncedExperience(id);

  if (hasUnsaved) {
    return StateValue.partOffline;
  }

  return StateValue.online;
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
  data: OnSyncedData;
};

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

type WithExperiencePayload = {
  experience: ExperienceMiniFragment;
  onlineStatus?: OnlineStatus;
};

type UpsertExperiencePayload = {
  experience?: ExperienceMiniFragment;
};

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: ExperiencesData;
      preparedExperiences: PreparedExperience[];
      deletedExperience?: DeletedExperienceLedger;
      paginating?: boolean;
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

type PreparedExperience = {
  id: string;
  title: string;
  target: Fuzzysort.Prepared;
};
