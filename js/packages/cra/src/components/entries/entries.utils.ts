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
import { toGetEntriesSuccessQuery } from "@eb/cm/src/graphql/utils.gql";
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
import { wrapReducer, wrapState } from "@eb/cm/src/logger";
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
import { ExperienceSyncError } from "../DetailExperience/detailed-experience-utils";
import { entryToEdge } from "../UpsertEntry/entry-to-edge";
import { UpdatingPayload } from "../UpsertEntry/upsert-entry.utils";
import { updateExperienceOfflineFn } from "../UpsertExperience/upsert-experience.resolvers";
import { cleanUpSyncedOfflineEntries } from "../WithSubscriptions/with-subscriptions.utils";
import {
  ActionType as ParentActionType,
  DispatchType as ParentDispatchType,
  Action as ParentAction,
} from "../DetailExperience/detailed-experience-utils";

export enum EntriesRemoteActionType {
  upsert = "@entries/remote/upsert",
  hide_menus = "@entries/remote/hide-menus",
}

export enum ActionType {
  toggle_upsert_entry_active = "@entries/toggle-upsert-entry",
  on_upsert_entry_success = "@entries/on-upsert-entry-success",
  on_close_new_entry_created_notification = "@entries/on-close-upsert-entry-created-notification",
  record_timeout = "@entries/record-timeout",
  re_fetch_entries = "@entries/re-fetch-entries",
  fetch_next_entries = "@entries/fetch-next-entries",
  entries_received = "@entries/on-entries-received",
  menus = "@entries/menus",
  delete_entry = "@entries/delete-entry",
  from_parent_post_actions = "@entries/from-parent-exit-actions",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (states) => {
      const proxy = states as StateMachine;
      unsetStatesHelper(proxy);

      switch (type) {
        case ActionType.toggle_upsert_entry_active:
          handleToggleUpsertEntryActiveAction(
            proxy,
            payload as UpsertActivePayload,
          );
          break;

        case ActionType.on_close_new_entry_created_notification:
          handleOnCloseNewEntryCreatedNotification(proxy);
          break;

        case ActionType.record_timeout:
          handleRecordTimeoutAction(proxy, payload as SetTimeoutPayload);
          break;

        case ActionType.re_fetch_entries:
          handleRefetchEntriesAction(proxy);
          break;

        case ActionType.entries_received:
          handleEntriesReceivedAction(
            proxy,
            payload as ProcessedEntriesQueryReturnVal,
          );
          break;

        case ActionType.fetch_next_entries:
          handleFetchNextEntriesAction(proxy);
          break;

        case ActionType.on_upsert_entry_success:
          handleOnUpsertEntrySuccessAction(
            proxy,
            payload as OnEntryCreatedPayload,
          );
          break;

        case ActionType.menus:
          handleMenusAction(proxy, payload as MenusPayload);
          break;

        case ActionType.delete_entry:
          handleDeleteEntryAction(proxy, payload as DeleteEntryPayload);
          break;

        case ActionType.from_parent_post_actions:
          handleParentAction(proxy, payload as ParentPostActionPayload);
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
                  entries: entriesData.entries,
                  pageInfo: entriesData.pageInfo,
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

function handleToggleUpsertEntryActiveAction(
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

function handleOnCloseNewEntryCreatedNotification(proxy: DraftState) {
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

function handleRefetchEntriesAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.entries.value !== StateValue.success) {
    const effects = getEffects(proxy);

    effects.push({
      key: "fetchEntriesEffect",
      ownArgs: {},
    });
  }
}

function handleEntriesReceivedAction(
  proxy: DraftState,
  payload: ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload,
) {
  const { states } = proxy;

  const entriesState = states.entries;
  const successState = states.entries as EntriesDataSuccessSate;

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
                entries: (data as ProcessedEntriesQuerySuccessReturnVal)
                  .entries,
                pageInfo: entries.pageInfo,
                error: {
                  value: "fetchError",
                  error: (states.entries as EntriesDataFailureState).error,
                },
              },
            };
          }
          break;
      }
      break;
  }
}

function handleFetchNextEntriesAction(proxy: DraftState) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.entries.value === StateValue.success) {
    const { hasNextPage, endCursor } = states.entries.success.context.pageInfo;

    // istanbul ignore else
    if (hasNextPage) {
      const effects = getEffects(proxy);

      effects.push({
        key: "fetchEntriesEffect",
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

function handleOnUpsertEntrySuccessAction(
  proxy: DraftState,
  payload: OnEntryCreatedPayload,
) {
  const { states, context } = proxy;

  const {
    experience: { id: experienceId },
  } = context;

  const { upsertUi, notification, entries: entriesState } = states;
  const successState = entriesState as EntriesDataSuccessSate;

  upsertUi.value = StateValue.inactive;
  // :TODO: parent experience detail notification must be set to inactive ???
  // notification.value = StateValue.inactive;

  const {
    oldData,
    newData: { entry: newEntry, onlineStatus: newOnlineStatus },
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
    const newEntryState = notification as NotificationState;

    newEntryState.value = StateValue.active;

    newEntryState.active = {
      context: {
        message: `New entry created on: ${formatDatetime(newEntry.updatedAt)}`,
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
            entryData: newEntry,
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
                  entryData: newEntry,
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
    // updated entry: either offline entry synced / online entry updated
    const { entry, index } = oldData;
    const { id } = entry;

    // istanbul ignore else:
    if (syncErrors && syncErrors.entriesErrors) {
      const index1 = index + 1;

      const entriesErrors = syncErrors.entriesErrors.filter((d) => {
        return d[0] !== index1;
      });

      if (entriesErrors.length) {
        syncErrors.entriesErrors = entriesErrors;
      } else {
        delete syncErrors.entriesErrors;
      }
    }

    updateEntriesFn(
      proxy,
      entriesState,
      {
        [id]: newEntry,
      },
      true,
    );

    const cleanUpData: DefDeleteCreateEntrySyncErrorEffect["ownArgs"]["data"] = {
      experienceId,
    };

    // offline entry synced
    // istanbul ignore else:
    if (id !== newEntry.id) {
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

function handleDeleteEntryAction(
  proxy: DraftState,
  payload: DeleteEntryPayload,
) {
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

        const entriesState = entries as EntriesDataSuccessSate;
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
  [EntriesRemoteActionType.upsert]: handleToggleUpsertEntryActiveAction,
  [EntriesRemoteActionType.hide_menus]: (proxy) => {
    handleMenusAction(proxy, {});
  },
} as Record<
  EntriesRemoteActionType,
  <P = Record<string, unknown>>(proxy: DraftState, payload: P) => void
>;

function handleParentAction(
  proxy: DraftState,
  actionObj: ParentPostActionPayload,
) {
  const { actions, ...payload } = actionObj;

  actions.forEach(({ type }) => {
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
  state: EntriesData,
  payload:
    | {
        [entryId: string]: EntryFragment | CreateEntryErrorFragment;
      }
    | IdToUpdateEntrySyncErrorMap,
  update?: true,
) {
  const successState = state as EntriesDataSuccessSate;

  if (state.value === StateValue.fail) {
    const [entry] = Object.values(
      payload as {
        [entryId: string]: EntryFragment;
      },
    );

    if (entry.__typename === "Entry") {
      successState.value = StateValue.success;

      successState.success = {
        context: {
          entries: [
            {
              entryData: entry,
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
        key: "fetchEntriesEffect",
        ownArgs: {},
      });
    }

    return;
  }

  const {
    context: { entries },
  } = successState.success;

  const entryErrors: IndexToEntryErrorsList = [];
  const len = entries.length;
  let i = 0;
  let hasErrors = false;

  for (; i < len; i++) {
    const daten = entries[i];
    const { id } = daten.entryData;
    const updated = payload[id];

    if (!updated) {
      continue;
    }

    const updatedEntry = updated as EntryFragment;
    const createdErrors = updated as CreateEntryErrorFragment;
    const updateErrors = updated as UpdateEntrySyncErrors;

    if (updatedEntry.__typename === "Entry") {
      daten.entryData = updatedEntry;

      daten.entrySyncError = update ? undefined : daten.entrySyncError;
    } else if (createdErrors.__typename === "CreateEntryError") {
      daten.entrySyncError = createdErrors;
      processCreateEntriesErrors(entryErrors, createdErrors, i);
      hasErrors = true;
    } else {
      daten.entrySyncError = updateErrors;
      processUpdateEntriesErrors(entryErrors, updateErrors, i);
      hasErrors = true;
    }
  }

  return hasErrors ? entryErrors : undefined;
}

// ====================================================
// END STATE UPDATE HELPERS SECTION
// ====================================================

// ====================================================
// START EFFECT SECTIONS
// ====================================================

const fetchEntriesEffect: DefFetchEntriesEffect["func"] = async (
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
      type: ActionType.entries_received,
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
        type: ActionType.entries_received,
        ...processedEntries,
      });
    } else {
      dispatch({
        type: ActionType.entries_received,
        key: StateValue.fail,
        error: error as ApolloError,
      });
    }
  } catch (error) {
    dispatch({
      type: ActionType.entries_received,
      key: StateValue.fail,
      error: error,
    });
  }
};

type DefFetchEntriesEffect = EffectDefinition<
  "fetchEntriesEffect",
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
            type: ActionType.on_close_new_entry_created_notification,
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
  fetchEntriesEffect,
  postOfflineEntriesSyncEffect,
  deleteCreateEntrySyncErrorEffect,
  deleteEntryEffect,
  scrollDocToTopEffect,
  parentEffects,
};

function getEffects(proxy: DraftState) {
  return getGeneralEffects<EffectType, DraftState>(proxy);
}

function processEntriesQuery(
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

function processCreateEntriesErrors(
  entryErrors: IndexToEntryErrorsList,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { __typename, meta, dataObjects, ...errors }: CreateEntryErrorFragment,
  index: number,
) {
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

  return entryErrors;
}

function processUpdateEntriesErrors(
  entryErrors: IndexToEntryErrorsList,
  data: UpdateEntrySyncErrors,
  index: number,
) {
  const processedErrors: EntryErrorsList = {};
  entryErrors.push([index + 1, processedErrors]);

  if ("string" === typeof data) {
    processedErrors.others = [["", data]];
  } else {
    processedErrors.dataObjects = processDataObjectsErrors(
      Object.values(data) as DataObjectErrorFragment[],
    );
  }
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
      type: ActionType.delete_entry,
      key: StateValue.cancelled,
    });
  }, closeNotification);

  dispatch({
    type: ActionType.delete_entry,
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
      type: ActionType.delete_entry,
      key: StateValue.cancelled,
    });
  }, closeNotification);

  dispatch({
    type: ActionType.delete_entry,
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
    entries: EntriesData;
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

type EntriesData = EntriesDataSuccessSate | EntriesDataFailureState;

type DataContextError = {
  value: "pagingError" | "fetchError";
  error: string;
};

export type EntriesDataSuccessSate = {
  value: SuccessVal;
  success: {
    context: {
      entries: DataStateContextEntries;
      pageInfo: PageInfoFragment;
      error?: DataContextError;
    };
  };
};

type DataStateContextEntries = DataStateContextEntry[];

type DataStateContextEntry = {
  entryData: EntryFragment;
  entrySyncError?: CreateEntryErrorFragment | UpdateEntrySyncErrors;
};

export type EntriesDataFailureState = {
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
      type: ActionType.toggle_upsert_entry_active;
    } & UpsertActivePayload)
  | ({
      type: ActionType.on_upsert_entry_success;
    } & OnEntryCreatedPayload)
  | {
      type: ActionType.on_close_new_entry_created_notification;
    }
  | ({
      type: ActionType.record_timeout;
    } & SetTimeoutPayload)
  | {
      type: ActionType.re_fetch_entries;
    }
  | ({
      type: ActionType.entries_received;
    } & (ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload))
  | {
      type: ActionType.fetch_next_entries;
    }
  | ({
      type: ActionType.menus;
    } & MenusPayload)
  | ({
      type: ActionType.delete_entry;
    } & DeleteEntryPayload)
  | ({
      type: ActionType.from_parent_post_actions;
    } & ParentPostActionPayload);

export type EntriesRemoteAction =
  | {
      type: EntriesRemoteActionType.upsert;
    }
  | {
      type: EntriesRemoteActionType.hide_menus;
    };

type ParentPostActionPayload = {
  actions: EntriesRemoteAction[];
};

type DeleteEntryPayload =
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

type ProcessedEntriesQueryErrorReturnVal = {
  key: FailVal;
  error: string | Error;
};

type ProcessedEntriesQuerySuccessReturnVal = {
  key: SuccessVal;
  entries: DataStateContextEntries;
  pageInfo: PageInfoFragment;
};

export type ProcessedEntriesQueryReturnVal =
  | ProcessedEntriesQuerySuccessReturnVal
  | ProcessedEntriesQueryErrorReturnVal;

export type UpsertActivePayload = {
  updatingEntry?: UpdatingPayload & {
    index: number;
  };
};

interface OnEntryCreatedPayload {
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

export type CallerProps = {
  experience: ExperienceDetailViewFragment;
  entriesData: ProcessedEntriesQueryReturnVal;
  postActions: EntriesRemoteAction[];
  syncErrors?: ExperienceSyncError;
  parentDispatch: ParentDispatchType;
};

export type Props = CallerProps &
  UpdateExperiencesMutationProps & {
    componentTimeoutsMs: ComponentTimeoutsMs;
  };

export type EffectType =
  | DefTimeoutsEffect
  | DefFetchEntriesEffect
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
