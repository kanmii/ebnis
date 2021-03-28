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
import { GetEntriesUnionFragment } from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { GetExperienceAndEntriesDetailView } from "@eb/cm/src/graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { PageInfoFragment } from "@eb/cm/src/graphql/apollo-types/PageInfoFragment";
import { wrapReducer, wrapState } from "@eb/cm/src/logger";
import {
  ActiveVal,
  DataVal,
  ErrorsVal,
  FailVal,
  IdToUpdateEntrySyncErrorMap,
  InActiveVal,
  KeyOfTimeouts,
  LoadingState,
  OfflineIdToCreateEntrySyncErrorMap,
  OfflineIdToOnlineExperienceMap,
  OnlineExperienceIdToOfflineEntriesMap,
  OnlineStatus,
  OnSyncedData,
  RequestedVal,
  StateValue,
  SuccessVal,
  SyncError,
  Timeouts,
  UpdateEntrySyncErrors,
} from "@eb/cm/src/utils/types";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import immer from "immer";
// import { original } from "immer";
import { Dispatch, Reducer } from "react";
import { match, RouteChildrenProps } from "react-router-dom";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../../apollo/delete-experience-cache";
import { getCachedExperienceAndEntriesDetailView } from "../../apollo/get-detailed-experience-query";
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
import { deleteObjectKey } from "../../utils";
import {
  DATA_FETCHING_FAILED,
  ErrorType,
  FETCH_ENTRIES_FAIL_ERROR_MSG,
  FieldError,
  GENERIC_SERVER_ERROR,
  parseStringError,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import { DeleteExperiencesComponentProps } from "../../utils/delete-experiences.gql";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import {
  GetExperienceAndEntriesDetailViewFn,
  GetExperienceCommentsFn,
} from "../../utils/experience.gql.types";
import { ChangeUrlType, windowChangeUrl } from "../../utils/global-window";
import { UpdateExperiencesMutationProps } from "../../utils/update-experiences.gql";
import {
  DetailExperienceRouteMatch,
  makeDetailedExperienceRoute,
  MY_URL,
} from "../../utils/urls";
import {
  EntriesRemoteAction,
  EntriesRemoteActionType,
  EntriesSyncErrors,
  ProcessedEntriesQueryReturnVal,
} from "../entries/entries.utils";
import {
  CommentRemoteAction,
  CommentRemoteActionType,
} from "../experience-comments/experience-comments.utils";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../WithSubscriptions/with-subscriptions.utils";

export enum ActionType {
  record_timeout = "@detailed-experience/record-timeout",
  delete = "@detailed-experience/delete",
  toggle_menu = "@detailed-experience/toggle-menu",
  on_fetched = "@detailed-experience/on-fetched",
  re_fetch = "@detailed-experience/re-fetch",
  request_update_ui = "@detailed-experience/request-update-ui",
  on_sync = "@detailed-experience/on-sync",
  close_sync_errors_msg = "@detailed-experience/close-sync-errors-message",
  comment_action = "@detailed-experience/comment-action",
  hide_menus = "@detailed-experience/hide-menus",
  entries_actions = "@detailed-experience/entries-actions",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (states) => {
      const proxy = states as StateMachine;
      unsetStatesHelper(proxy);

      switch (type) {
        case ActionType.record_timeout:
          handleRecordTimeoutAction(proxy, payload as SetTimeoutPayload);
          break;

        case ActionType.delete:
          handleDeleteAction(proxy, payload as DeletePayload);
          break;

        case ActionType.toggle_menu:
          handleToggleMenuAction(proxy, payload as ToggleMenuPayload);
          break;

        case ActionType.on_fetched:
          handleOnFetchedAction(proxy, payload as OnDataReceivedPayload);
          break;

        case ActionType.re_fetch:
          handleRefetchAction(proxy);
          break;

        case ActionType.request_update_ui:
          handleUpdateUiRequestAction(
            proxy,
            payload as UpdateExperiencePayload,
          );
          break;

        case ActionType.on_sync:
          handleOnSyncAction(proxy, payload as OnSyncedData);
          break;

        case ActionType.close_sync_errors_msg:
          handleCloseSyncErrorsMsgAction(proxy);
          break;

        case ActionType.comment_action:
          handleCommentAction(proxy, payload as CommentActionPayload);
          break;

        case ActionType.hide_menus:
          handleHideMenusActions(proxy, (payload as HideMenusPayload).menus);
          break;

        case ActionType.entries_actions:
          handleEntriesAction(proxy, payload as EntriesActionPayload);
          break;
      }
    });
  });

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(): StateMachine {
  const state: StateMachine = {
    id: "@detailed-experience",
    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "fetchEffect",
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

  return wrapState<StateMachine>(state);
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

function handleDeleteAction(proxy: StateMachine, payload: DeletePayload) {
  const { states: globalStates } = proxy;

  // istanbul ignore else
  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
      context: { experience },
    } = globalStates.data;

    const deleteActive = deleteExperience as DeleteExperienceActiveState;

    switch (payload.value) {
      case "request": {
        // clear all menus
        handleHideMenusActions(proxy, ["mainCircular", "comments", "entries"]);

        deleteExperience.value = StateValue.active;

        deleteActive.active = {
          states: {
            value: StateValue.requested,
            key: payload.key,
          },
        };

        return;
      }

      case "cancelled": {
        deleteExperience.value = StateValue.inactive;

        const effects = getGeneralEffects(proxy);

        effects.push({
          key: "cancelDeleteEffect",
          ownArgs: {
            key: (deleteActive.active.states as DeleteRequested).key,
            experience,
          },
        });

        return;
      }

      case "confirmed": {
        const effects = getGeneralEffects(proxy);
        effects.push({
          key: "deleteEffect",
          ownArgs: {
            experienceId: globalStates.data.context.experience.id,
          },
        });

        return;
      }

      case "errors": {
        deleteActive.active.states = {
          value: StateValue.errors,
          errors: payload.errors,
        };

        const effects = getGeneralEffects(proxy);

        effects.push({
          key: "timeoutsEffect",
          ownArgs: {
            set: "set-close-delete-fail-notification",
          },
        });

        return;
      }

      case "closeNotification": {
        deleteExperience.value = StateValue.inactive;

        return;
      }
    }
  }
}

function handleToggleMenuAction(
  proxy: StateMachine,
  payload: ToggleMenuPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    handleHideMenusActions(proxy, ["comments", "entries"]);

    const { showingOptionsMenu } = states;

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

function handleOnFetchedAction(
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
        const context = dataStateData.context || ({} as DataStateContext);
        dataState.data = dataStateData;
        dataStateData.context = context;
        context.experience = experience;
        processSyncErrors(context, syncErrors);
        context.onlineStatus = onlineStatus;

        context.dataDefinitionIdToNameMap = makeDataDefinitionIdToNameMap(
          experience.dataDefinitions,
        );

        dataStateData.states = {
          updateUiActive: {
            value: StateValue.inactive,
          },
          notification: {
            value: StateValue.inactive,
          },
          deleteExperience: {
            value: StateValue.inactive,
          },
          showingOptionsMenu: {
            value: StateValue.inactive,
          },
          entries: {
            value: StateValue.active,
            entriesData,
            postActions: [],
          },
          syncErrorsMsg: {
            value: StateValue.inactive,
          },
          comments: {
            value: StateValue.inactive,
          },
          upsertingComment: {
            value: StateValue.inactive,
          },
        };

        effects.push({
          key: "deleteRequestedEffect",
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

function handleRefetchAction(proxy: StateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchEffect",
    ownArgs: {},
  });
}

function handleUpdateUiRequestAction(
  proxy: StateMachine,
  { experience, onlineStatus }: UpdateExperiencePayload,
) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { context, states } = globalStates.data;

    // clear all menus
    handleHideMenusActions(proxy, ["mainCircular", "comments", "entries"]);

    const { updateUiActive: state, syncErrorsMsg } = states;

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
        // :TODO: where should this go in child entries??????
        // {
        //   key: "fetchEntriesEffect",
        //   ownArgs: {
        //     reFetchFromCache: true,
        //   },
        // },

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
      // states: { entries: entriesState },
    } = globalStates.data;
    const {
      offlineIdToOnlineExperienceMap,
      onlineExperienceIdToOfflineEntriesMap,
      syncErrors,
      onlineExperienceUpdatedMap,
    } = payload;

    const {
      experience: { id },
      syncErrors: maybeContextSyncErrors,
    } = context;

    const contextSyncErrors =
      maybeContextSyncErrors || ({} as ExperienceSyncError);

    if (offlineIdToOnlineExperienceMap) {
      const data = {
        ...offlineIdToOnlineExperienceMap,
      };
      const ownArgs: DefPostOfflineExperiencesSyncEffect["ownArgs"] = {
        data,
      };

      const onlineExperience = offlineIdToOnlineExperienceMap[id];

      // istanbul ignore else:
      if (onlineExperience) {
        // Offline experience now synced

        const offlineExperienceId = id;

        // All offline experiences synced will be purged right now except this
        // one, which will be purged after we have navigated away, hence the
        // need to remove it
        delete data[offlineExperienceId];

        // We will keep a memo to remind us to purge this offline experience
        // after we have navigated away
        ownArgs.onlineIdToOfflineId = [
          onlineExperience.id,
          offlineExperienceId,
        ];
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
        // :TODO: update child entries
        // updateEntriesFn(proxy, entriesState, offlineIdToOnlineEntryMap);
      }

      effects.push({
        key: "postOfflineEntriesSyncEffect",
        ownArgs: {
          data: onlineExperienceIdToOfflineEntriesMap,
        },
      });
    }

    const experienceSyncErrors = syncErrors && syncErrors[id];

    // istanbul ignore else:
    if (experienceSyncErrors) {
      const {
        createEntries,
        updateEntries,
        ownFields,
        definitions,
      } = experienceSyncErrors;

      // istanbul ignore else:
      if (ownFields) {
        contextSyncErrors.ownFieldsErrors = [["0", ownFields.title]];
        context.syncErrors = contextSyncErrors;
      }

      // istanbul ignore else:
      if (definitions) {
        const errors: FieldError = [];
        contextSyncErrors.definitionsErrors = errors;
        context.syncErrors = contextSyncErrors;

        let index = 1;
        Object.values(definitions).forEach((error) => {
          Object.entries(error).forEach(([k, v]) => {
            if (v && k !== "__typename") {
              errors.push(["" + index++, v]);
            }
          });
        });
      }

      let entriesErrors = contextSyncErrors.entriesErrors || [];

      // :TODO: update child entries
      // istanbul ignore else:
      if (createEntries) {
        Object.entries(createEntries).forEach(
          (
            [
              ,
              // entryId
              createError,
            ],
            index,
          ) => {
            entriesErrors = processCreateEntriesErrors(
              entriesErrors,
              createError,
              index,
            );
          },
        );
      }

      // :TODO: update child entries
      // istanbul ignore else:
      if (updateEntries) {
        Object.entries(updateEntries).forEach(
          (
            [
              ,
              // entryId
              updateError,
            ],
            index,
          ) => {
            entriesErrors = processUpdateEntriesErrors(
              entriesErrors,
              updateError,
              index,
            );
          },
        );
      }

      // istanbul ignore else:
      if (entriesErrors.length) {
        context.syncErrors = {
          ...contextSyncErrors,
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

function handleCloseSyncErrorsMsgAction(proxy: StateMachine) {
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

function processSyncErrors(
  context: DataStateContext,
  syncErrors?: ExperienceSyncError,
) {
  if (!syncErrors) {
    return;
  }

  syncErrors = { ...syncErrors };

  const { definitions, ownFields } = syncErrors;

  // istanbul ignore else:
  if (definitions) {
    const list: FieldError = [];
    syncErrors.definitionsErrors = list;

    Object.entries(definitions).forEach(([, errors]) => {
      Object.entries(errors).forEach(([k, v]) => {
        if (v && k !== "__typename" && k !== "id") {
          list.push([k, v]);
        }
      });
    });

    delete syncErrors.definitions;
  }

  // istanbul ignore else:
  if (ownFields) {
    const list: FieldError = [];
    syncErrors.ownFieldsErrors = list;

    Object.entries(ownFields).forEach(([k, v]) => {
      if (v && k !== "__typename") {
        list.push([k, v]);
      }
    });

    delete syncErrors.ownFields;
  }

  context.syncErrors = syncErrors;
}

function handleCommentAction(
  proxy: StateMachine,
  payload: CommentActionPayload,
) {
  const { states: globalStates } = proxy;
  const {
    action: { type },
  } = payload;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    handleHideMenusActions(proxy, ["mainCircular", "entries"]);

    const { upsertingComment, comments: commentsState } = states;

    const commentActive = commentsState as CommentActive;
    const commentsInactive = commentsState;

    switch (type) {
      case CommentRemoteActionType.show:
        {
          commentActive.value = StateValue.active;

          commentActive.active =
            commentActive.active ||
            // istanbul ignore next:
            ({
              context: {
                postActions: [],
              },
            } as CommentActive["active"]);
        }
        break;

      case CommentRemoteActionType.hide:
        {
          commentsState.value = StateValue.inactive;
        }
        break;

      case CommentRemoteActionType.upsert:
        {
          // istanbul ignore else:
          if ((commentsInactive.value = StateValue.inactive)) {
            commentActive.value = StateValue.active;

            commentActive.active =
              commentActive.active ||
              // istanbul ignore next:
              ({
                context: {
                  postActions: [],
                },
              } as CommentActive["active"]);
          }

          upsertingComment.value = StateValue.active;
          commentActive.active.context.postActions = [
            {
              type: CommentRemoteActionType.upsert,
            },
          ];
        }
        break;

      case CommentRemoteActionType.upsert_closed:
        states.upsertingComment.value = StateValue.inactive;
        break;
    }
  }
}

type Menus = "mainCircular" | "entries" | "comments";

const menusObject = {
  // The circular menu at the bottom
  mainCircular: (proxy) => {
    const { states: globalStates } = proxy;

    // istanbul ignore else:
    if (globalStates.value === StateValue.data) {
      const { states } = globalStates.data;
      states.showingOptionsMenu.value = StateValue.inactive;
    }
  },

  // all entries menus
  entries: (proxy) => {
    setEntriesActions(proxy, {
      type: EntriesRemoteActionType.hide_menus,
    });
  },

  // all comments menus
  comments: (proxy) => {
    setCommentActions(proxy, {
      type: CommentRemoteActionType.hide_menus,
    });
  },
} as Record<Menus, (proxy: StateMachine) => void>;

function handleHideMenusActions(proxy: StateMachine, deps: Menus[]) {
  deps.forEach((dep) => {
    menusObject[dep](proxy);
  });
}

function handleEntriesAction(
  proxy: StateMachine,
  payload: EntriesActionPayload,
) {
  const { states: globalStates } = proxy;
  const { action } = payload;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states,
      context: { syncErrors },
    } = globalStates.data;
    handleHideMenusActions(proxy, ["mainCircular", "comments"]);

    const { entries } = states;

    switch (action) {
      case EntriesRemoteActionType.upsert:
        {
          // if an attempt to sync data has failed, then we must fix before
          // an entry can be created
          if (syncErrors) {
            states.syncErrorsMsg.value = StateValue.active;
            return;
          }

          entries.postActions = [
            {
              type: EntriesRemoteActionType.upsert,
            },
          ];
        }
        break;
    }
  }
}

// ====================================================
// START STATE UPDATE HELPERS SECTION
// ====================================================

function unsetStatesHelper(proxy: StateMachine) {
  proxy.effects.general.value = StateValue.noEffect;
  deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

  const { states: globalStates } = proxy;
  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const { comments: commentsState, entries: entriesState } = states;
    entriesState.postActions = [];

    if (commentsState.value === StateValue.active) {
      commentsState.active.context.postActions = [];
    }
  }
}

function setCommentActions(
  proxy: StateMachine,
  ...actions: CommentRemoteAction[]
) {
  const { states: globalStates } = proxy;
  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const { comments: commentsState } = states;

    // istanbul ignore else:
    if (commentsState.value === StateValue.active) {
      commentsState.active.context.postActions.push(...actions);
    }
  }
}

function setEntriesActions(
  proxy: StateMachine,
  ...actions: EntriesRemoteAction[]
) {
  const { states: globalStates } = proxy;
  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const { entries: state } = states;

    state.postActions.push(...actions);
  }
}

// ====================================================
// END STATE UPDATE HELPERS SECTION
// ====================================================

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

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
      case "set-close-update-experience-success-notification":
        {
          timeoutCb = () => {
            dispatch({
              type: ActionType.request_update_ui,
            });
          };
        }
        break;

      case "set-close-delete-fail-notification":
        {
          timeoutCb = () => {
            dispatch({
              type: ActionType.delete,
              value: "closeNotification",
            });
          };
        }
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
    set?: // | "set-close-upsert-entry-created-notification"
    | "set-close-update-experience-success-notification"
      | "set-close-delete-fail-notification";
    clear?: NodeJS.Timeout;
  }
>;

const deleteRequestedEffect: DefDeleteRequestedEffect["func"] = (
  { experienceId },
  _,
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  // Is a request to delete this experience pending?
  const deleteLedger = getDeleteExperienceLedger(experienceId);

  if (deleteLedger && deleteLedger.key === StateValue.requested) {
    // remove flag that indicates delete requested from cache
    // since we'll now process this request
    putOrRemoveDeleteExperienceLedger();

    // do the actual deletion (or ask user for confirmation)
    dispatch({
      type: ActionType.delete,
      value: "request",
      key: deleteLedger.key,
    });
  }
};

type DefDeleteRequestedEffect = EffectDefinition<
  "deleteRequestedEffect",
  {
    experienceId: string;
  }
>;

const cancelDeleteEffect: DefCancelDeleteEffect["func"] = (
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

type DefCancelDeleteEffect = EffectDefinition<
  "cancelDeleteEffect",
  {
    experience: ExperienceDetailViewFragment;
    key: string;
  }
>;

const deleteEffect: DefDeleteEffect["func"] = async (
  { experienceId },
  props,
  ownArgs,
) => {
  const { history, deleteExperiences } = props;
  const { dispatch } = ownArgs;

  try {
    const response = await deleteExperiences({
      input: [experienceId],
    });

    const validResponse =
      response && response.data && response.data.deleteExperiences;

    // :TODO: integration test
    if (!validResponse) {
      dispatch({
        type: ActionType.delete,
        value: "errors",
        errors: [["", GENERIC_SERVER_ERROR]],
      });

      return;
    }

    if (validResponse.__typename === "DeleteExperiencesAllFail") {
      dispatch({
        type: ActionType.delete,
        value: "errors",
        errors: [["", validResponse.error]],
      });

      return;
    }

    const experienceResponse = validResponse.experiences[0];

    if (experienceResponse.__typename === "DeleteExperienceErrors") {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        errors: { id, __typename, ...otherErrors },
      } = experienceResponse;
      const errors: ErrorType = [];

      Object.entries(otherErrors).forEach(([k, v]) => {
        if (v) {
          errors.push([k, v]);
        }
      });

      dispatch({
        type: ActionType.delete,
        value: "errors",
        errors,
      });

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
    dispatch({
      type: ActionType.delete,
      value: "errors",
      errors: [["", GENERIC_SERVER_ERROR]],
    });
  }
};

type DefDeleteEffect = EffectDefinition<
  "deleteEffect",
  {
    experienceId: string;
  }
>;

const fetchEffect: DefFetchEffect["func"] = (_, props, { dispatch }) => {
  const {
    componentTimeoutsMs: { fetchRetries },
    getExperienceAndEntriesDetailView,
  } = props;

  const experienceId = getExperienceId(props);
  let fetchAttemptsCount = 0;
  let timeoutId: null | NodeJS.Timeout = null;
  const timeoutsLen = fetchRetries.length - 1;

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
      type: ActionType.on_fetched,
      experienceData,
      syncErrors: newSyncErrors,
    });

    return;
  }

  async function doFetch() {
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
        (data && data.data) ||
        // istanbul ignore next:
        ({} as GetExperienceAndEntriesDetailView);

      const [experienceData, newSyncErrors] = processGetExperienceQuery(
        daten.getExperience || null,
        daten.getEntries,
        syncErrors,
      );

      dispatch({
        type: ActionType.on_fetched,
        experienceData,
        syncErrors: newSyncErrors,
      });
    } catch (error) {
      dispatch({
        type: ActionType.on_fetched,
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

  function schedule() {
    // we are connected
    if (getIsConnected()) {
      doFetch();
      return;
    }

    // we were never able to connect
    if (fetchAttemptsCount > timeoutsLen) {
      dispatch({
        type: ActionType.on_fetched,
        experienceData: {
          key: StateValue.errors,
          error: DATA_FETCHING_FAILED,
        },
      });

      return;
    }

    timeoutId = setTimeout(schedule, fetchRetries[fetchAttemptsCount++]);
  }

  schedule();
};

type DefFetchEffect = EffectDefinition<"fetchEffect">;

const postOfflineExperiencesSyncEffect: DefPostOfflineExperiencesSyncEffect["func"] = async ({
  data,
  onlineIdToOfflineId,
}) => {
  // istanbul ignore else:
  if (Object.keys(data).length) {
    cleanUpOfflineExperiences(data);
  }

  const { persistor } = window.____ebnis;

  // istanbul ignore else:
  if (onlineIdToOfflineId) {
    const [onlineId] = onlineIdToOfflineId;

    putOfflineExperienceIdInSyncFlag(onlineIdToOfflineId);

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
    onlineIdToOfflineId?: [string, string];
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
  timeoutsEffect,
  cancelDeleteEffect,
  deleteRequestedEffect,
  deleteEffect,
  fetchEffect,
  postOfflineExperiencesSyncEffect,
  postOfflineEntriesSyncEffect,
  deleteCreateEntrySyncErrorEffect,
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

function processCreateEntriesErrors(
  entryErrors: IndexToEntryErrorsList,
  { dataObjects, ...errors }: CreateEntryErrorFragment,
  index: number,
) {
  const processedErrors: EntryErrorsList = {};
  entryErrors.push([index + 1, processedErrors]);

  const others: [string, string][] = [];

  Object.entries(errors).forEach(([k, v]) => {
    if (v && k !== "__typename" && k !== "meta") {
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

  return entryErrors;
}

function processDataObjectsErrors(dataObjects: DataObjectErrorFragment[]) {
  const dataErrorList: DataObjectErrorsList = [];

  dataObjects.forEach((d) => {
    const list: [string, string][] = [];

    const {
      meta: { index: dIndex },
      ...errors
    } = d as DataObjectErrorFragment;

    Object.entries(errors).forEach(([k, v]) => {
      if (v && k !== "__typename") {
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

export type EntriesData = {
  value: ActiveVal | InActiveVal;
  postActions: EntriesRemoteAction[];
  entriesData: ProcessedEntriesQueryReturnVal;
  syncErrors?: EntriesSyncErrors;
};

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
      notification:
        | {
            value: InActiveVal;
          }
        | NotificationActive;
      deleteExperience: DeleteExperienceState;
      showingOptionsMenu: ShowingOptionsMenuState;
      entries: EntriesData;
      updateUiActive:
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
      upsertingComment: {
        value: InActiveVal | ActiveVal;
      };
      comments:
        | {
            value: InActiveVal;
          }
        | CommentActive;
    };
  };
};

export type CommentActive = {
  value: ActiveVal;
  active: {
    context: {
      postActions: CommentRemoteAction[];
    };
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
    states: DeleteRequested | DeleteErrors;
  };
};

type DeleteRequested = {
  value: RequestedVal;
  key?: RequestedVal; // with key, we know request came from 'my' component
};

type DeleteErrors = {
  value: ErrorsVal;
  errors: ErrorType;
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

export type CallerProps = RouteChildrenProps<
  DetailExperienceRouteMatch,
  {
    delete: boolean;
  }
>;

export type Props = DeleteExperiencesComponentProps &
  CallerProps &
  UpdateExperiencesMutationProps & {
    componentTimeoutsMs: ComponentTimeoutsMs;
    getExperienceComments: GetExperienceCommentsFn;
    getExperienceAndEntriesDetailView: GetExperienceAndEntriesDetailViewFn;
  };

export type Match = match<DetailExperienceRouteMatch>;

export type Action =
  | ({
      type: ActionType.record_timeout;
    } & SetTimeoutPayload)
  | ({
      type: ActionType.delete;
    } & DeletePayload)
  | ({
      type: ActionType.toggle_menu;
    } & ToggleMenuPayload)
  | ({
      type: ActionType.on_fetched;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.re_fetch;
    }
  | ({
      type: ActionType.request_update_ui;
    } & UpdateExperiencePayload)
  | ({
      type: ActionType.on_sync;
    } & OnSyncedData)
  | {
      type: ActionType.close_sync_errors_msg;
    }
  | ({
      type: ActionType.comment_action;
    } & CommentActionPayload)
  | ({
      type: ActionType.hide_menus;
    } & HideMenusPayload)
  | ({
      type: ActionType.entries_actions;
    } & EntriesActionPayload);

type DeletePayload =
  | {
      value: "request";
      key?: RequestedVal;
    }
  | {
      value: "cancelled";
    }
  | {
      value: "errors";
      errors: ErrorType;
    }
  | {
      value: "confirmed";
    }
  | {
      value: "closeNotification";
    };

type EntriesActionPayload = {
  action: EntriesRemoteActionType;
};

type HideMenusPayload = {
  menus: Menus[];
};

type CommentActionPayload = {
  action: CommentRemoteAction;
};

type UpdateExperiencePayload = WithMayBeExperiencePayload & {
  onlineStatus?: OnlineStatus;
};

type WithMayBeExperiencePayload = {
  experience?: ExperienceDetailViewFragment;
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

export interface DataDefinitionIdToNameMap {
  [dataDefinitionId: string]: string;
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
  | DefTimeoutsEffect
  | DefCancelDeleteEffect
  | DefDeleteRequestedEffect
  | DefDeleteEffect
  | DefFetchEffect
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
