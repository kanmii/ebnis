import { ApolloError } from "@apollo/client";
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectErrorFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectErrorFragment";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import {
  GetEntriesUnionFragment,
  GetEntriesUnionFragment_GetEntriesSuccess,
} from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { PaginationInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { PageInfoFragment } from "@eb/cm/src/graphql/apollo-types/PageInfoFragment";
import {
  entryToEdge,
  toGetEntriesSuccessQuery,
} from "@eb/cm/src/graphql/utils.gql";
import { wrapReducer, wrapState } from "@eb/cm/src/logger";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import { ComponentTimeoutsMs } from "@eb/cm/src/utils/timers";
import {
  ActiveVal,
  CancelledVal,
  CommonError,
  DeletedVal,
  DeleteSuccess,
  ErrorsVal,
  FailVal,
  IdToUpdateEntrySyncErrorMap,
  InActiveVal,
  KeyOfTimeouts,
  OfflineIdToCreateEntrySyncErrorMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnlineStatus,
  ReFetchOnly as ReFetchOnlyVal,
  RequestedVal,
  StateValue,
  SuccessVal,
  SyncError,
  Timeouts,
  UpdateEntrySyncErrors,
} from "@eb/cm/src/utils/types";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import immer, { Draft } from "immer";
// import { original } from "immer";
import { Dispatch, Reducer } from "react";
import {
  getCachedEntriesDetailView,
  writeCachedEntriesDetailView,
} from "../../apollo/get-detailed-experience-query";
import {
  getSyncError,
  putOrRemoveSyncError,
} from "../../apollo/sync-to-server-cache";
import { purgeEntry } from "../../apollo/update-get-experiences-list-view-query";
import { deleteObjectKey } from "../../utils";
import {
  FETCH_ENTRIES_FAIL_ERROR_MSG,
  FieldError,
  GENERIC_SERVER_ERROR,
  parseStringError,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import {
  getEntriesDetailView,
  GetEntriesDetailViewQueryResult,
} from "../../utils/experience.gql.types";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { UpdateExperiencesMutationProps } from "../../utils/update-experiences.gql";
import { nonsenseId } from "../../utils/utils.dom";
import { scrollDocumentToTop } from "../DetailExperience/detail-experience.injectables";
import {
  Action as ParentAction,
  ActionType as ParentActionType,
  DispatchType as ParentDispatchType,
  ExperienceSyncError,
} from "../DetailExperience/detailed-experience-utils";
import { UpdatingPayload } from "../UpsertEntry/upsert-entry.utils";
import { updateExperienceOfflineFn } from "../UpsertExperience/upsert-experience.resolvers";
import { cleanUpSyncedOfflineEntries } from "../WithSubscriptions/with-subscriptions.utils";

export enum EntriesRemoteActionType {
  upsert = "@entries/remote/upsert",
  hide_menus = "@entries/remote/hide-menus",
  sync_errors_received = "@entries/remote/sync-errors-received",
}

export enum ActionType {
  toggle_upsert_ui = "@entries/toggle-upsert-ui",
  on_upsert_success = "@entries/on-upsert-success",
  close_notification = "@entries/close-notification",
  record_timeout = "@entries/record-timeout",
  re_fetch = "@entries/re-fetch",
  fetch_next = "@entries/fetch-next",
  on_fetched = "@entries/on-fetched",
  menus = "@entries/menus",
  delete = "@entries/delete",
  from_parent_actions = "@entries/from-parent-actions",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (states) => {
      const proxy = states as StateMachine;
      unsetStatesHelper(proxy);

      switch (type) {
        case ActionType.toggle_upsert_ui:
          handleToggleUpsertUiAction(proxy, payload as UpsertActivePayload);
          break;

        case ActionType.close_notification:
          handleCloseNotification(proxy);
          break;

        case ActionType.record_timeout:
          handleRecordTimeoutAction(proxy, payload as SetTimeoutPayload);
          break;

        case ActionType.re_fetch:
          handleRefetchAction(proxy);
          break;

        case ActionType.on_fetched:
          handleOnFetchedAction(
            proxy,
            payload as ProcessedEntriesQueryReturnVal,
          );
          break;

        case ActionType.fetch_next:
          handleFetchNextAction(proxy);
          break;

        case ActionType.on_upsert_success:
          handleOnUpsertSuccessAction(proxy, payload as OnUpsertPayload);
          break;

        case ActionType.menus:
          handleMenusAction(proxy, payload as MenusPayload);
          break;

        case ActionType.delete:
          handleDeleteAction(proxy, payload as DeletePayload);
          break;

        case ActionType.from_parent_actions:
          handleFromParentAction(proxy, payload as FromParentActionPayload);
          break;
      }
    });
  });

// ====================================================
// START STATE UPDATE SECTION
// ====================================================

export function initState(props: Props): StateMachine {
  const { entriesData, experience } = props;

  const state: StateMachine = {
    id: "@entries",
    context: { experience },
    timeouts: {},
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    states: {
      notification: {
        value: StateValue.inactive,
      },
      upsertUi: {
        value: StateValue.inactive,
      },
      entries:
        entriesData.key === StateValue.success
          ? {
              value: StateValue.success,
              success: {
                context: {
                  ...entriesData,
                },
              },
            }
          : {
              value: StateValue.fail,
              error: parseStringError(entriesData.error),
            },
      menu: {
        value: StateValue.inactive,
      },
    },
  };

  return wrapState(state);
}

function handleToggleUpsertUiAction(
  proxy: DraftState,
  payload: UpsertActivePayload,
) {
  const { states } = proxy;

  const { updatingEntry } = payload;

  const {
    upsertUi: { value },
  } = states;

  if (updatingEntry) {
    const state = states.upsertUi as UpsertActive;
    state.value = StateValue.active;
    state.active = {
      context: {
        updatingEntry: updatingEntry,
      },
    };

    return;
  }

  if (value === StateValue.active) {
    states.upsertUi.value = StateValue.inactive;
    return;
  }

  // :TODO: set parent sync error
  // if (syncErrors) {
  //   states.syncErrorsMsg.value = StateValue.active;
  //   return;
  // }

  const state = states.upsertUi as UpsertActive;
  state.value = StateValue.active;
  state.active = {
    context: {},
  };
}

function handleCloseNotification(proxy: DraftState) {
  // istanbul ignore else:
  const { states, timeouts } = proxy;
  states.notification.value = StateValue.inactive;

  const effects = getEffects(proxy);

  effects.push({
    key: "timeoutsEffect",
    ownArgs: {
      clear: timeouts.genericTimeout as NodeJS.Timeout,
    },
  });

  delete timeouts.genericTimeout;
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

function handleRefetchAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.entries.value !== StateValue.success) {
    const effects = getEffects(proxy);

    effects.push({
      key: "fetchEffect",
      ownArgs: {},
    });
  }
}

function handleOnFetchedAction(
  proxy: DraftState,
  payload: ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload,
) {
  const { states } = proxy;

  const entriesState = states.entries;
  const successState = states.entries as DataSuccess;

  switch (entriesState.value) {
    // state
    case StateValue.success:
      {
        const { context } = entriesState.success;

        switch (payload.key) {
          // fetch successful
          case StateValue.success:
            {
              context.pageInfo = payload.pageInfo;
              context.entries = [...context.entries, ...payload.entries];
            }
            break;

          // re-fetching
          case StateValue.reFetchOnly:
            {
              const { entries } = payload;
              const idToEntryMap = (entries.edges as EntryConnectionFragment_edges[]).reduce(
                (acc, edge) => {
                  const entry = edge.node as EntryFragment;
                  acc[entry.id] = entry;
                  return acc;
                },
                {} as { [entryId: string]: EntryFragment },
              );

              context.entries.forEach((val) => {
                const oldEntry = val.entryData;
                val.entryData = idToEntryMap[oldEntry.id];
              });
            }
            break;

          case StateValue.fail:
            {
              const error =
                context.error ||
                // istanbul ignore next:
                ({} as DataContextError);

              context.error = error;
              error.value = "fetchError";
              error.error = parseStringError(payload.error);
            }
            break;
        }
      }
      break;

    // state
    case StateValue.fail:
      switch (payload.key) {
        // fetch effect successful
        case StateValue.success:
          {
            successState.value = StateValue.success;
            successState.success = {
              context: {
                entries: payload.entries,
                pageInfo: payload.pageInfo,
              },
            };
          }
          break;

        // re-fetching
        case StateValue.reFetchOnly:
          {
            const { entries } = payload;

            const { data } = processEntriesQuery(
              toGetEntriesSuccessQuery(entries),
            );

            successState.value = StateValue.success;

            successState.success = {
              context: {
                entries: (data as ProcessedQuerySuccessReturnVal).entries,
                pageInfo: entries.pageInfo,
                error: {
                  value: "fetchError",
                  error: (states.entries as DataFailure).error,
                },
              },
            };
          }
          break;
      }
      break;
  }
}

function handleFetchNextAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.entries.value === StateValue.success) {
    const { hasNextPage, endCursor } = states.entries.success.context.pageInfo;

    // istanbul ignore else
    if (hasNextPage) {
      const effects = getEffects(proxy);

      effects.push({
        key: "fetchEffect",
        ownArgs: {
          pagination: {
            first: 10,
            after: endCursor,
          },
        },
      });
    }
  }
}

function handleOnUpsertSuccessAction(
  proxy: DraftState,
  payload: OnUpsertPayload,
) {
  const { states, context } = proxy;

  const {
    experience: { id: experienceId },
  } = context;

  const { upsertUi, notification, entries: entriesState } = states;
  const successState = entriesState as DataSuccess;

  upsertUi.value = StateValue.inactive;
  // :TODO: parent experience detail notification must be set to inactive ???
  // notification.value = StateValue.inactive;

  const {
    oldData,
    newData: {
      entry: upsertedEntry,
      // :TODO: handle this?????
      // onlineStatus: newOnlineStatus
    },
    syncErrors,
  } = payload;

  // :TODO: set parent onlineStatus
  // context.onlineStatus = newOnlineStatus;
  const effects = getEffects(proxy);

  effects.push({
    key: "timeoutsEffect",
    ownArgs: {
      set: "set-close-upsert-entry-created-notification",
    },
  });

  // completely new entry created online
  if (!oldData) {
    const newEntryNotification = notification as NotificationState;

    newEntryNotification.value = StateValue.active;

    newEntryNotification.active = {
      context: {
        message: `New entry created on: ${formatDatetime(
          upsertedEntry.updatedAt,
        )}`,
      },
    };

    effects.push({
      key: "scrollDocToTopEffect",
      ownArgs: {},
    });

    switch (entriesState.value) {
      case StateValue.success:
        {
          const { context } = successState.success;

          context.entries.unshift({
            entryData: upsertedEntry,
          });
        }
        break;

      case StateValue.fail:
        {
          successState.value = StateValue.success;

          successState.success = {
            context: {
              entries: [
                {
                  entryData: upsertedEntry,
                },
              ],
              pageInfo: {} as PageInfoFragment,
              error: {
                value: "fetchError",
                error: "initial fetch failed",
              },
            },
          };
        }
        break;
    }
  } else {
    // :TODO: notification?
    // updated entry: either offline entry synced / online entry updated
    const { entry, index } = oldData;
    const { id: oldEntryId } = entry;

    // istanbul ignore else:
    if (syncErrors && syncErrors.entriesErrors) {
      const index1 = index + 1;

      // remove the syn errors for updated online entry / offline created entry
      const entriesErrors = syncErrors.entriesErrors.filter((d) => {
        return d[0] !== index1;
      });

      if (entriesErrors.length) {
        syncErrors.entriesErrors = entriesErrors;
      } else {
        delete syncErrors.entriesErrors;
      }
    }

    updateEntriesFn(proxy, entriesState, upsertedEntry, oldEntryId);

    const cleanUpData: DefDeleteCreateEntrySyncErrorEffect["ownArgs"]["data"] = {
      experienceId,
    };

    // offline entry synced
    // istanbul ignore else:
    if (oldEntryId !== upsertedEntry.id) {
      cleanUpData.createErrors = [entry];
    }

    effects.push({
      key: "deleteCreateEntrySyncErrorEffect",
      ownArgs: {
        data: cleanUpData,
      },
    });
  }
}

function handleMenusAction(proxy: DraftState, { entry }: MenusPayload) {
  const {
    states: { menu },
  } = proxy;

  const inactiveState = menu as MenuInactive;

  // menu event is not from an entry e.g. user clicked on html document element
  if (!entry) {
    inactiveState.value = StateValue.inactive;
    return;
  }

  const { id } = entry;
  const activeState = menu as MenuActive;

  // menus currently inactive, show menu
  if (menu.value === StateValue.inactive) {
    activeState.value = StateValue.active;
    activeState.active = {
      id,
    };

    // tell DetailExperienceComponent to close all other menus
    const effects = getEffects(proxy);
    effects.push({
      key: "parentEffects",
      ownArgs: {
        type: ParentActionType.hide_menus,
        menus: ["mainCircular", "comments"],
      },
    });

    return;
  }

  const { active } = activeState;

  // currently active menu clicked, hide it
  if (active.id === id) {
    inactiveState.value = StateValue.inactive;
  } else {
    // an inactive menu clicked, show it
    active.id = id;
  }
}

function handleDeleteAction(proxy: DraftState, payload: DeletePayload) {
  const {
    states: { menu, entries },
    context: { experience },
  } = proxy;

  switch (payload.key) {
    case StateValue.requested:
      {
        const { entry } = payload;
        const state = menu as DeleteRequested;
        state.value = StateValue.requested;
        state.requested = {
          entry,
        };
      }
      break;

    case StateValue.cancelled:
      {
        menu.value = StateValue.inactive;

        const { genericTimeout } = proxy.timeouts;

        if (genericTimeout) {
          const effects = getEffects(proxy);

          effects.push({
            key: "timeoutsEffect",
            ownArgs: {
              clear: genericTimeout as NodeJS.Timeout,
            },
          });

          delete proxy.timeouts.genericTimeout;
        }
      }
      break;

    case StateValue.deleted:
      {
        const neutralState = menu;

        if (menu.value === StateValue.requested) {
          neutralState.value = StateValue.inactive;
          const deletingEntry = menu.requested.entry;

          const effects = getEffects(proxy);
          effects.push({
            key: "deleteEntryEffect",
            ownArgs: {
              entry: deletingEntry,
              experienceId: experience.id,
            },
          });
        }
      }
      break;

    case StateValue.success:
      {
        menu.value = StateValue.deleteSuccess;
        const { id, timeoutId } = payload;

        proxy.timeouts.genericTimeout = timeoutId;

        const entriesState = entries as DataSuccess;
        entriesState.success.context.entries = entriesState.success.context.entries.filter(
          (e) => {
            return id !== e.entryData.id;
          },
        );
      }
      break;

    case StateValue.errors:
      {
        menu.value = StateValue.errors;
        const { error, timeoutId } = payload;

        proxy.timeouts.genericTimeout = timeoutId;

        const state = menu as DeleteFail;
        state.errors = {
          error: parseStringError(error),
        };
      }
      break;
  }
}

const parentActionsObject = {
  [EntriesRemoteActionType.upsert]: handleToggleUpsertUiAction,
  [EntriesRemoteActionType.hide_menus]: (proxy) => {
    handleMenusAction(proxy, {});
  },
  [EntriesRemoteActionType.sync_errors_received]: (
    proxy,
    payload: FromParentSyncErrorsReceivedPayload,
  ) => {
    const { data } = payload;
    const {
      states: { entries },
    } = proxy;

    const successState = entries as DataSuccess;
    successState.value = StateValue.success;
    const success =
      successState.success ||
      // istanbul ignore next:
      {};
    const context =
      success.context ||
      // istanbul ignore next:
      {};

    successState.success = {
      ...success,
      context: {
        ...context,
        entries: [...data],
      },
    };
  },
} as Record<
  EntriesRemoteActionType,
  <P = Record<string, unknown>>(proxy: DraftState, payload: P) => void
>;

function handleFromParentAction(
  proxy: DraftState,
  actionObj: FromParentActionPayload,
) {
  const { actions } = actionObj;

  actions.forEach(({ type, ...payload }) => {
    parentActionsObject[type as keyof typeof parentActionsObject](
      proxy,
      payload,
    );
  });
}

// ====================================================
// END STATE UPDATE SECTION
// ====================================================

// ====================================================
// START STATE UPDATE HELPERS SECTION
// ====================================================

function unsetStatesHelper(proxy: StateMachine) {
  proxy.effects.general.value = StateValue.noEffect;
  deleteObjectKey(proxy.effects.general, StateValue.hasEffects);
}

export const DISPLAY_DATE_FORMAT_STRING = "dd/MM/yyyy";
export const DISPLAY_TIME_FORMAT_STRING = " HH:mm";
const DISPLAY_DATETIME_FORMAT_STRING =
  DISPLAY_DATE_FORMAT_STRING + DISPLAY_TIME_FORMAT_STRING;

export function formatDatetime(date: Date | string) {
  date =
    typeof date === "string"
      ? parseISO(date)
      : // istanbul ignore next:
        date;
  return dateFnFormat(date, DISPLAY_DATETIME_FORMAT_STRING);
}

function updateEntriesFn(
  proxy: DraftState,
  state: Data,
  upsertedEntry: EntryFragment,
  oldEntryId: string,
) {
  const successState = state as DataSuccess;

  if (state.value === StateValue.fail) {
    successState.value = StateValue.success;

    successState.success = {
      context: {
        entries: [
          {
            entryData: upsertedEntry,
          },
        ],
        pageInfo: {} as PageInfoFragment,
        error: {
          value: "fetchError",
          error: "initial fetch failed",
        },
      },
    };

    const effects = getEffects(proxy);
    effects.push({
      key: "fetchEffect",
      ownArgs: {},
    });

    return;
  }

  const {
    context: { entries },
  } = successState.success;

  const len = entries.length;
  let i = 0;

  for (; i < len; i++) {
    const existingEntry = entries[i];
    const { id } = existingEntry.entryData;

    if (oldEntryId !== id) {
      continue;
    }

    existingEntry.entryData = upsertedEntry;
    existingEntry.syncError = undefined;
  }
}

// ====================================================
// END STATE UPDATE HELPERS SECTION
// ====================================================

// ====================================================
// START EFFECT SECTIONS
// ====================================================

const fetchEffect: DefFetchEffect["func"] = async (
  { pagination, reFetchFromCache },
  props,
  effectArgs,
) => {
  const {
    experience: { id: experienceId },
  } = props;
  const { dispatch } = effectArgs;

  const variables = {
    experienceId,
    pagination: pagination || {
      first: 10,
    },
  };

  const previousEntries = getCachedEntriesDetailView(
    experienceId,
  ) as GetEntriesUnionFragment_GetEntriesSuccess;

  if (reFetchFromCache && previousEntries) {
    dispatch({
      type: ActionType.on_fetched,
      key: StateValue.reFetchOnly,
      entries: previousEntries.entries,
    });

    return;
  }

  try {
    const { data, error } =
      (await getEntriesDetailView(variables)) ||
      // istanbul ignore next:
      ({} as GetEntriesDetailViewQueryResult);

    if (data) {
      const { data: processedEntries } = processEntriesQuery(data.getEntries);

      if (pagination) {
        const blätternZuId = appendToPreviousEntries(
          experienceId,
          processedEntries,
          previousEntries as GetEntriesUnionFragment_GetEntriesSuccess,
        );

        setTimeout(() => {
          scrollIntoView(blätternZuId);
        });
      }

      dispatch({
        type: ActionType.on_fetched,
        ...processedEntries,
      });
    } else {
      dispatch({
        type: ActionType.on_fetched,
        key: StateValue.fail,
        error: error as ApolloError,
      });
    }
  } catch (error) {
    dispatch({
      type: ActionType.on_fetched,
      key: StateValue.fail,
      error: error,
    });
  }
};

type DefFetchEffect = EffectDefinition<
  "fetchEffect",
  {
    pagination?: PaginationInput;
    // if we have updated experience successfully, then we re-fetch entries
    // from cache
    reFetchFromCache?: boolean;
  }
>;

const timeoutsEffect: DefTimeoutsEffect["func"] = (
  { set, clear },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const {
    componentTimeoutsMs: { closeNotification: closeNotificationTimeout },
  } = props;

  if (clear) {
    clearTimeout(clear);
  }

  if (set) {
    let timeoutCb = (undefined as unknown) as () => void;

    switch (set) {
      case "set-close-upsert-entry-created-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.close_notification,
          });
        };
        break;
    }

    const timeoutId = setTimeout(timeoutCb, closeNotificationTimeout);

    dispatch({
      type: ActionType.record_timeout,
      genericTimeout: timeoutId,
    });
  }
};

type DefTimeoutsEffect = EffectDefinition<
  "timeoutsEffect",
  {
    set?:
      | "set-close-upsert-entry-created-notification"
      | "set-close-update-experience-success-notification"
      | "set-close-comment-notification";
    clear?: NodeJS.Timeout;
  }
>;

const postOfflineEntriesSyncEffect: DefPostOfflineEntriesSyncEffect["func"] = ({
  data,
}) => {
  cleanUpSyncedOfflineEntries(data);
};

type DefPostOfflineEntriesSyncEffect = EffectDefinition<
  "postOfflineEntriesSyncEffect",
  {
    data: OnlineExperienceIdToOfflineEntriesMap;
  }
>;

const deleteCreateEntrySyncErrorEffect: DefDeleteCreateEntrySyncErrorEffect["func"] = ({
  data: { experienceId, createErrors },
}) => {
  const errors = getSyncError(experienceId);

  // istanbul ignore else:
  if (errors) {
    const fromImmer = immer(errors, (immerErrors) => {
      const { createEntries } = immerErrors;

      if (createEntries && createErrors) {
        createErrors.forEach((entry) => {
          delete createEntries[entry.id];
          purgeEntry(entry);
        });

        // istanbul ignore else:
        if (!Object.keys(createEntries).length) {
          delete immerErrors.createEntries;
        }
      }
    });

    const { persistor } = window.____ebnis;

    const newError = Object.keys(fromImmer).length ? fromImmer : undefined;
    putOrRemoveSyncError(experienceId, newError);

    persistor.persist();
  }
};

type DefDeleteCreateEntrySyncErrorEffect = EffectDefinition<
  "deleteCreateEntrySyncErrorEffect",
  {
    data: {
      experienceId: string;
      createErrors?: EntryFragment[];
    };
  }
>;

const deleteEntryEffect: DefDeleteEntryEffect["func"] = (
  { entry, experienceId },
  props,
  effectArgs,
) => {
  const { id } = entry;
  const { updateExperiencesMutation } = props;

  const input = {
    experienceId,
    deleteEntries: [id],
  };

  if (!isOfflineId(id) && getIsConnected()) {
    updateExperiencesMutation({
      input: [input],
      onUpdateSuccess(successArgs) {
        const deletedEntries =
          successArgs &&
          successArgs.entries &&
          successArgs.entries.deletedEntries;

        if (!deletedEntries) {
          deleteEntryFailEffectHelper(GENERIC_SERVER_ERROR, props, effectArgs);
          return;
        }

        const entryData = deletedEntries[0];

        if (entryData.__typename === "DeleteEntrySuccess") {
          deleteEntrySuccessEffectHelper(entryData.entry.id, props, effectArgs);
        } else {
          deleteEntryFailEffectHelper(
            entryData.errors.error,
            props,
            effectArgs,
          );
        }
      },
      onError(error) {
        deleteEntryFailEffectHelper(
          error || GENERIC_SERVER_ERROR,
          props,
          effectArgs,
        );
      },
    });
  } else {
    const updatedExperience = updateExperienceOfflineFn({
      experienceId,
      deletedEntry: entry,
    });

    if (updatedExperience) {
      deleteEntrySuccessEffectHelper(id, props, effectArgs);
    } else {
      deleteEntryFailEffectHelper(GENERIC_SERVER_ERROR, props, effectArgs);
    }
  }
};

type DefDeleteEntryEffect = EffectDefinition<
  "deleteEntryEffect",
  {
    entry: EntryFragment;
    experienceId: string;
  }
>;

const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

const parentEffects: DefParentEffect["func"] = (ownArgs, props) => {
  const { parentDispatch } = props;
  parentDispatch(ownArgs);
};

type DefParentEffect = EffectDefinition<"parentEffects", ParentAction>;

export const effectFunctions = {
  timeoutsEffect,
  fetchEffect,
  postOfflineEntriesSyncEffect,
  deleteCreateEntrySyncErrorEffect,
  deleteEntryEffect,
  scrollDocToTopEffect,
  parentEffects,
};

function getEffects(proxy: DraftState) {
  return getGeneralEffects<EffectType, DraftState>(proxy);
}

export function processEntriesQuery(
  entriesQueryResult?: GetEntriesUnionFragment | null,
  syncErrors?: SyncError,
): {
  data: ProcessedEntriesQueryReturnVal;
  entriesErrors?: IndexToEntryErrorsList;
  processedSyncErrors?: SyncError;
} {
  if (!entriesQueryResult) {
    const data = {
      key: StateValue.fail,
      error: FETCH_ENTRIES_FAIL_ERROR_MSG,
    };

    return {
      data,
    };
  }

  const syncErrors1 =
    (syncErrors && {
      ...syncErrors,
    }) ||
    ({} as SyncError);

  const { createEntries, updateEntries } = syncErrors1;

  const createSyncErrors =
    createEntries || ({} as OfflineIdToCreateEntrySyncErrorMap);

  const updateSyncErrors = updateEntries || ({} as IdToUpdateEntrySyncErrorMap);

  const entriesErrors: IndexToEntryErrorsList = [];

  if (entriesQueryResult.__typename === "GetEntriesSuccess") {
    const daten = entriesQueryResult.entries as EntryConnectionFragment;

    const entries = (daten.edges as EntryConnectionFragment_edges[]).map(
      (edge, index) => {
        const entry = edge.node as EntryFragment;
        const { id } = entry;
        const errorId = id;
        const createError = createSyncErrors[errorId];
        const updateError = updateSyncErrors[id];

        if (createError) {
          processCreateEntriesErrors(entriesErrors, createError, index);
        } else if (updateError) {
          processUpdateEntriesErrors(entriesErrors, updateError, index);
        }

        return {
          entryData: entry,
          entrySyncError: createError || updateError,
        };
      },
    );

    delete syncErrors1.createEntries;
    delete syncErrors1.updateEntries;

    const data = {
      key: StateValue.success,
      entries,
      pageInfo: daten.pageInfo,
    };

    return {
      data,
      entriesErrors: entriesErrors.length ? entriesErrors : undefined,
      processedSyncErrors: syncErrors1,
    };
  } else {
    const data = {
      key: StateValue.fail,
      error: entriesQueryResult.errors.error,
    };

    return {
      data,
    };
  }
}

type IndexToEntryErrorsList = [number | string, EntryErrorsList][];

type EntryErrorsList = {
  // [key, errorValue]
  others?: FieldError;
  // [index, key, errorValue]
  dataObjects?: [string | number, [string, string][]][];
};

function appendToPreviousEntries(
  experienceId: string,
  newEntriesData: ProcessedEntriesQueryReturnVal,
  previousEntries?: GetEntriesUnionFragment_GetEntriesSuccess,
) {
  let blätternZuId = nonsenseId;

  if (newEntriesData.key === StateValue.fail) {
    return blätternZuId;
  }

  const { entries, pageInfo } = newEntriesData;

  const newEntryEdges = entries.map((e) => entryToEdge(e.entryData));

  let previousEntryEdges = [] as EntryConnectionFragment_edges[];

  if (previousEntries) {
    previousEntryEdges = previousEntries.entries
      .edges as EntryConnectionFragment_edges[];
  }

  const allEdges = [...previousEntryEdges, ...newEntryEdges];

  const y = toGetEntriesSuccessQuery({
    edges: allEdges,
    pageInfo: pageInfo,
    __typename: "EntryConnection",
  });

  writeCachedEntriesDetailView(experienceId, y);

  const { persistor } = window.____ebnis;
  persistor.persist();

  if (previousEntryEdges.length) {
    blätternZuId = (previousEntryEdges[previousEntryEdges.length - 1]
      .node as EntryFragment).id;
  } else {
    blätternZuId = (newEntryEdges[0].node as EntryFragment).id;
  }

  return (
    blätternZuId ||
    // istanbul ignore next:
    "??"
  );
}

export function processCreateEntriesErrors(
  entryErrors: IndexToEntryErrorsList,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { __typename, meta, dataObjects, ...errors }: CreateEntryErrorFragment,
  index: number,
): [IndexToEntryErrorsList, EntryErrorsList] {
  const processedErrors: EntryErrorsList = {};
  entryErrors.push([index + 1, processedErrors]);

  const others: [string, string][] = [];

  Object.entries(errors).forEach(([k, v]) => {
    if (v) {
      others.push([k, v]);
    }
  });

  // istanbul ignore else:
  if (others.length) {
    processedErrors.others = others;
  }

  // istanbul ignore else:
  if (dataObjects) {
    processedErrors.dataObjects = processDataObjectsErrors(
      dataObjects as DataObjectErrorFragment[],
    );
  }

  return [entryErrors, processedErrors];
}

export function processUpdateEntriesErrors(
  entryErrors: IndexToEntryErrorsList,
  data: UpdateEntrySyncErrors,
  index: number,
): [IndexToEntryErrorsList, EntryErrorsList] {
  const processedErrors: EntryErrorsList = {};
  entryErrors.push([index + 1, processedErrors]);

  if ("string" === typeof data) {
    processedErrors.others = [["", data]];
  } else {
    processedErrors.dataObjects = processDataObjectsErrors(
      Object.values(data) as DataObjectErrorFragment[],
    );
  }

  return [entryErrors, processedErrors];
}

function processDataObjectsErrors(dataObjects: DataObjectErrorFragment[]) {
  const dataErrorList: DataObjectErrorsList = [];

  dataObjects.forEach((d) => {
    const list: [string, string][] = [];

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      __typename,
      meta: { index: dIndex },
      ...errors
    } = d as DataObjectErrorFragment;

    Object.entries(errors).forEach(([k, v]) => {
      if (v) {
        list.push([k, v]);
      }
    });

    dataErrorList.push([dIndex + 1, list]);
  });

  return dataErrorList;
}

function deleteEntrySuccessEffectHelper(
  id: string,
  props: Props,
  effectArgs: EffectArgs,
) {
  const { dispatch } = effectArgs;
  const {
    componentTimeoutsMs: { closeNotification },
  } = props;

  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.delete,
      key: StateValue.cancelled,
    });
  }, closeNotification);

  dispatch({
    type: ActionType.delete,
    key: StateValue.success,
    id,
    timeoutId,
  });
}

function deleteEntryFailEffectHelper(
  error: CommonError,
  props: Props,
  effectArgs: EffectArgs,
) {
  const { dispatch } = effectArgs;
  const {
    componentTimeoutsMs: { closeNotification },
  } = props;

  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.delete,
      key: StateValue.cancelled,
    });
  }, closeNotification);

  dispatch({
    type: ActionType.delete,
    key: StateValue.errors,
    error,
    timeoutId,
  });

  scrollDocumentToTop();
}

// ====================================================
// END EFFECT SECTIONS
// ====================================================

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> & {
  context: {
    experience: ExperienceDetailViewFragment;
  };
  timeouts: Timeouts;
  states: {
    notification:
      | {
          value: InActiveVal;
        }
      | NotificationState;
    entries: Data;
    menu:
      | MenuInactive
      | MenuActive
      | DeleteRequested
      | DeletedSuccess
      | DeleteFail;
    upsertUi:
      | {
          value: InActiveVal;
        }
      | UpsertActive;
  };
};

type UpsertActive = {
  value: ActiveVal;
  active: {
    context: UpsertActivePayload;
  };
};

type DeleteFail = {
  value: ErrorsVal;
  errors: {
    error: string;
  };
};

type DeleteRequested = {
  value: RequestedVal;
  requested: {
    entry: EntryFragment;
  };
};

type DeletedSuccess = {
  value: DeleteSuccess;
  deleteSuccess: {
    entryId: string;
  };
};

type MenuInactive = {
  value: InActiveVal;
};

type MenuActive = {
  value: ActiveVal;
  active: {
    id: string;
  };
};

type Data = DataSuccess | DataFailure;

type DataContextError = {
  value: "pagingError" | "fetchError";
  error: string;
};

export type DataSuccess = {
  value: SuccessVal;
  success: {
    context: {
      entries: DataContext;
      pageInfo: PageInfoFragment;
      error?: DataContextError;
    };
  };
};

type DataContext = DataContextEntry[];

export type DataContextEntry = {
  entryData: EntryFragment;
  syncError?: EntryErrorsList;
};

type DataFailure = {
  value: FailVal;
  error: string;
};

type NotificationState = {
  value: ActiveVal;
  active: {
    context: {
      message: string;
    };
  };
};

export type Action =
  | ({
      type: ActionType.toggle_upsert_ui;
    } & UpsertActivePayload)
  | ({
      type: ActionType.on_upsert_success;
    } & OnUpsertPayload)
  | {
      type: ActionType.close_notification;
    }
  | ({
      type: ActionType.record_timeout;
    } & SetTimeoutPayload)
  | {
      type: ActionType.re_fetch;
    }
  | ({
      type: ActionType.on_fetched;
    } & (ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload))
  | {
      type: ActionType.fetch_next;
    }
  | ({
      type: ActionType.menus;
    } & MenusPayload)
  | ({
      type: ActionType.delete;
    } & DeletePayload)
  | ({
      type: ActionType.from_parent_actions;
    } & FromParentActionPayload);

export type EntriesRemoteAction =
  | {
      type: EntriesRemoteActionType.upsert;
    }
  | {
      type: EntriesRemoteActionType.hide_menus;
    }
  | ({
      type: EntriesRemoteActionType.sync_errors_received;
    } & FromParentSyncErrorsReceivedPayload);

type FromParentActionPayload = {
  actions: EntriesRemoteAction[];
};

type FromParentSyncErrorsReceivedPayload = {
  data: DataContext;
};

type DeletePayload =
  | {
      key: RequestedVal;
      entry: EntryFragment;
    }
  | {
      key: CancelledVal;
    }
  | {
      key: DeletedVal;
    }
  | {
      key: SuccessVal;
      id: string;
      timeoutId: NodeJS.Timeout;
    }
  | {
      key: ErrorsVal;
      error: CommonError;
      timeoutId: NodeJS.Timeout;
    };

type MenusPayload = {
  entry?: EntryFragment;
};

type ReFetchOnlyPayload = {
  key: ReFetchOnlyVal;
  entries: EntryConnectionFragment;
};

type ProcessedQueryErrorReturnVal = {
  key: FailVal;
  error: string | Error;
};

type ProcessedQuerySuccessReturnVal = {
  key: SuccessVal;
  entries: DataContext;
  pageInfo: PageInfoFragment;
};

export type ProcessedEntriesQueryReturnVal =
  | ProcessedQuerySuccessReturnVal
  | ProcessedQueryErrorReturnVal;

export type UpsertActivePayload = {
  updatingEntry?: UpdatingPayload & {
    index: number;
  };
};

interface OnUpsertPayload {
  oldData?: OldEntryData;
  newData: {
    entry: EntryFragment;
    onlineStatus: OnlineStatus;
  };
  syncErrors?: ExperienceSyncError;
}

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

export type OldEntryData = {
  entry: EntryFragment;
  index: number;
};

export type EntriesParentContext = {
  value: ActiveVal | InActiveVal;
  postActions: EntriesRemoteAction[];
  entriesData: ProcessedEntriesQueryReturnVal;
  syncErrors?: boolean;
};

export type CallerProps = EntriesParentContext & {
  experience: ExperienceDetailViewFragment;
  parentDispatch: ParentDispatchType;
};

export type EntriesSyncErrors = Pick<
  SyncError,
  "createEntries" | "updateEntries"
>;

export type Props = CallerProps &
  UpdateExperiencesMutationProps & {
    componentTimeoutsMs: ComponentTimeoutsMs;
  };

export type EffectType =
  | DefTimeoutsEffect
  | DefFetchEffect
  | DefPostOfflineEntriesSyncEffect
  | DefDeleteCreateEntrySyncErrorEffect
  | DefDeleteEntryEffect
  | DefScrollDocToTopEffect
  | DefParentEffect;

export type DispatchType = Dispatch<Action>;

export type EffectArgs = {
  dispatch: DispatchType;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Record<string, unknown>
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type DataObjectErrorsList = [string | number, [string, string][]][];
