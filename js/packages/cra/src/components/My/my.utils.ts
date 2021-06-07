import { getCachedExperiencesConnectionListView } from "@eb/shared/src/apollo/cached-experiences-list-view";
import {
  DeletedExperienceLedger,
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "@eb/shared/src/apollo/delete-experience-cache";
import {
  ExperienceData,
  ExperiencesData,
  EXPERIENCES_MINI_FETCH_COUNT,
  getExperienceConnectionListView,
} from "@eb/shared/src/apollo/experience.gql.types";
import { getSyncErrors } from "@eb/shared/src/apollo/sync-to-server-cache";
import {
  getOnlineStatus,
  getUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import {
  purgeExperiencesFromCache1,
  writeGetExperiencesMiniQuery,
} from "@eb/shared/src/apollo/update-get-experiences-list-view-query";
import { broadcastMessage } from "@eb/shared/src/broadcast-channel-manager";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import {
  GetExperiencesConnectionListViewVariables,
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences_edges,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
import { wrapReducer } from "@eb/shared/src/logger";
import { deleteObjectKey } from "@eb/shared/src/utils";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import {
  ActiveVal,
  Any,
  BroadcastMessageType,
  CancelledVal,
  DataVal,
  DeletedVal,
  ErrorsVal,
  InActiveVal,
  KeyOfTimeouts,
  LoadingState,
  LoadingVal,
  OfflineIdToOnlineExperienceMap,
  OnlineStatus,
  OnSyncedData,
  StateValue,
  Timeouts,
} from "@eb/shared/src/utils/types";
import fuzzysort from "fuzzysort";
import immer from "immer";
import { Dispatch, Reducer } from "react";
import { RouteChildrenProps } from "react-router-dom";
import {
  DATA_FETCHING_FAILED,
  parseStringError,
} from "../../utils/common-errors";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { FETCH_EXPERIENCES_TIMEOUTS } from "../../utils/timers";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { nonsenseId } from "../../utils/utils.dom";
import { cleanUpOfflineExperiences } from "../WithSubscriptions/with-subscriptions.utils";
import { makeScrollToDomId } from "./my.dom";
import { handlePreFetchExperiences } from "./my.injectables";

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
  RECORD_TIMEOUT = "@my/record-timeout",
  ON_SYNC = "@my/on-sync",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        deleteObjectKey<Any>(proxy.effects.general, StateValue.hasEffects);
        const state = proxy as StateMachine;

        switch (type) {
          case ActionType.ACTIVATE_UPSERT_EXPERIENCE:
            handleActivateUpsertExperienceAction(
              state,
              payload as UpsertExperiencePayload,
            );
            break;

          case ActionType.CANCEL_UPSERT_EXPERIENCE:
            handleDeactivateNewExperienceAction(state);
            break;

          case ActionType.TOGGLE_SHOW_DESCRIPTION:
            handleToggleShowDescriptionAction(
              state,
              payload as WithExperienceIdPayload,
            );
            break;

          case ActionType.TOGGLE_SHOW_OPTIONS_MENU:
            handleToggleShowOptionsMenuAction(
              state,
              payload as WithExperienceIdPayload,
            );
            break;

          case ActionType.CLOSE_ALL_OPTIONS_MENU:
            handleCloseAllOptionsMenuAction(state);
            break;

          case ActionType.SEARCH:
            handleSearchAction(state, payload as SetSearchTextPayload);
            break;

          case ActionType.CLEAR_SEARCH:
            handleClearSearchAction(state);
            break;

          case ActionType.CLOSE_DELETE_EXPERIENCE_NOTIFICATION:
            handleDeleteExperienceNotificationAction(state);
            break;

          case ActionType.DELETE_EXPERIENCE_REQUEST:
            handleDeleteExperienceRequestAction(
              state,
              payload as WithExperienceIdPayload,
            );
            break;

          case ActionType.ON_DATA_RECEIVED:
            handleOnDataReceivedAction(state, payload as OnDataReceivedPayload);
            break;

          case ActionType.DATA_RE_FETCH_REQUEST:
            handleDataReFetchRequestAction(state);
            break;

          case ActionType.FETCH_NEXT_EXPERIENCES_PAGE:
            handleFetchPrevNextExperiencesPageAction(state);
            break;

          case ActionType.ON_UPDATE_EXPERIENCE_SUCCESS:
            handleOnUpdateExperienceSuccessAction(
              state,
              payload as WithExperiencePayload,
            );
            break;

          case ActionType.RECORD_TIMEOUT:
            handleRecordTimeoutAction(state, payload as SetTimeoutPayload);
            break;

          case ActionType.ON_SYNC:
            handleOnSyncAction(state, payload as OnSycPayload);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(): StateMachine {
  return {
    id: "@my",
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
  proxy: StateMachine,
  payload: UpsertExperiencePayload,
) {
  const { states } = proxy;
  const { experience } = payload;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const upsertExperienceActivated = states.data.states
      .upsertExperienceActivated as UpsertExperienceActiveState;

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
      .upsertExperienceActivated as DataState["data"]["states"]["upsertExperienceActivated"];

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

    Object.values(experiencesState).forEach((state) => {
      state.showingOptionsMenu = false;
    });

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

function handleSearchAction(
  proxy: StateMachine,
  payload: SetSearchTextPayload,
) {
  const { states } = proxy;
  const { text } = payload;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const {
      states: { search },
      context: { experiencesPrepared },
    } = states.data;

    const activeSearch = search as SearchActive;
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

function handleClearSearchAction(proxy: StateMachine) {
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

function handleDeleteExperienceNotificationAction(proxy: StateMachine) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    states.data.states.deletedExperience.value = StateValue.inactive;
  }
}

function handleDeleteExperienceRequestAction(
  proxy: StateMachine,
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
  proxy: StateMachine,
  payload: OnDataReceivedPayload,
) {
  switch (payload.key) {
    case StateValue.data:
      {
        const { data, deletedExperience, paginating, preparedExperiences } =
          payload;
        const { experiences, pageInfo } = data;

        const state = {
          value: StateValue.data,
        } as DataState;

        if (paginating) {
          const { context } = (proxy.states as DataState).data;
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

async function handleDataReFetchRequestAction(proxy: StateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchExperiencesEffect",
    ownArgs: {},
  });
}

function handleFetchPrevNextExperiencesPageAction(proxy: StateMachine) {
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

    // istanbul ignore else:
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
  proxy: StateMachine,
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

    const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

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

      const len = experiences.length;
      let updatedExperienceData = undefined as unknown as ExperienceData;
      const newExperiences: ExperienceData[] = [updatedExperienceData];
      context.experiences = newExperiences;

      for (let index = 0; index < len; index++) {
        const iter = experiences[index];
        const prevExperience = iter.experience;

        // istanbul ignore else:
        if (!updatedExperienceData && prevExperience.id === id) {
          updatedExperienceData = {
            ...iter,
            experience: updatedExperience,
            // TODO: Should we not compute new syncError
            syncError: undefined,
            onlineStatus: onlineStatus || iter.onlineStatus,
          };

          newExperiences[0] = updatedExperienceData;

          const prepared = experiencesPrepared[index];
          prepared.title = title;
          prepared.target = fuzzysort.prepare(title) as Fuzzysort.Prepared;

          effects.push({
            key: "scrollToViewEffect",
            ownArgs: {
              id: makeScrollToDomId(id),
            },
          });
        } else {
          newExperiences.push(iter);
        }
      }
    }
  }
}

function handleRecordTimeoutAction(
  proxy: StateMachine,
  payload: SetTimeoutPayload,
) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key as KeyOfTimeouts] = val;
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
        const state = deletedExperienceState as DeletedExperienceCancelledState;

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
        const state = deletedExperienceState as DeletedExperienceSuccessState;

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

function handleOnSyncAction(proxy: StateMachine, { data }: OnSycPayload) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const offlineIdToOnlineExperienceMap =
      data.offlineIdToOnlineExperienceMap ||
      // istanbul ignore next:
      {};

    const syncErrors =
      data.syncErrors ||
      // istanbul ignore next:
      {};

    const onlineExperienceUpdatedMap =
      data.onlineExperienceUpdatedMap ||
      // istanbul ignore next:
      {};

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
      }

      if (!newExperience && syncError) {
        iter.syncError = syncError;
        iter.onlineStatus = StateValue.partOffline;
      }

      if (isUpdated) {
        iter.onlineStatus = StateValue.online;
      }
    }

    // istanbul ignore else:
    if (
      data.offlineIdToOnlineExperienceMap &&
      Object.keys(offlineIdToOnlineExperienceMap).length
    ) {
      const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

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

function prepareExperienceForSearch({ id, title }: ExperienceListViewFragment) {
  return {
    id,
    title,
    target: fuzzysort.prepare(title) as Fuzzysort.Prepared,
  };
}

/////////////////// END STATE UPDATE HELPERS SECTION //////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const deletedExperienceRequestEffect: DefDeleteExperienceRequestEffect["func"] =
  ({ id }, props) => {
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
  _,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  let timeoutId: null | NodeJS.Timeout = null;
  let fetchExperiencesAttemptsCount = 0;
  const timeoutsLen = FETCH_EXPERIENCES_TIMEOUTS.length - 1;

  // bei seitennummerierung wurden wir zwischengespeicherte Erfahrungen nicht
  // gebraucht
  const cachedExperiencesResult = getCachedExperiencesConnectionListView();

  const deletedExperience = await deleteExperienceProcessedEffectHelper();

  if (paginationInput) {
    fetchExperiences();
    return;
  }

  if (cachedExperiencesResult) {
    const [experiences, preparedExperiences] = processGetExperiencesQuery(
      cachedExperiencesResult,
      {
        deletedExperience,
      },
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
      const networkFetchResult = await getExperienceConnectionListView(
        "network-only",
        paginationInput || {
          first: EXPERIENCES_MINI_FETCH_COUNT,
        },
      );

      const { data, error } = networkFetchResult;

      if (error) {
        dispatch({
          type: ActionType.ON_DATA_RECEIVED,
          key: StateValue.errors,
          error,
        });
      } else {
        const fetchedExperiences = (data &&
          data.getExperiences) as GetExperiencesConnectionListView_getExperiences;

        const [processedResults, preparedExperiences] =
          processGetExperiencesQuery(fetchedExperiences, {
            isPaginating: !!paginationInput,
            existingData: cachedExperiencesResult || null,
          });

        dispatch({
          type: ActionType.ON_DATA_RECEIVED,
          key: StateValue.data,
          data: processedResults,
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
    paginationInput?: GetExperiencesConnectionListViewVariables;
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
    let timeoutCb = undefined as unknown as () => void;

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
      type: ActionType.RECORD_TIMEOUT,
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

async function deleteExperienceProcessedEffectHelper() {
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
      id,
      title: deletedExperience.title,
    });
  }

  return deletedExperience;
}

function processGetExperiencesQuery(
  { edges, pageInfo }: GetExperiencesConnectionListView_getExperiences,
  {
    isPaginating,
    existingData,
    deletedExperience,
  }: {
    isPaginating?: boolean;
    deletedExperience?: DeletedExperienceLedger;
    existingData?: GetExperiencesConnectionListView_getExperiences | null;
  },
): [ExperiencesData, PreparedExperience[]] {
  const deletedId = deletedExperience ? deletedExperience.id : "";

  const previousEdges = ((existingData && existingData.edges) ||
    []) as GetExperiencesConnectionListView_getExperiences_edges[];

  const newEdges =
    edges as GetExperiencesConnectionListView_getExperiences_edges[];

  const allEdges = [...previousEdges, ...newEdges];

  const syncErrors = getSyncErrors() || {};

  const preparedExperiences: PreparedExperience[] = [];

  const idToExperienceMap: {
    [experienceId: string]: ExperienceListViewFragment;
  } = {};

  const [experiences, erfahrungenIds] = newEdges.reduce(
    (acc, edge) => {
      const [neuenErfahrungen, erfahrungenIds] = acc;

      const experience = edge.node as ExperienceListViewFragment;
      const { id } = experience;

      if (id === deletedId) {
        return acc;
      }

      const syncError = syncErrors[id];
      erfahrungenIds.push(id);
      idToExperienceMap[id] = experience;
      preparedExperiences.push(prepareExperienceForSearch(experience));
      const unsynced = getUnsyncedExperience(id);

      neuenErfahrungen.push({
        experience,
        syncError,
        onlineStatus: getOnlineStatus(id, unsynced),
      });

      return acc;
    },
    [[], []] as [ExperienceData[], string[]],
  );

  if (isPaginating) {
    writeGetExperiencesMiniQuery({
      edges: allEdges,
      pageInfo,
    });
  }

  if (existingData !== undefined && erfahrungenIds.length) {
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

////////////////////////// END EFFECTS SECTION ////////////////////////

export type StateMachine = GenericGeneralEffect<EffectType> & {
  states: LoadingState | ErrorState | DataState;
  timeouts: Timeouts;
};

type ErrorState = {
  value: ErrorsVal;
  error: string;
};

export type DataState = {
  value: DataVal;
  data: {
    context: DataStateContext;
    states: {
      upsertExperienceActivated:
        | {
            value: InActiveVal;
          }
        | UpsertExperienceActiveState;
      experiences: ExperiencesMap;
      search: SearchState;
      deletedExperience: DeletedExperienceState;
    };
  };
};

type UpsertExperienceActiveState = {
  value: ActiveVal;
  active: {
    context: UpsertExperiencePayload;
  };
};

type DataStateContext = ExperiencesData & {
  experiencesPrepared: ExperiencesSearchPrepared;
};

export type DeletedExperienceState =
  | {
      value: InActiveVal;
    }
  | DeletedExperienceCancelledState
  | DeletedExperienceSuccessState;

type DeletedExperienceSuccessState = {
  value: DeletedVal;
  deleted: {
    context: {
      title: string;
    };
  };
};

type DeletedExperienceCancelledState = {
  value: CancelledVal;
  cancelled: {
    context: {
      title: string;
    };
  };
};

export type SearchState =
  | {
      value: InActiveVal;
    }
  | SearchActive;

export interface SearchActive {
  value: ActiveVal;
  active: {
    context: {
      value: string;
      results: MySearchResult[];
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
      type: ActionType.RECORD_TIMEOUT;
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
  experience: ExperienceListViewFragment;
  onlineStatus?: OnlineStatus;
};

type UpsertExperiencePayload = {
  experience?: ExperienceListViewFragment;
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
  Record<string, string | undefined>,
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
  OwnArgs = Any,
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type PreparedExperience = {
  id: string;
  title: string;
  target: Fuzzysort.Prepared;
};
