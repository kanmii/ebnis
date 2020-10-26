import { Reducer, Dispatch } from "react";
import { wrapReducer, wrapState } from "../../logger";
import { RouteChildrenProps, match } from "react-router-dom";
import { DetailExperienceRouteMatch } from "../../utils/urls";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  getOnlineStatus,
} from "../../apollo/unsynced-ledger";
import immer, { Draft } from "immer";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import {
  ActiveVal,
  InActiveVal,
  RequestedVal,
  ErrorsVal,
  DataVal,
  LoadingState,
  FETCH_EXPERIENCES_TIMEOUTS,
  SuccessVal,
  FailVal,
  FetchEntriesErrorVal,
  ReFetchOnly as ReFetchOnlyVal,
  OnlineStatus,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { scrollDocumentToTop } from "./detail-experience.injectables";
import { StateValue, Timeouts } from "../../utils/types";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { CreateEntryErrorFragment } from "../../graphql/apollo-types/CreateEntryErrorFragment";
import { MY_URL } from "../../utils/urls";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../../apollo/delete-experience-cache";
import {
  DeleteExperiencesComponentProps,
  manuallyFetchEntries,
  GetEntriesQueryResult,
} from "../../utils/experience.gql.types";
import { manuallyFetchDetailedExperience } from "../../utils/experience.gql.types";
import {
  parseStringError,
  DATA_FETCHING_FAILED,
  FETCH_ENTRIES_FAIL_ERROR_MSG,
  FieldError,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import {
  getCachedExperience,
  getEntriesQuery,
  writeGetEntriesQuery,
} from "../../apollo/get-detailed-experience-query";
import { PageInfoFragment } from "../../graphql/apollo-types/PageInfoFragment";
import {
  GetEntriesUnionFragment,
  GetEntriesUnionFragment_GetEntriesSuccess,
} from "../../graphql/apollo-types/GetEntriesUnionFragment";
import {
  EntryConnectionFragment_edges,
  EntryConnectionFragment,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { GetDetailExperience } from "../../graphql/apollo-types/GetDetailExperience";
import { PaginationInput } from "../../graphql/apollo-types/globalTypes";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "../../graphql/apollo-types/GetEntries";
import { entryToEdge } from "../UpsertEntry/entry-to-edge";
import { ApolloError } from "@apollo/client";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { nonsenseId } from "../../utils/utils.dom";
import { toGetEntriesSuccessQuery } from "../../graphql/utils.gql";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import {
  OnSyncedData,
  OfflineIdToOnlineExperienceMap,
  SyncError,
  OfflineIdToCreateEntrySyncErrorMap,
  OnlineExperienceIdToOfflineEntriesMap,
  IdToUpdateEntrySyncErrorMap,
  UpdateEntrySyncErrors,
} from "../../utils/sync-to-server.types";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../WithSubscriptions/with-subscriptions.utils";
import {
  getSyncError,
  putOfflineExperienceIdInSyncFlag,
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  putOrRemoveSyncError,
} from "../../apollo/sync-to-server-cache";
import { windowChangeUrl, ChangeUrlType } from "../../utils/global-window";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { UpdatingEntryPayload } from "../UpsertEntry/upsert-entry.utils";
import { purgeEntry } from "../../apollo/update-get-experiences-mini-query";
import { DataObjectErrorFragment } from "../../graphql/apollo-types/DataObjectErrorFragment";

export enum ActionType {
  TOGGLE_UPSERT_ENTRY_ACTIVE = "@detailed-experience/toggle-upsert-entry",
  ON_UPSERT_ENTRY_SUCCESS = "@detailed-experience/on-upsert-entry-success",
  ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION = "@detailed-experience/on-close-upsert-entry-created-notification",
  SET_TIMEOUT = "@detailed-experience/set-timeout",
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
          case ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE:
            handleToggleUpsertEntryActiveAction(
              proxy,
              payload as UpsertEntryActivePayload,
            );
            break;

          case ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION:
            handleOnCloseNewEntryCreatedNotification(proxy);
            break;

          case ActionType.SET_TIMEOUT:
            handleSetTimeoutAction(proxy, payload as SetTimeoutPayload);
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
            handleToggleExperienceMenuAction(
              proxy,
              payload as ToggleMenuPayload,
            );
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
        }
      });
    },

    // true,
  );

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
  proxy: DraftState,
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
      const state = states.upsertEntryActive as Draft<UpsertEntryActive>;
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

    const state = states.upsertEntryActive as Draft<UpsertEntryActive>;
    state.value = StateValue.active;
    state.active = {
      context: {},
    };
  }
}

function handleOnCloseNewEntryCreatedNotification(proxy: DraftState) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.newEntryCreated.value = StateValue.inactive;

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        clear: timeouts.genericTimeout,
      },
    });

    delete timeouts.genericTimeout;
  }
}

function handleSetTimeoutAction(proxy: DraftState, payload: SetTimeoutPayload) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key] = val;
  });
}

function handleDeleteExperienceRequestAction(
  proxy: DraftState,
  payload: DeleteExperienceRequestPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
    } = globalStates.data;

    deleteExperience.value = StateValue.active;
    const deleteExperienceActive = deleteExperience as Draft<
      DeleteExperienceActiveState
    >;

    deleteExperienceActive.active = {
      context: {
        key: payload.key,
      },
    };
  }
}

function handleDeleteExperienceCancelledAction(proxy: DraftState) {
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

function handleDeleteExperienceConfirmedAction(proxy: DraftState) {
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
  proxy: DraftState,
  payload: ToggleMenuPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { showingOptionsMenu },
    } = globalStates.data;

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
  proxy: DraftState,
  payload: OnDataReceivedPayload,
) {
  const { states } = proxy;
  const effects = getGeneralEffects(proxy);
  const { experienceData, syncErrors } = payload;

  switch (experienceData.key) {
    case StateValue.data:
      {
        const { experience, entriesData, onlineStatus } = experienceData;

        const dataState = states as Draft<DataState>;
        dataState.value = StateValue.data;

        const dataStateData =
          dataState.data || ({} as Draft<DataState["data"]>);

        dataState.data = dataStateData;

        const context =
          dataStateData.context || ({} as Draft<DataStateContext>);

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
          newEntryCreated: {
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
      states.value = StateValue.errors;
      const errorsState = states as Draft<ErrorState>;
      errorsState.errors = {
        context: {
          error: parseStringError(experienceData.error),
        },
      };
      break;
  }
}

function handleRefetchExperienceAction(proxy: DraftState) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleRefetchEntriesAction(proxy: DraftState) {
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

function handleFetchNextEntriesAction(proxy: DraftState) {
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
  proxy: DraftState,
  payload: ProcessedEntriesQueryReturnVal | ReFetchOnlyPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states,
      context: {
        experience: { id: experienceId },
      },
    } = globalStates.data;

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
            const entriesSuccessState = states.entries as Draft<
              EntriesDataSuccessSate
            >;

            entriesSuccessState.value = StateValue.success;
            entriesSuccessState.success = {
              context: {
                entries: payload.entries,
                pageInfo: payload.pageInfo,
              },
            };

            break;

          case StateValue.reFetchOnly:
            const { entries } = payload;

            const { data } = processEntriesQuery(
              experienceId,
              toGetEntriesSuccessQuery(entries),
            );

            const fetchEntriesErrorState = states.entries as Draft<
              FetchEntriesErrorState
            >;

            fetchEntriesErrorState.value = StateValue.fetchEntriesError;

            fetchEntriesErrorState.fetchEntriesError = {
              context: {
                entries: (data as ProcessedEntriesQuerySuccessReturnVal)
                  .entries,
                fetchError: (states.entries as EntriesDataFailureState).error,
              },
            };

            break;
        }
        break;

      case StateValue.fetchEntriesError:
        if (payload.key === StateValue.success) {
          const entriesSuccessState = states.entries as Draft<
            EntriesDataSuccessSate
          >;

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
  proxy: DraftState,
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
    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

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

function handleOnSyncAction(proxy: DraftState, payload: OnSyncedData) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

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
  proxy: DraftState,
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
      newEntryCreated,
      entries: entriesState,
    } = states;

    upsertEntryActive.value = StateValue.inactive;
    notification.value = StateValue.inactive;

    const {
      oldData,
      newData: { entry: newEntry, onlineStatus: newOnlineStatus },
    } = payload;

    context.onlineStatus = newOnlineStatus;

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        set: "set-close-upsert-entry-created-notification",
      },
    });

    // completely new entry created online
    if (!oldData) {
      const newEntryState = newEntryCreated as Draft<
        NewEntryCreatedNotification
      >;

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
          const ob = (entriesState[StateValue.success] ||
            // istanbul ignore next:
            entriesState[StateValue.fetchEntriesError]) as Draft<
            EntriesDataSuccessSate["success"]
          >;

          const { context } = ob;

          context.entries.unshift({
            entryData: newEntry,
          });

          break;

        case StateValue.fail:
          {
            const fetchEntriesError = states.entries as Draft<
              FetchEntriesErrorState
            >;

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

function handleCloseSyncErrorsMsgAction(proxy: DraftState) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.syncErrorsMsg.value = StateValue.inactive;
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
  proxy: DraftState,
  state: EntriesData,
  payload:
    | {
        [entryId: string]: EntryFragment | CreateEntryErrorFragment;
      }
    | IdToUpdateEntrySyncErrorMap,
  update?: true,
) {
  const fetchEntriesErrorState = state as Draft<FetchEntriesErrorState>;

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

      const effects = getGeneralEffects<EffectType, DraftState>(proxy);
      effects.push({
        key: "fetchEntriesEffect",
        ownArgs: {},
      });
    }

    return;
  }

  const ob = (state[StateValue.success] ||
    state[StateValue.fetchEntriesError]) as Draft<
    EntriesDataSuccessSate["success"]
  >;

  const {
    context: { entries },
  } = ob;

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
  context: Draft<DataStateContext>,
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

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

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
    set?:
      | "set-close-upsert-entry-created-notification"
      | "set-close-update-experience-success-notification";
    clear?: NodeJS.Timeout;
  }
>;

const deleteExperienceRequestedEffect: DefDeleteExperienceRequestedEffect["func"] = (
  { experienceId },
  props,
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
    experience: ExperienceFragment;
    key: string;
  }
>;

const deleteExperienceEffect: DefDeleteExperienceEffect["func"] = async (
  { experienceId },
  props,
  effectArgs,
) => {
  const { history } = props;

  const { deleteExperiences } = effectArgs;

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
  } catch (error) {}
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

  let cachedResult = getCachedExperience(experienceId);

  const offlineId = getAndRemoveOfflineExperienceIdFromSyncFlag(experienceId);

  if (offlineId) {
    cleanUpOfflineExperiences({
      [offlineId]: {} as ExperienceFragment,
    });
  }

  const syncErrors = getSyncError(experienceId) || undefined;

  if (cachedResult) {
    const daten = cachedResult.data as GetDetailExperience;

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
      const data = await manuallyFetchDetailedExperience(
        {
          experienceId,
          pagination: {
            first: 10,
          },
        },
        "network-only",
      );

      const daten = (data && data.data) || ({} as GetDetailExperience);

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

type DefFetchDetailedExperienceEffect = EffectDefinition<
  "fetchDetailedExperienceEffect"
>;

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

  const previousEntries = getEntriesQuery(
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
      (await manuallyFetchEntries(variables)) ||
      // istanbul ignore next:
      ({} as GetEntriesQueryResult);

    if (data) {
      let { data: processedEntries } = processEntriesQuery(
        experienceId,
        data.getEntries,
      );

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
};

function processGetExperienceQuery(
  experience: ExperienceFragment | null,
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
    } = processEntriesQuery(id, entriesQueryResult, syncErrors);

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
  experienceId: string,
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

  writeGetEntriesQuery(experienceId, y);

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

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: LoadingState | ErrorState | DataState;
    timeouts: Readonly<Timeouts>;
  }>;

type ErrorState = Readonly<{
  value: ErrorsVal;
  errors: Readonly<{
    context: Readonly<{
      error: string;
    }>;
  }>;
}>;

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
    context: Readonly<{
      entries: DataStateContextEntries;
      pageInfo: PageInfoFragment;
      pagingError?: string;
    }>;
  };
};

export type EntriesDataFailureState = Readonly<{
  value: FailVal;
  error: string;
}>;

export type FetchEntriesErrorState = Readonly<{
  value: FetchEntriesErrorVal;
  fetchEntriesError: {
    context: Readonly<{
      entries: DataStateContextEntries;
      fetchError?: string;
    }>;
  };
}>;

type EntriesData =
  | EntriesDataSuccessSate
  | FetchEntriesErrorState
  | EntriesDataFailureState;

export type DataStateContext = Readonly<{
  experience: ExperienceFragment;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  syncErrors?: ExperienceSyncError;
  onlineStatus: OnlineStatus;
}>;

export type DataStateContextEntry = Readonly<{
  entryData: EntryFragment;
  entrySyncError?: CreateEntryErrorFragment | UpdateEntrySyncErrors;
}>;

export type DataStateContextEntries = DataStateContextEntry[];

export type DataState = Readonly<{
  value: DataVal;
  data: Readonly<{
    context: DataStateContext;
    states: Readonly<{
      upsertEntryActive: Readonly<
        | {
            value: InActiveVal;
          }
        | UpsertEntryActive
      >;

      newEntryCreated: Readonly<
        | {
            value: InActiveVal;
          }
        | NewEntryCreatedNotification
      >;

      notification: Readonly<
        | {
            value: InActiveVal;
          }
        | NotificationActive
      >;

      deleteExperience: DeleteExperienceState;

      showingOptionsMenu: ShowingOptionsMenuState;

      entries: EntriesData;

      updateExperienceUiActive: Readonly<
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          }
        | {
            value: SuccessVal;
          }
      >;

      syncErrorsMsg: Readonly<
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          }
      >;
    }>;
  }>;
}>;

export type ShowingOptionsMenuState = Readonly<
  | {
      value: InActiveVal;
    }
  | {
      value: ActiveVal;
    }
>;

type DeleteExperienceState = Readonly<
  | {
      value: InActiveVal;
    }
  | DeleteExperienceActiveState
>;

type DeleteExperienceActiveState = Readonly<{
  value: ActiveVal;
  active: {
    context: {
      key?: RequestedVal; // with key, we know request came from 'my' component
    };
  };
}>;

type UpsertEntryActive = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<UpsertEntryActivePayload>;
  }>;
}>;

type NewEntryCreatedNotification = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      message: string;
    }>;
  }>;
}>;

type NotificationActive = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      message: string;
    }>;
  }>;
}>;

export type Props = RouteChildrenProps<
  DetailExperienceRouteMatch,
  {
    delete: boolean;
  }
>;

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
      type: ActionType.SET_TIMEOUT;
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
    };

type ReFetchOnlyPayload = {
  key: ReFetchOnlyVal;
  entries: GetEntries_getEntries_GetEntriesSuccess_entries;
};

type UpdateExperiencePayload = WithMayBeExperiencePayload & {
  onlineStatus?: OnlineStatus;
};

type WithMayBeExperiencePayload = {
  experience?: ExperienceFragment;
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
      experience: ExperienceFragment;
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

export type EffectArgs = DeleteExperiencesComponentProps & {
  dispatch: DispatchType;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
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
  | DefDeleteCreateEntrySyncErrorEffect;

type DataObjectErrorsList = [string | number, [string, string][]][];

export type EntryErrorsList = {
  // [key, errorValue]
  others?: FieldError;
  // [index, key, errorValue]
  dataObjects?: [string | number, [string, string][]][];
};

type IndexToEntryErrorsList = [number | string, EntryErrorsList][];
