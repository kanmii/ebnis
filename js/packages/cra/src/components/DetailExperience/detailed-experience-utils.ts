import { ApolloError } from "@apollo/client";
import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataDefinitionFragment } from "@eb/cm/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectErrorFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectErrorFragment";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import {
  GetEntriesUnionFragment,
  GetEntriesUnionFragment_GetEntriesSuccess,
} from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { GetExperienceAndEntriesDetailView } from "@eb/cm/src/graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { GetExperienceCommentsErrorsFragment_errors } from "@eb/cm/src/graphql/apollo-types/GetExperienceCommentsErrorsFragment";
import { PaginationInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { PageInfoFragment } from "@eb/cm/src/graphql/apollo-types/PageInfoFragment";
import { toGetEntriesSuccessQuery } from "@eb/cm/src/graphql/utils.gql";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import immer from "immer";
import { Dispatch, Reducer } from "react";
import { match, RouteChildrenProps } from "react-router-dom";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../../apollo/delete-experience-cache";
import {
  getCachedEntriesDetailView,
  getCachedExperienceAndEntriesDetailView,
  readExperienceCompleteFragment,
  writeCachedEntriesDetailView,
  writeCachedExperienceCompleteFragment,
} from "../../apollo/get-detailed-experience-query";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  getSyncError,
  putOfflineExperienceIdInSyncFlag,
  putOrRemoveSyncError,
} from "../../apollo/sync-to-server-cache";
import {
  getOnlineStatus,
  getUnsyncedExperience,
  removeUnsyncedExperiences,
} from "../../apollo/unsynced-ledger";
import { purgeEntry } from "../../apollo/update-get-experiences-list-view-query";
import { wrapReducer, wrapState } from "../../logger";
import { deleteObjectKey } from "../../utils";
import {
  DATA_FETCHING_FAILED,
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
  DeleteExperiencesComponentProps,
  getEntriesDetailView,
  GetEntriesDetailViewQueryResult,
  getExperienceAndEntriesDetailView,
  getExperienceComments,
  GetExperienceCommentsQueryResult,
} from "../../utils/experience.gql.types";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { ChangeUrlType, windowChangeUrl } from "../../utils/global-window";
import { isOfflineId } from "../../utils/offlines";
import { scrollIntoView } from "../../utils/scroll-into-view";
import {
  IdToUpdateEntrySyncErrorMap,
  OfflineIdToCreateEntrySyncErrorMap,
  OfflineIdToOnlineExperienceMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnSyncedData,
  SyncError,
  UpdateEntrySyncErrors,
} from "../../utils/sync-to-server.types";
import {
  CLOSE_NOTIFICATION_TIMEOUT_MS,
  FETCH_EXPERIENCES_TIMEOUTS,
} from "../../utils/timers";
import {
  ActiveVal,
  CancelledVal,
  CommonError,
  DataVal,
  DeletedVal,
  DeleteSuccess,
  EmptyVal,
  ErrorsVal,
  FailVal,
  FetchEntriesErrorVal,
  InActiveVal,
  InitialVal,
  KeyOfTimeouts,
  LoadingState,
  OnlineStatus,
  ReFetchOnly as ReFetchOnlyVal,
  RequestedVal,
  StateValue,
  SuccessVal,
  Timeouts,
} from "../../utils/types";
import {
  DetailExperienceRouteMatch,
  makeDetailedExperienceRoute,
  MY_URL,
} from "../../utils/urls";
import { nonsenseId } from "../../utils/utils.dom";
import { entryToEdge } from "../UpsertEntry/entry-to-edge";
import { UpdatingEntryPayload } from "../UpsertEntry/upsert-entry.utils";
import { updateExperienceOfflineFn } from "../UpsertExperience/upsert-experience.resolvers";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../WithSubscriptions/with-subscriptions.utils";
import { scrollDocumentToTop } from "./detail-experience.injectables";

export enum CommentAction {
  CREATE = "@detailed-experience/comment/create",
  SHOW = "@detailed-experience/comment/show",
  HIDE = "@detailed-experience/comment/hide",
  DELETE = "@detailed-experience/comment/delete",
  CLOSE_NOTIFICATION = "@detailed-experience/comment/close-notification",
  CLOSE_UPSERT_UI = "@detailed-experience/comment/close-upsert-ui",
  TOGGLE_MENU = "@detailed-experience/comment/toggle-menu",
}

export enum ActionType {
  TOGGLE_UPSERT_ENTRY_ACTIVE = "@detailed-experience/toggle-upsert-entry",
  ON_UPSERT_ENTRY_SUCCESS = "@detailed-experience/on-upsert-entry-success",
  ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION = "@detailed-experience/on-close-upsert-entry-created-notification",
  RECORD_TIMEOUT = "@detailed-experience/record-timeout",
  DELETE_EXPERIENCE_REQUEST = "@detailed-experience/delete-experience-request",
  DELETE_EXPERIENCE_CANCELLED = "@detailed-experience/delete-experience-cancelled",
  DELETE_EXPERIENCE_CONFIRMED = "@detailed-experience/delete-experience-confirmed",
  TOGGLE_EXPERIENCE_MENU = "@detailed-experience/toggle-experience-menu",
  ON_DATA_RECEIVED = "@detailed-experience/on-data-received",
  RE_FETCH_EXPERIENCE = "@detailed-experience/re-fetch-experience",
  RE_FETCH_ENTRIES = "@detailed-experience/re-fetch-entries",
  FETCH_NEXT_ENTRIES = "@detailed-experience/fetch-next-entries",
  ENTRIES_RECEIVED = "@detailed-experience/on-entries-received",
  REQUEST_UPDATE_EXPERIENCE_UI = "@detailed-experience/request-update-experience-ui",
  ON_SYNC = "@detailed-experience/on-sync",
  CLOSE_SYNC_ERRORS_MSG = "@detailed-experience/close-sync-errors-message",
  ENTRIES_OPTIONS = "@detailed-experience/entries-options",
  DELETE_ENTRY = "@detailed-experience/delete-entry",
  ON_COMMENTS_FETCHED = "@detailed-experience/on-comments-fetched",
  COMMENT_ACTION = "@detailed-experience/comment-action",
  ON_UPSERT_COMMENT = "@detailed-experience/on-upsert-comment",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (states) => {
      const proxy = states as StateMachine;
      proxy.effects.general.value = StateValue.noEffect;
      deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

      switch (type) {
        case ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE:
          handleToggleUpsertEntryActiveAction(
            proxy,
            payload as UpsertEntryActivePayload,
          );
          break;

        case ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION:
          handleOnCloseNewEntryCreatedNotification(proxy);
          break;

        case ActionType.RECORD_TIMEOUT:
          handleRecordTimeoutAction(proxy, payload as SetTimeoutPayload);
          break;

        case ActionType.DELETE_EXPERIENCE_REQUEST:
          handleDeleteExperienceRequestAction(
            proxy,
            payload as DeleteExperienceRequestPayload,
          );
          break;

        case ActionType.DELETE_EXPERIENCE_CANCELLED:
          handleDeleteExperienceCancelledAction(proxy);
          break;

        case ActionType.DELETE_EXPERIENCE_CONFIRMED:
          handleDeleteExperienceConfirmedAction(proxy);
          break;

        case ActionType.TOGGLE_EXPERIENCE_MENU:
          handleToggleExperienceMenuAction(proxy, payload as ToggleMenuPayload);
          break;

        case ActionType.ON_DATA_RECEIVED:
          handleOnDataReceivedAction(proxy, payload as OnDataReceivedPayload);
          break;

        case ActionType.RE_FETCH_EXPERIENCE:
          handleRefetchExperienceAction(proxy);
          break;

        case ActionType.RE_FETCH_ENTRIES:
          handleRefetchEntriesAction(proxy);
          break;

        case ActionType.ENTRIES_RECEIVED:
          handleEntriesReceivedAction(
            proxy,
            payload as ProcessedEntriesQueryReturnVal,
          );
          break;

        case ActionType.FETCH_NEXT_ENTRIES:
          handleFetchNextEntriesAction(proxy);
          break;

        case ActionType.REQUEST_UPDATE_EXPERIENCE_UI:
          handleUpdateExperienceUiRequestAction(
            proxy,
            payload as UpdateExperiencePayload,
          );
          break;

        case ActionType.ON_SYNC:
          handleOnSyncAction(proxy, payload as OnSyncedData);
          break;

        case ActionType.ON_UPSERT_ENTRY_SUCCESS:
          handleOnUpsertEntrySuccessAction(
            proxy,
            payload as OnEntryCreatedPayload,
          );
          break;

        case ActionType.CLOSE_SYNC_ERRORS_MSG:
          handleCloseSyncErrorsMsgAction(proxy);
          break;

        case ActionType.ENTRIES_OPTIONS:
          handleEntriesOptionsAction(proxy, payload as EntriesOptionsPayload);
          break;

        case ActionType.DELETE_ENTRY:
          handleDeleteEntryAction(proxy, payload as DeleteEntryPayload);
          break;

        case ActionType.ON_COMMENTS_FETCHED:
          handleOnCommentsFetchedAction(
            proxy,
            payload as CommentsReceivedPayload,
          );
          break;

        case ActionType.COMMENT_ACTION:
          handleCommentAction(proxy, payload as CommentActionPayload);
          break;

        case ActionType.ON_UPSERT_COMMENT:
          handleOnUpsertCommentAction(
            proxy,
            payload as OnCommentCreatedPayload,
          );
          break;
      }
    });
  });

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(): StateMachine {
  const state = {
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
    states: {
      value: StateValue.loading,
    },
    timeouts: {},
  };

  return wrapState(state);
}

function handleToggleUpsertEntryActiveAction(
  proxy: StateMachine,
  payload: UpsertEntryActivePayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states,
      context: { syncErrors },
    } = globalStates.data;
    const { updatingEntry } = payload;

    const {
      upsertEntryActive: { value },
    } = states;

    if (updatingEntry) {
      const state = states.upsertEntryActive as UpsertEntryActive;
      state.value = StateValue.active;
      state.active = {
        context: {
          updatingEntry: updatingEntry,
        },
      };

      return;
    }

    if (value === StateValue.active) {
      states.upsertEntryActive.value = StateValue.inactive;
      return;
    }

    if (syncErrors) {
      states.syncErrorsMsg.value = StateValue.active;
      return;
    }

    const state = states.upsertEntryActive as UpsertEntryActive;
    state.value = StateValue.active;
    state.active = {
      context: {},
    };
  }
}

function handleOnCloseNewEntryCreatedNotification(proxy: StateMachine) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.entryNotification.value = StateValue.inactive;

    const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        clear: timeouts.genericTimeout,
      },
    });

    delete timeouts.genericTimeout;
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

function handleDeleteExperienceRequestAction(
  proxy: StateMachine,
  payload: DeleteExperienceRequestPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
    } = globalStates.data;

    deleteExperience.value = StateValue.active;
    const deleteExperienceActive = deleteExperience as DeleteExperienceActiveState;

    deleteExperienceActive.active = {
      context: {
        key: payload.key,
      },
    };
  }
}

function handleDeleteExperienceCancelledAction(proxy: StateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
      context: { experience },
    } = globalStates.data;

    const deleteExperienceActive = deleteExperience as DeleteExperienceActiveState;

    // istanbul ignore else:
    if (deleteExperienceActive.value === StateValue.active) {
      deleteExperience.value = StateValue.inactive;
      const effects = getGeneralEffects(proxy);

      effects.push({
        key: "cancelDeleteExperienceEffect",
        ownArgs: {
          key: deleteExperienceActive.active.context.key,
          experience,
        },
      });
    }
  }
}

function handleDeleteExperienceConfirmedAction(proxy: StateMachine) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const effects = getGeneralEffects(proxy);
    effects.push({
      key: "deleteExperienceEffect",
      ownArgs: {
        experienceId: states.data.context.experience.id,
      },
    });
  }
}

function handleToggleExperienceMenuAction(
  proxy: StateMachine,
  payload: ToggleMenuPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { showingOptionsMenu, entriesOptions },
    } = globalStates.data;

    entriesOptions.value = StateValue.inactive;

    if (payload.key) {
      // istanbul ignore else:
      if (payload.key === "close") {
        showingOptionsMenu.value = StateValue.inactive;
      }

      return;
    }

    showingOptionsMenu.value =
      showingOptionsMenu.value === StateValue.inactive
        ? StateValue.active
        : StateValue.inactive;
  }
}

function handleOnDataReceivedAction(
  proxy: StateMachine,
  payload: OnDataReceivedPayload,
) {
  const { states } = proxy;
  const effects = getGeneralEffects(proxy);
  const { experienceData, syncErrors } = payload;

  switch (experienceData.key) {
    case StateValue.data:
      {
        const { experience, entriesData, onlineStatus } = experienceData;

        const dataState = states as DataState;
        dataState.value = StateValue.data;

        const dataStateData = dataState.data || ({} as DataState["data"]);

        dataState.data = dataStateData;

        const context = dataStateData.context || ({} as DataStateContext);

        dataStateData.context = context;
        context.experience = experience;
        processSyncErrors(context, syncErrors);
        context.onlineStatus = onlineStatus;

        context.dataDefinitionIdToNameMap = makeDataDefinitionIdToNameMap(
          experience.dataDefinitions,
        );

        dataStateData.states = {
          updateExperienceUiActive: {
            value: StateValue.inactive,
          },
          upsertEntryActive: {
            value: StateValue.inactive,
          },
          notification: {
            value: StateValue.inactive,
          },
          entryNotification: {
            value: StateValue.inactive,
          },
          deleteExperience: {
            value: StateValue.inactive,
          },
          showingOptionsMenu: {
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

          syncErrorsMsg: {
            value: StateValue.inactive,
          },
          entriesOptions: {
            value: StateValue.inactive,
          },
          comment: {
            value: StateValue.initial,
          },

          upsertComment: {
            value: StateValue.inactive,
          },

          commentNotification: {
            value: StateValue.inactive,
          },
        };

        effects.push({
          key: "deleteExperienceRequestedEffect",
          ownArgs: {
            experienceId: experience.id,
          },
        });
      }
      break;

    case StateValue.errors:
      {
        states.value = StateValue.errors;
        const errorsState = states as ErrorState;
        errorsState.errors = {
          context: {
            error: parseStringError(experienceData.error),
          },
        };
      }
      break;
  }
}

function handleRefetchExperienceAction(proxy: StateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleRefetchEntriesAction(proxy: StateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    // istanbul ignore else
    if (states.entries.value !== StateValue.success) {
      const effects = getGeneralEffects(proxy);

      effects.push({
        key: "fetchEntriesEffect",
        ownArgs: {},
      });
    }
  }
}

function handleFetchNextEntriesAction(proxy: StateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    // istanbul ignore else
    if (states.entries.value === StateValue.success) {
      const {
        hasNextPage,
        endCursor,
      } = states.entries.success.context.pageInfo;

      // istanbul ignore else
      if (hasNextPage) {
        const effects = getGeneralEffects(proxy);

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
}

function handleEntriesReceivedAction(
  proxy: StateMachine,
  payload: ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    const entriesState = states.entries;

    switch (entriesState.value) {
      case StateValue.success:
        {
          const { context } = entriesState.success;

          switch (payload.key) {
            case StateValue.success:
              context.pageInfo = payload.pageInfo;
              context.entries = [...context.entries, ...payload.entries];
              break;

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
              context.pagingError = parseStringError(payload.error);
              break;
          }
        }
        break;

      case StateValue.fail:
        switch (payload.key) {
          case StateValue.success:
            {
              const entriesSuccessState = states.entries as EntriesDataSuccessSate;

              entriesSuccessState.value = StateValue.success;
              entriesSuccessState.success = {
                context: {
                  entries: payload.entries,
                  pageInfo: payload.pageInfo,
                },
              };
            }
            break;

          case StateValue.reFetchOnly:
            {
              const { entries } = payload;

              const { data } = processEntriesQuery(
                toGetEntriesSuccessQuery(entries),
              );

              const fetchEntriesErrorState = states.entries as FetchEntriesErrorState;

              fetchEntriesErrorState.value = StateValue.fetchEntriesError;

              fetchEntriesErrorState.fetchEntriesError = {
                context: {
                  entries: (data as ProcessedEntriesQuerySuccessReturnVal)
                    .entries,
                  fetchError: (states.entries as EntriesDataFailureState).error,
                },
              };
            }
            break;
        }
        break;

      case StateValue.fetchEntriesError:
        if (payload.key === StateValue.success) {
          const entriesSuccessState = states.entries as EntriesDataSuccessSate;

          entriesSuccessState.value = StateValue.success;

          entriesSuccessState.success = {
            context: {
              entries: payload.entries,
              pageInfo: payload.pageInfo,
            },
          };
        } else {
          entriesState.fetchEntriesError.context.fetchError = parseStringError(
            (payload as ProcessedEntriesQueryErrorReturnVal).error,
          );
        }
        break;
    }
  }
}

function handleUpdateExperienceUiRequestAction(
  proxy: StateMachine,
  { experience, onlineStatus }: UpdateExperiencePayload,
) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      context,
      states: { updateExperienceUiActive: state, syncErrorsMsg },
    } = globalStates.data;

    const modifiedState = state;
    const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

    if (state.value === StateValue.success) {
      modifiedState.value = StateValue.inactive;

      effects.push({
        key: "timeoutsEffect",
        ownArgs: {
          clear: timeouts.genericTimeout,
        },
      });

      delete timeouts.genericTimeout;

      return;
    }

    if (experience) {
      modifiedState.value = StateValue.success;
      context.experience = experience;
      context.onlineStatus = onlineStatus as OnlineStatus;

      context.dataDefinitionIdToNameMap = makeDataDefinitionIdToNameMap(
        experience.dataDefinitions,
      );

      effects.push(
        {
          key: "fetchEntriesEffect",
          ownArgs: {
            reFetchFromCache: true,
          },
        },

        {
          key: "timeoutsEffect",
          ownArgs: {
            set: "set-close-update-experience-success-notification",
          },
        },
      );

      return;
    }

    syncErrorsMsg.value = StateValue.inactive;

    if (state.value === StateValue.inactive) {
      modifiedState.value = StateValue.active;
    } else {
      modifiedState.value = StateValue.inactive;
    }
  }
}

function handleOnSyncAction(proxy: StateMachine, payload: OnSyncedData) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

    const {
      context,
      states: { entries: entriesState },
    } = globalStates.data;
    const {
      offlineIdToOnlineExperienceMap,
      onlineExperienceIdToOfflineEntriesMap,
      syncErrors,
      onlineExperienceUpdatedMap,
    } = payload;

    const {
      experience: { id },
      syncErrors: contextSyncErrors,
    } = context;

    if (offlineIdToOnlineExperienceMap) {
      const data = {
        ...offlineIdToOnlineExperienceMap,
      };
      const ownArgs: DefPostOfflineExperiencesSyncEffect["ownArgs"] = {
        data,
      };

      const onlineExperience = offlineIdToOnlineExperienceMap[id];

      if (onlineExperience) {
        // Offline experience now synced

        // this offline experience will be purged upon navigation to related
        // online experience, hence deletion here
        const offlineExperienceId = id;

        ownArgs.onlineIdToOffline = [onlineExperience.id, offlineExperienceId];

        delete data[offlineExperienceId];
      }

      effects.push({
        key: "postOfflineExperiencesSyncEffect",
        ownArgs,
      });
    }

    if (onlineExperienceIdToOfflineEntriesMap) {
      const offlineIdToOnlineEntryMap =
        onlineExperienceIdToOfflineEntriesMap[id];

      // we have offline entries from online experience now synced
      // istanbul ignore else:
      if (offlineIdToOnlineEntryMap) {
        updateEntriesFn(proxy, entriesState, offlineIdToOnlineEntryMap);
      }

      effects.push({
        key: "postOfflineEntriesSyncEffect",
        ownArgs: {
          data: onlineExperienceIdToOfflineEntriesMap,
        },
      });
    }

    const errors = syncErrors && syncErrors[id];

    if (errors) {
      const { createEntries, updateEntries } = errors;
      let entriesErrors: undefined | IndexToEntryErrorsList = undefined;

      if (createEntries) {
        entriesErrors = updateEntriesFn(proxy, entriesState, createEntries);
      }
      // istanbul ignore else:
      if (updateEntries) {
        entriesErrors = updateEntriesFn(proxy, entriesState, updateEntries);
      }

      if (entriesErrors) {
        context.syncErrors = {
          ...(contextSyncErrors || {}),
          entriesErrors,
        };
      }
    }

    const isOnline =
      onlineExperienceUpdatedMap && onlineExperienceUpdatedMap[id];

    if (isOnline) {
      context.onlineStatus = StateValue.online;
    }
  }
}

function handleOnUpsertEntrySuccessAction(
  proxy: StateMachine,
  payload: OnEntryCreatedPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states, context } = globalStates.data;

    const {
      experience: { id: experienceId },
    } = context;

    const {
      upsertEntryActive,
      notification,
      entryNotification,
      entries: entriesState,
    } = states;

    upsertEntryActive.value = StateValue.inactive;
    notification.value = StateValue.inactive;

    const {
      oldData,
      newData: { entry: newEntry, onlineStatus: newOnlineStatus },
    } = payload;

    context.onlineStatus = newOnlineStatus;

    const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        set: "set-close-upsert-entry-created-notification",
      },
    });

    // completely new entry created online
    if (!oldData) {
      const newEntryState = entryNotification as EntryNotificationState;

      newEntryState.value = StateValue.active;

      newEntryState.active = {
        context: {
          message: `New entry created on: ${formatDatetime(
            newEntry.updatedAt,
          )}`,
        },
      };

      effects.push({
        key: "scrollDocToTopEffect",
        ownArgs: {},
      });

      switch (entriesState.value) {
        case StateValue.success:
        case StateValue.fetchEntriesError:
          {
            const { context } = getEntriesState(entriesState);

            context.entries.unshift({
              entryData: newEntry,
            });
          }
          break;

        case StateValue.fail:
          {
            const fetchEntriesError = states.entries as FetchEntriesErrorState;

            fetchEntriesError.value = StateValue.fetchEntriesError;
            fetchEntriesError.fetchEntriesError = {
              context: {
                entries: [
                  {
                    entryData: newEntry,
                  },
                ],
                fetchError: entriesState.error,
              },
            };
          }
          break;
      }
    } else {
      // updated entry: either offline entry synced / online entry updated
      const { entry, index } = oldData;
      const { id } = entry;
      const { syncErrors } = context;

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

          // istanbul ignore else:
          if (!Object.keys(syncErrors).length) {
            context.syncErrors = undefined;
          }
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
}

function handleCloseSyncErrorsMsgAction(proxy: StateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.syncErrorsMsg.value = StateValue.inactive;
  }
}

function handleEntriesOptionsAction(
  proxy: StateMachine,
  { entry }: EntriesOptionsPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { entriesOptions, showingOptionsMenu },
    } = globalStates.data;

    showingOptionsMenu.value = StateValue.inactive;

    const activeState = entriesOptions as EntriesOptionActive;
    const inactiveState = entriesOptions as EntriesOptionInactive;

    const { id } = entry;

    // menus currently inactive, show menu
    if (entriesOptions.value === StateValue.inactive) {
      activeState.value = StateValue.active;
      activeState.active = {
        id,
      };
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
}

function handleDeleteEntryAction(
  proxy: StateMachine,
  payload: DeleteEntryPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { entriesOptions, entries },
      context: { experience },
    } = globalStates.data;

    switch (payload.key) {
      case StateValue.requested:
        {
          const { entry } = payload;
          const state = entriesOptions as EntriesOptionDeleteRequested;
          state.value = StateValue.requested;
          state.requested = {
            entry,
          };
        }
        break;

      case StateValue.cancelled:
        {
          entriesOptions.value = StateValue.inactive;

          const { genericTimeout } = proxy.timeouts;

          if (genericTimeout) {
            const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

            effects.push({
              key: "timeoutsEffect",
              ownArgs: {
                clear: genericTimeout,
              },
            });

            delete proxy.timeouts.genericTimeout;
          }
        }
        break;

      case StateValue.deleted:
        {
          const neutralState = entriesOptions;

          if (entriesOptions.value === StateValue.requested) {
            neutralState.value = StateValue.inactive;
            const deletingEntry = entriesOptions.requested.entry;

            const effects = getGeneralEffects<EffectType, StateMachine>(proxy);
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
          entriesOptions.value = StateValue.deleteSuccess;
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
          entriesOptions.value = StateValue.errors;
          const { error, timeoutId } = payload;

          proxy.timeouts.genericTimeout = timeoutId;

          const state = entriesOptions as EntryDeleteFail;
          state.errors = {
            error: parseStringError(error),
          };
        }
        break;
    }
  }
}

function getExperienceId(props: Props) {
  return (props.match as Match).params.experienceId;
}

function makeDataDefinitionIdToNameMap(definitions: DataDefinitionFragment[]) {
  return definitions.reduce((acc, d) => {
    acc[d.id] = d.name;
    return acc;
  }, {} as DataDefinitionIdToNameMap);
}

function updateEntriesFn(
  proxy: StateMachine,
  state: EntriesData,
  payload:
    | {
        [entryId: string]: EntryFragment | CreateEntryErrorFragment;
      }
    | IdToUpdateEntrySyncErrorMap,
  update?: true,
) {
  const fetchEntriesErrorState = state as FetchEntriesErrorState;

  if (state.value === StateValue.fail) {
    const [entry] = Object.values(
      payload as {
        [entryId: string]: EntryFragment;
      },
    );

    if (entry.__typename === "Entry") {
      fetchEntriesErrorState.value = StateValue.fetchEntriesError;

      fetchEntriesErrorState.fetchEntriesError = {
        context: {
          entries: [
            {
              entryData: entry,
            },
          ],
          fetchError: state.error,
        },
      };

      const effects = getGeneralEffects<EffectType, StateMachine>(proxy);
      effects.push({
        key: "fetchEntriesEffect",
        ownArgs: {},
      });
    }

    return;
  }

  const {
    context: { entries },
  } = getEntriesState(state);

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

function processSyncErrors(
  context: DataStateContext,
  syncErrors?: ExperienceSyncError,
) {
  if (!syncErrors) {
    return;
  }

  syncErrors = { ...syncErrors };

  const { definitions, ownFields } = syncErrors;

  if (definitions) {
    const list: FieldError = [];
    syncErrors.definitionsErrors = list;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(definitions).forEach(([, { __typename, id, ...errors }]) => {
      Object.entries(errors).forEach(([k, v]) => {
        if (v) {
          list.push([k, v]);
        }
      });
    });

    delete syncErrors.definitions;
  }

  if (ownFields) {
    const list: FieldError = [];
    syncErrors.ownFieldsErrors = list;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __typename, ...errors } = ownFields;

    Object.entries(errors).forEach(([k, v]) => {
      if (v) {
        list.push([k, v]);
      }
    });

    delete syncErrors.ownFields;
  }

  context.syncErrors = syncErrors;
}

function getEntriesState(
  state: EntriesDataSuccessSate | FetchEntriesErrorState,
) {
  let ob = (undefined as unknown) as
    | EntriesDataSuccessSate["success"]
    | FetchEntriesErrorState["fetchEntriesError"];

  if (state.value === StateValue.success) {
    ob = state.success;
  } else if (state.value === StateValue.fetchEntriesError) {
    ob = state.fetchEntriesError;
  }
  return ob;
}

function handleOnCommentsFetchedAction(
  proxy: StateMachine,
  payload: CommentsReceivedPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { comment: commentsState },
    } = globalStates.data;

    switch (payload.value) {
      case StateValue.success:
        {
          const dataState = commentsState as CommentDataSate;
          const emptyState = commentsState as CommentEmptyState;

          const { comments } = payload;

          if (comments.length === 0) {
            emptyState.value = StateValue.empty;
          } else {
            commentsState.value = StateValue.success;

            const success =
              dataState.success ||
              // istanbul ignore next:
              ({
                states: {
                  menu: {
                    value: StateValue.inactive,
                  },
                },
              } as CommentDataSate["success"]);

            dataState.success = success;

            success.context = {
              comments,
            };
          }
        }
        break;

      case StateValue.errors:
        {
          const errorState = commentsState as CommentErrorState;
          errorState.value = StateValue.errors;
          const { errors } = payload;

          errorState.errors = {
            context: {
              error: errors.error,
            },
          };
        }
        break;
    }
  }
}

function handleCommentAction(
  proxy: StateMachine,
  payload: CommentActionPayload,
) {
  const { states: globalStates } = proxy;
  const { action } = payload;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: {
        comment: commentsState,
        showingOptionsMenu,
        upsertComment,
        commentNotification,
      },
    } = globalStates.data;

    commentNotification.value = StateValue.inactive;
    showingOptionsMenu.value = StateValue.inactive;

    switch (action) {
      case CommentAction.SHOW: {
        const effects = getGeneralEffects(proxy);

        effects.push({
          key: "fetchCommentsEffect",
          ownArgs: {},
        });

        return;
      }

      case CommentAction.HIDE: {
        const c = (commentsState as unknown) as CommentInitialState;
        c.value = StateValue.initial;

        return;
      }

      case CommentAction.CREATE: {
        upsertComment.value = StateValue.active;

        return;
      }

      case CommentAction.CLOSE_NOTIFICATION: {
        commentNotification.value = StateValue.inactive;
        return;
      }

      case CommentAction.CLOSE_UPSERT_UI: {
        upsertComment.value = StateValue.inactive;
        return;
      }
    }
  }
}

function handleOnUpsertCommentAction(
  proxy: StateMachine,
  payload: OnCommentCreatedPayload,
) {
  const { data: comment } = payload;
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { comment: commentsState, upsertComment },
    } = globalStates.data;

    const dataState = commentsState as CommentDataSate;
    upsertComment.value = StateValue.inactive;

    switch (commentsState.value) {
      case StateValue.success:
        {
          commentsState.success.context.comments.unshift(comment);
          commentCreated(proxy);
        }
        break;

      case StateValue.empty:
      case StateValue.initial:
        {
          dataState.value = StateValue.success;

          dataState.success = {
            context: {
              comments: [comment],
            },
          };

          commentCreated(proxy);
        }
        break;
    }
  }
}

// ====================================================
// START STATE UPDATE HELPERS SECTION
// ====================================================

function commentCreated(proxy: StateMachine) {
  const { states } = proxy;
  const globalStates = states as DataState;

  const {
    states: { commentNotification },
  } = globalStates.data;

  const active = commentNotification as CommentNotificationState;

  active.value = StateValue.active;
  active.active = {
    context: {
      message: "Comment created successfully!",
    },
  };

  const effects = getGeneralEffects(proxy);

  effects.push(
    {
      key: "scrollDocToTopEffect",
      ownArgs: {},
    },

    {
      key: "timeoutsEffect",
      ownArgs: {
        set: "set-close-comment-notification",
      },
    },
  );
}

// ====================================================
// END STATE UPDATE HELPERS SECTION
// ====================================================

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

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
            type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
          });
        };

        break;

      case "set-close-update-experience-success-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
          });
        };

        break;

      case "set-close-comment-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.COMMENT_ACTION,
            action: CommentAction.CLOSE_NOTIFICATION,
          });
        };

        break;
    }

    const timeoutId = setTimeout(timeoutCb, closeNotificationTimeout);

    dispatch({
      type: ActionType.RECORD_TIMEOUT,
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

const deleteExperienceRequestedEffect: DefDeleteExperienceRequestedEffect["func"] = (
  { experienceId },
  _,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const deleteExperienceLedger = getDeleteExperienceLedger(experienceId);

  if (
    deleteExperienceLedger &&
    deleteExperienceLedger.key === StateValue.requested
  ) {
    putOrRemoveDeleteExperienceLedger();

    dispatch({
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: deleteExperienceLedger.key,
    });
  }
};

type DefDeleteExperienceRequestedEffect = EffectDefinition<
  "deleteExperienceRequestedEffect",
  {
    experienceId: string;
  }
>;

const cancelDeleteExperienceEffect: DefCancelDeleteExperienceEffect["func"] = (
  { key, experience: { id, title } },
  props,
) => {
  if (key) {
    const { history } = props;

    putOrRemoveDeleteExperienceLedger({
      key: StateValue.cancelled,
      id,
      title,
    });

    history.push(MY_URL);
  }
};

type DefCancelDeleteExperienceEffect = EffectDefinition<
  "cancelDeleteExperienceEffect",
  {
    experience: ExperienceDetailViewFragment;
    key: string;
  }
>;

const deleteExperienceEffect: DefDeleteExperienceEffect["func"] = async (
  { experienceId },
  props,
) => {
  const { history, deleteExperiences } = props;

  try {
    const response = await deleteExperiences({
      variables: {
        input: [experienceId],
      },
    });

    const validResponse =
      response && response.data && response.data.deleteExperiences;

    // istanbul ignore next
    if (!validResponse) {
      return;
    }

    // istanbul ignore next
    if (validResponse.__typename === "DeleteExperiencesAllFail") {
      return;
    }

    const experienceResponse = validResponse.experiences[0];

    // istanbul ignore next
    if (experienceResponse.__typename === "DeleteExperienceErrors") {
      return;
    }

    const {
      experience: { id: responseId, title },
    } = experienceResponse;

    putOrRemoveDeleteExperienceLedger({
      id: responseId,
      key: StateValue.deleted,
      title,
    });

    removeUnsyncedExperiences([responseId]);

    const { persistor } = window.____ebnis;
    await persistor.persist();

    history.push(MY_URL);
  } catch (error) {
    //
  }
};

type DefDeleteExperienceEffect = EffectDefinition<
  "deleteExperienceEffect",
  {
    experienceId: string;
  }
>;

const fetchDetailedExperienceEffect: DefFetchDetailedExperienceEffect["func"] = (
  _,
  props,
  { dispatch },
) => {
  const experienceId = getExperienceId(props);
  let fetchExperienceAttemptsCount = 0;
  let timeoutId: null | NodeJS.Timeout = null;
  const timeoutsLen = FETCH_EXPERIENCES_TIMEOUTS.length - 1;

  const cachedResult = getCachedExperienceAndEntriesDetailView(experienceId);

  const offlineId = getAndRemoveOfflineExperienceIdFromSyncFlag(experienceId);

  if (offlineId) {
    cleanUpOfflineExperiences({
      [offlineId]: {} as ExperienceCompleteFragment,
    });
  }

  const syncErrors = getSyncError(experienceId) || undefined;

  if (cachedResult) {
    const daten = cachedResult.data as GetExperienceAndEntriesDetailView;

    const [experienceData, newSyncErrors] = processGetExperienceQuery(
      daten.getExperience,
      daten.getEntries,
      syncErrors,
    );

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      experienceData,
      syncErrors: newSyncErrors,
    });

    return;
  }

  async function fetchDetailedExperience() {
    try {
      const data = await getExperienceAndEntriesDetailView(
        {
          experienceId,
          pagination: {
            first: 10,
          },
        },
        "network-only",
      );

      const daten =
        (data && data.data) || ({} as GetExperienceAndEntriesDetailView);

      const [experienceData, newSyncErrors] = processGetExperienceQuery(
        daten.getExperience || null,
        daten.getEntries,
        syncErrors,
      );

      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        experienceData,
        syncErrors: newSyncErrors,
      });
    } catch (error) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        experienceData: {
          key: StateValue.errors,
          error,
        },
      });
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  function mayBeScheduleFetchDetailedExperience() {
    // we are connected
    if (getIsConnected()) {
      fetchDetailedExperience();
      return;
    }

    // we were never able to connect
    if (fetchExperienceAttemptsCount > timeoutsLen) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        experienceData: {
          key: StateValue.errors,
          error: DATA_FETCHING_FAILED,
        },
      });

      return;
    }

    timeoutId = setTimeout(
      mayBeScheduleFetchDetailedExperience,
      FETCH_EXPERIENCES_TIMEOUTS[fetchExperienceAttemptsCount++],
    );
  }

  mayBeScheduleFetchDetailedExperience();
};

type DefFetchDetailedExperienceEffect = EffectDefinition<"fetchDetailedExperienceEffect">;

const fetchEntriesEffect: DefFetchEntriesEffect["func"] = async (
  { pagination, reFetchFromCache },
  props,
  effectArgs,
) => {
  const experienceId = getExperienceId(props);
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
      type: ActionType.ENTRIES_RECEIVED,
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
        type: ActionType.ENTRIES_RECEIVED,
        ...processedEntries,
      });
    } else {
      dispatch({
        type: ActionType.ENTRIES_RECEIVED,
        key: StateValue.fail,
        error: error as ApolloError,
      });
    }
  } catch (error) {
    dispatch({
      type: ActionType.ENTRIES_RECEIVED,
      key: StateValue.fail,
      error: error,
    });
  }
};

type DefFetchEntriesEffect = EffectDefinition<
  "fetchEntriesEffect",
  {
    pagination?: PaginationInput;
    reFetchFromCache?: boolean;
  }
>;

const postOfflineExperiencesSyncEffect: DefPostOfflineExperiencesSyncEffect["func"] = async ({
  data,
  onlineIdToOffline,
}) => {
  if (Object.keys(data).length) {
    cleanUpOfflineExperiences(data);
  }

  const { persistor } = window.____ebnis;

  if (onlineIdToOffline) {
    const [onlineId] = onlineIdToOffline;

    putOfflineExperienceIdInSyncFlag(onlineIdToOffline);

    setTimeout(() => {
      windowChangeUrl(
        makeDetailedExperienceRoute(onlineId),
        ChangeUrlType.replace,
      );
    });
  }

  await persistor.persist();
};

type DefPostOfflineExperiencesSyncEffect = EffectDefinition<
  "postOfflineExperiencesSyncEffect",
  {
    data: OfflineIdToOnlineExperienceMap;
    onlineIdToOffline?: [string, string];
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
  const { dispatch } = effectArgs;

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
          deleteEntryFailEffectHelper(GENERIC_SERVER_ERROR, dispatch);
          return;
        }

        const entryData = deletedEntries[0];

        if (entryData.__typename === "DeleteEntrySuccess") {
          deleteEntrySuccessEffectHelper(entryData.entry.id, dispatch);
        } else {
          deleteEntryFailEffectHelper(entryData.errors.error, dispatch);
        }
      },
      onError(error) {
        deleteEntryFailEffectHelper(error || GENERIC_SERVER_ERROR, dispatch);
      },
    });
  } else {
    const updatedExperience = updateExperienceOfflineFn({
      experienceId,
      deletedEntry: entry,
    });

    if (updatedExperience) {
      deleteEntrySuccessEffectHelper(id, dispatch);
    } else {
      deleteEntryFailEffectHelper(GENERIC_SERVER_ERROR, dispatch);
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

const fetchCommentsEffect: DefFetchCommentsEffect["func"] = async (
  _,
  props,
  effectArgs,
) => {
  const experienceId = getExperienceId(props);
  const { dispatch } = effectArgs;

  const variables = {
    experienceId,
  };

  const {
    componentTimeoutsMs: { fetchRetries },
  } = props;

  const maybeCachedExperience = readExperienceCompleteFragment(experienceId);

  if (maybeCachedExperience) {
    const { comments } = maybeCachedExperience;

    if (comments && comments.length) {
      dispatch({
        type: ActionType.ON_COMMENTS_FETCHED,
        value: StateValue.success,
        comments: comments as CommentFragment[],
      });

      scrollDocumentToTop();

      return;
    }
  }

  let timeoutId: null | NodeJS.Timeout = null;

  async function fetchOnlineComments() {
    try {
      const { data, error } =
        (await getExperienceComments(variables)) ||
        // istanbul ignore next:
        ({} as GetExperienceCommentsQueryResult);

      if (data) {
        const maybeCommentsData = data.getExperienceComments;

        switch (maybeCommentsData?.__typename) {
          case "GetExperienceCommentsSuccess":
            {
              const { comments } = maybeCommentsData;
              const commentsList = comments as CommentFragment[];

              dispatch({
                type: ActionType.ON_COMMENTS_FETCHED,
                value: StateValue.success,
                comments: commentsList,
              });

              scrollDocumentToTop();

              const cachedExperience = maybeCachedExperience as ExperienceCompleteFragment;

              writeCachedExperienceCompleteFragment({
                ...cachedExperience,
                comments: commentsList,
              });
            }
            break;

          case "GetExperienceCommentsErrors":
            dispatch({
              type: ActionType.ON_COMMENTS_FETCHED,
              value: StateValue.errors,
              errors: maybeCommentsData.errors,
            });
            break;
        }
      } else {
        dispatch({
          type: ActionType.ENTRIES_RECEIVED,
          key: StateValue.fail,
          error: error as ApolloError,
        });
      }
    } catch (error) {
      dispatch({
        type: ActionType.ENTRIES_RECEIVED,
        key: StateValue.fail,
        error: error,
      });
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  let fetchAttemptsCount = 0;
  const timeoutsLen = fetchRetries.length;

  function schedule() {
    // we are connected
    if (getIsConnected()) {
      fetchOnlineComments();
      return;
    }

    if (fetchAttemptsCount === timeoutsLen) {
      dispatch({
        type: ActionType.ON_COMMENTS_FETCHED,
        value: StateValue.errors,
        errors: {
          error: DATA_FETCHING_FAILED,
        } as GetExperienceCommentsErrorsFragment_errors,
      });

      return;
    }

    timeoutId = setTimeout(schedule, fetchRetries[fetchAttemptsCount++]);
  }

  schedule();
};

type DefFetchCommentsEffect = EffectDefinition<"fetchCommentsEffect">;

export const effectFunctions = {
  scrollDocToTopEffect,
  timeoutsEffect,
  cancelDeleteExperienceEffect,
  deleteExperienceRequestedEffect,
  deleteExperienceEffect,
  fetchDetailedExperienceEffect,
  fetchEntriesEffect,
  postOfflineExperiencesSyncEffect,
  postOfflineEntriesSyncEffect,
  deleteCreateEntrySyncErrorEffect,
  deleteEntryEffect,
  fetchCommentsEffect,
};

function processGetExperienceQuery(
  experience: ExperienceDetailViewFragment | null,
  entriesQueryResult: GetEntriesUnionFragment | null,
  syncErrors?: SyncError,
): [FetchedExperiencePayload, ExperienceSyncError | undefined] {
  if (experience) {
    const { id } = experience;
    const unsynced = getUnsyncedExperience(id);
    const onlineStatus = getOnlineStatus(id, unsynced);

    const {
      data: entriesData,
      entriesErrors,
      processedSyncErrors,
    } = processEntriesQuery(entriesQueryResult, syncErrors);

    let errors = syncErrors as ExperienceSyncError;

    if (syncErrors && entriesErrors) {
      errors = {
        ...processedSyncErrors,
        entriesErrors,
      };
    }

    const result = {
      key: StateValue.data,
      experience,
      entriesData,
      onlineStatus,
    };

    return [result, errors];
  }

  const result = {
    key: StateValue.errors,
    error: DATA_FETCHING_FAILED,
  };

  return [result, undefined];
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

function deleteEntrySuccessEffectHelper(id: string, dispatch: DispatchType) {
  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.cancelled,
    });
  }, CLOSE_NOTIFICATION_TIMEOUT_MS);

  dispatch({
    type: ActionType.DELETE_ENTRY,
    key: StateValue.success,
    id,
    timeoutId,
  });
}

function deleteEntryFailEffectHelper(
  error: CommonError,
  dispatch: DispatchType,
) {
  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.DELETE_ENTRY,
      key: StateValue.cancelled,
    });
  }, CLOSE_NOTIFICATION_TIMEOUT_MS);

  dispatch({
    type: ActionType.DELETE_ENTRY,
    key: StateValue.errors,
    error,
    timeoutId,
  });

  scrollDocumentToTop();
}

////////////////////////// END EFFECTS SECTION ////////////////////////////

////////////////////////// HELPER FUNCTIONS ////////////////////////////

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

////////////////////////// END HELPER FUNCTIONS ////////////////////////////

export type StateMachine = GenericGeneralEffect<EffectType> & {
  states: LoadingState | ErrorState | DataState;
  timeouts: Timeouts;
};

type ErrorState = {
  value: ErrorsVal;
  errors: {
    context: {
      error: string;
    };
  };
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

type ProcessedEntriesQueryReturnVal =
  | ProcessedEntriesQuerySuccessReturnVal
  | ProcessedEntriesQueryErrorReturnVal;

export type EntriesDataSuccessSate = {
  value: SuccessVal;
  success: {
    context: {
      entries: DataStateContextEntries;
      pageInfo: PageInfoFragment;
      pagingError?: string;
    };
  };
};

export type EntriesDataFailureState = {
  value: FailVal;
  error: string;
};

export type FetchEntriesErrorState = {
  value: FetchEntriesErrorVal;
  fetchEntriesError: {
    context: {
      entries: DataStateContextEntries;
      fetchError?: string;
    };
  };
};

type EntriesData =
  | EntriesDataSuccessSate
  | FetchEntriesErrorState
  | EntriesDataFailureState;

export type DataStateContext = {
  experience: ExperienceDetailViewFragment;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  syncErrors?: ExperienceSyncError;
  onlineStatus: OnlineStatus;
};

export type DataStateContextEntry = {
  entryData: EntryFragment;
  entrySyncError?: CreateEntryErrorFragment | UpdateEntrySyncErrors;
};

export type DataStateContextEntries = DataStateContextEntry[];

export type DataState = {
  value: DataVal;
  data: {
    context: DataStateContext;
    states: {
      upsertEntryActive:
        | {
            value: InActiveVal;
          }
        | UpsertEntryActive;

      entryNotification:
        | {
            value: InActiveVal;
          }
        | EntryNotificationState;

      notification:
        | {
            value: InActiveVal;
          }
        | NotificationActive;

      deleteExperience: DeleteExperienceState;

      showingOptionsMenu: ShowingOptionsMenuState;

      entries: EntriesData;

      updateExperienceUiActive:
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          }
        | {
            value: SuccessVal;
          };

      syncErrorsMsg:
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          };

      entriesOptions:
        | EntriesOptionInactive
        | EntriesOptionActive
        | EntriesOptionDeleteRequested
        | EntryDeletedSuccess
        | EntryDeleteFail;

      comment: CommentState;

      upsertComment:
        | {
            value: InActiveVal;
          }
        | UpsertCommentActive;

      commentNotification:
        | {
            value: InActiveVal;
          }
        | CommentNotificationState;
    };
  };
};

type CommentNotificationState = {
  value: ActiveVal;
  active: {
    context: {
      message: string;
    };
  };
};

type UpsertCommentActive = {
  value: ActiveVal;
  // active: {
  //   context: ''
  // }
};

export type CommentState =
  | CommentDataSate
  | CommentErrorState
  | CommentInitialState
  | CommentEmptyState;

type CommentEmptyState = {
  value: EmptyVal;
};

type CommentInitialState = {
  value: InitialVal;
};

type CommentDataSate = {
  value: SuccessVal;
  success: {
    context: {
      comments: CommentFragment[];
    };
    states: {
      menu:
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          };
    };
  };
};

type CommentErrorState = {
  value: ErrorsVal;
  errors: {
    context: {
      error: GetExperienceCommentsErrorsFragment_errors["error"];
    };
  };
};

type EntryDeleteFail = {
  value: ErrorsVal;
  errors: {
    error: string;
  };
};

type EntryDeletedSuccess = {
  value: DeleteSuccess;
  deleteSuccess: {
    entryId: string;
  };
};

type EntriesOptionInactive = {
  value: InActiveVal;
};

type EntriesOptionActive = {
  value: ActiveVal;
  active: {
    id: string;
  };
};

type EntriesOptionDeleteRequested = {
  value: RequestedVal;
  requested: {
    entry: EntryFragment;
  };
};

export type ShowingOptionsMenuState =
  | {
      value: InActiveVal;
    }
  | {
      value: ActiveVal;
    };

type DeleteExperienceState =
  | {
      value: InActiveVal;
    }
  | DeleteExperienceActiveState;

type DeleteExperienceActiveState = {
  value: ActiveVal;
  active: {
    context: {
      key?: RequestedVal; // with key, we know request came from 'my' component
    };
  };
};

type UpsertEntryActive = {
  value: ActiveVal;
  active: {
    context: UpsertEntryActivePayload;
  };
};

type EntryNotificationState = {
  value: ActiveVal;
  active: {
    context: {
      message: string;
    };
  };
};

type NotificationActive = {
  value: ActiveVal;
  active: {
    context: {
      message: string;
    };
  };
};

export type ComponentTimeoutsMs = {
  fetchRetries: number[];
  closeNotification: number;
};

export const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: [2000, 3000, 5000],
  closeNotification: CLOSE_NOTIFICATION_TIMEOUT_MS,
};

export type CallerProps = RouteChildrenProps<
  DetailExperienceRouteMatch,
  {
    delete: boolean;
  }
>;

export type Props = DeleteExperiencesComponentProps &
  CallerProps & {
    componentTimeoutsMs: ComponentTimeoutsMs;
  };

export type Match = match<DetailExperienceRouteMatch>;

type Action =
  | ({
      type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE;
    } & UpsertEntryActivePayload)
  | ({
      type: ActionType.ON_UPSERT_ENTRY_SUCCESS;
    } & OnEntryCreatedPayload)
  | {
      type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION;
    }
  | ({
      type: ActionType.RECORD_TIMEOUT;
    } & SetTimeoutPayload)
  | ({
      type: ActionType.DELETE_EXPERIENCE_REQUEST;
    } & DeleteExperienceRequestPayload)
  | {
      type: ActionType.DELETE_EXPERIENCE_CANCELLED;
    }
  | {
      type: ActionType.DELETE_EXPERIENCE_CONFIRMED;
    }
  | ({
      type: ActionType.TOGGLE_EXPERIENCE_MENU;
    } & ToggleMenuPayload)
  | ({
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.RE_FETCH_EXPERIENCE;
    }
  | {
      type: ActionType.RE_FETCH_ENTRIES;
    }
  | ({
      type: ActionType.ENTRIES_RECEIVED;
    } & (ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload))
  | {
      type: ActionType.FETCH_NEXT_ENTRIES;
    }
  | ({
      type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI;
    } & UpdateExperiencePayload)
  | ({
      type: ActionType.ON_SYNC;
    } & OnSyncedData)
  | {
      type: ActionType.CLOSE_SYNC_ERRORS_MSG;
    }
  | ({
      type: ActionType.ENTRIES_OPTIONS;
    } & EntriesOptionsPayload)
  | ({
      type: ActionType.DELETE_ENTRY;
    } & DeleteEntryPayload)
  | ({
      type: ActionType.ON_COMMENTS_FETCHED;
    } & CommentsReceivedPayload)
  | ({
      type: ActionType.COMMENT_ACTION;
    } & CommentActionPayload)
  | ({
      type: ActionType.ON_UPSERT_COMMENT;
    } & OnCommentCreatedPayload);

type OnCommentCreatedPayload = {
  data: CommentFragment;
};

type CommentActionPayload = {
  action: CommentAction;
};

type CommentsReceivedPayload =
  | {
      value: SuccessVal;
      comments: CommentFragment[];
    }
  | {
      value: ErrorsVal;
      errors: GetExperienceCommentsErrorsFragment_errors;
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

type EntriesOptionsPayload = {
  entry: EntryFragment;
};

type ReFetchOnlyPayload = {
  key: ReFetchOnlyVal;
  entries: EntryConnectionFragment;
};

type UpdateExperiencePayload = WithMayBeExperiencePayload & {
  onlineStatus?: OnlineStatus;
};

type WithMayBeExperiencePayload = {
  experience?: ExperienceDetailViewFragment;
};

export type UpsertEntryActivePayload = {
  updatingEntry?: UpdatingEntryPayload & {
    index: number;
  };
};

export type ExperienceSyncError = SyncError & {
  entriesErrors?: IndexToEntryErrorsList;
  definitionsErrors?: FieldError;
  ownFieldsErrors?: FieldError;
};

type OnDataReceivedPayload = {
  experienceData: FetchedExperiencePayload;
  syncErrors?: ExperienceSyncError;
};

type FetchedExperiencePayload =
  | {
      key: DataVal;
      experience: ExperienceDetailViewFragment;
      entriesData: ProcessedEntriesQueryReturnVal;
      onlineStatus: OnlineStatus;
    }
  | {
      key: ErrorsVal;
      error: Error | string;
    };

interface ToggleMenuPayload {
  key?: "close" | "open";
}

interface DeleteExperienceRequestPayload {
  key?: RequestedVal;
}

export interface DataDefinitionIdToNameMap {
  [dataDefinitionId: string]: string;
}

export type OldEntryData = {
  entry: EntryFragment;
  index: number;
};

interface OnEntryCreatedPayload {
  oldData?: OldEntryData;
  newData: {
    entry: EntryFragment;
    onlineStatus: OnlineStatus;
  };
}

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

export type DispatchType = Dispatch<Action>;

export type EffectArgs = {
  dispatch: DispatchType;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Record<string, unknown>
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

export type EffectType =
  | DefScrollDocToTopEffect
  | DefTimeoutsEffect
  | DefCancelDeleteExperienceEffect
  | DefDeleteExperienceRequestedEffect
  | DefDeleteExperienceEffect
  | DefFetchDetailedExperienceEffect
  | DefFetchEntriesEffect
  | DefPostOfflineExperiencesSyncEffect
  | DefPostOfflineEntriesSyncEffect
  | DefDeleteCreateEntrySyncErrorEffect
  | DefDeleteEntryEffect
  | DefFetchCommentsEffect;

type DataObjectErrorsList = [string | number, [string, string][]][];

export type EntryErrorsList = {
  // [key, errorValue]
  others?: FieldError;
  // [index, key, errorValue]
  dataObjects?: [string | number, [string, string][]][];
};

type IndexToEntryErrorsList = [number | string, EntryErrorsList][];
