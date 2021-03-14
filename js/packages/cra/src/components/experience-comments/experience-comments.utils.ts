import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import { GetExperienceCommentsErrorsFragment_errors } from "@eb/cm/src/graphql/apollo-types/GetExperienceCommentsErrorsFragment";
import { ComponentTimeoutsMs } from "@eb/cm/src/utils/timers";
import {
  ActiveVal,
  DataVal,
  EmptyVal,
  ErrorsVal,
  InActiveVal,
  InitialVal,
  KeyOfTimeouts,
  StateValue,
  SuccessVal,
  Timeouts,
} from "@eb/cm/src/utils/types";
import immer, { Draft } from "immer";
import { Dispatch, Reducer } from "react";
import {
  readExperienceCompleteFragment,
  writeCachedExperienceCompleteFragment,
} from "../../apollo/get-detailed-experience-query";
import { wrapReducer, wrapState } from "@eb/cm/src/logger";
import { deleteObjectKey } from "../../utils";
import { DATA_FETCHING_FAILED, ErrorType } from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import {
  GetExperienceCommentsFn,
  GetExperienceCommentsQueryResult,
} from "../../utils/experience.gql.types";
import { UpdateExperiencesMutationProps } from "../../utils/update-experiences.gql";
import { scrollDocumentToTop } from "../DetailExperience/detail-experience.injectables";
import {
  ActionType as ParentActionType,
  DispatchType as ParentDispatchType,
  Action as ParentAction,
} from "../DetailExperience/detailed-experience-utils";

export enum CommentRemoteActionType {
  upsert = "@experience-comments/remote/upsert",
  show = "@experience-comments/remote/show",
  hide = "@experience-comments/remote/hide",
  delete = "@experience-comments/remote/delete",
  hide_menus = "@experience-comments/remote/hide-menus",
  upsert_closed = "@experience-comments/remote/upsert-closed",
}

export enum ActionType {
  on_fetched = "@experience-comments/on-fetched",
  on_deleted = "@experience-comments/on-deleted",
  on_upsert = "@experience-comments/on-upsert",
  close_upsert_ui = "@experience-comments/close-upsert-ui",
  upsert = "@experience-comments/upsert",
  record_timeout = "@experience-comment/record-timeout",
  close_notification = "@experience-comment/close-notification",
  toggle_menu = "@experience-comment/toggle-menu",
  delete_prompt = "@experience-comment/delete-prompt",
  yes_delete = "@experience-comment/yes-delete",
  from_parent_post_actions = "@experience-comment/from-parent-post-actions",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (states) => {
      const proxy = states as StateMachine;
      proxy.effects.general.value = StateValue.noEffect;
      deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

      switch (type) {
        case ActionType.on_fetched:
          handleOnFetchedAction(proxy, payload as ReceivedPayload);
          break;

        case ActionType.upsert:
          handleUpsertAction(proxy);
          break;

        case ActionType.on_upsert:
          handleOnUpsertAction(proxy, payload as OnUpsertPayload);
          break;

        case ActionType.record_timeout:
          handleRecordTimeoutAction(proxy, payload as SetTimeoutPayload);
          break;

        case ActionType.close_notification:
          handleCloseNotificationAction(proxy);
          break;

        case ActionType.toggle_menu:
          handleToggleMenuAction(proxy, payload as WithOneIdPayload);
          break;

        case ActionType.delete_prompt:
          handleDeletePromptAction(proxy, payload as WithManyIdsPayload);
          break;

        case ActionType.yes_delete:
          handleDeleteOkAction(proxy);
          break;

        case ActionType.on_deleted:
          handleOnDeletedAction(proxy, payload as OnDeletedPayload);
          break;

        case ActionType.close_upsert_ui:
          handleCloseUpsertUi(proxy);
          break;

        case ActionType.from_parent_post_actions:
          handleParentPostAction(proxy, payload as ParentActionPayload);
          break;
      }
    });
  });

// ====================================================
// START state update section
// ====================================================

export function initState(props: Props): StateMachine {
  const { experience } = props;

  const state: StateMachine = {
    id: "@experience-comments",
    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "fetchEffect",
              },
            ] as any,
          },
        },
      },
    },
    context: {
      experience,
    },
    timeouts: {},
    states: {
      upserting: {
        value: StateValue.inactive,
      },
      notification: {
        value: StateValue.inactive,
      },
      data: {
        value: StateValue.initial,
      },
    },
  };

  return wrapState<StateMachine>(state);
}

function handleOnFetchedAction(proxy: DraftState, payload: ReceivedPayload) {
  const state = proxy.states.data;

  switch (payload.value) {
    case StateValue.success:
      {
        const dataState = state as ListState;
        const emptyState = state as ListEmpty;
        const { comments } = payload;

        if (comments.length === 0) {
          emptyState.value = StateValue.empty;
        } else {
          dataState.value = StateValue.success;

          const success =
            dataState.success ||
            // istanbul ignore next:
            getInitialListState();

          dataState.success = success;

          success.context = {
            comments,
          };
        }
      }
      break;

    case StateValue.errors:
      {
        const errorState = state as ListError;
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

function handleUpsertAction(proxy: DraftState) {
  proxy.states.upserting.value = StateValue.active;
}

function handleOnUpsertAction(proxy: DraftState, payload: OnUpsertPayload) {
  const {
    states: { data, upserting },
  } = proxy;

  upserting.value = StateValue.inactive;
  const { data: comment } = payload;
  const dataState = data as ListState;

  const effects = getEffects(proxy);
  effects.push({
    key: "parentEffects",
    ownArgs: {
      type: ParentActionType.hide_menus,
      menus: ["mainCircular"],
    },
  });

  switch (data.value) {
    case StateValue.success:
      {
        const successState = dataState;
        successState.success.context.comments.unshift(comment);
        commentCreated(proxy);
      }
      break;

    case StateValue.empty:
    case StateValue.initial:
      {
        dataState.value = StateValue.success;

        const success =
          dataState.success ||
          // istanbul ignore next:
          getInitialListState();

        dataState.success = success;
        success.context = {
          comments: [comment],
        };

        commentCreated(proxy);
      }
      break;
  }
}

function handleRecordTimeoutAction(
  proxy: DraftState,
  payload: SetTimeoutPayload,
) {
  const { timeouts } = proxy;
  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key as KeyOfTimeouts] = val;
  });
}

function handleCloseNotificationAction(proxy: DraftState) {
  proxy.states.notification.value = StateValue.inactive;
  delete proxy.timeouts.genericTimeout;
}

function handleToggleMenuAction(
  proxy: DraftState,
  payload: Partial<WithOneIdPayload>,
) {
  const { id } = payload;
  const {
    states: { data },
  } = proxy;

  // istanbul ignore else:
  if (data.value === StateValue.success) {
    const { menu } = data.success.states;
    const inactive = menu;

    if (!id) {
      inactive.value = StateValue.inactive;
      return;
    }

    const active = menu;

    if (active.value === StateValue.active) {
      const context = active.active.context;
      if (context.id !== id) {
        context.id = id;
        return;
      }

      inactive.value = StateValue.inactive;
      return;
    }

    inactive.value = StateValue.active;

    (inactive as MenuState).active = {
      context: {
        id,
      },
    };

    const effects = getEffects(proxy);
    effects.push({
      key: "parentEffects",
      ownArgs: {
        type: ParentActionType.hide_menus,
        menus: ["mainCircular", "entries"],
      },
    });
  }
}

function handleDeletePromptAction(
  proxy: DraftState,
  payload: WithManyIdsPayload,
) {
  const {
    states: { data },
  } = proxy;

  // istanbul ignore else:
  if (data.value === StateValue.success) {
    const { deletePrompt, menu } = data.success.states;
    menu.value = StateValue.inactive;

    const active = deletePrompt;
    const inactive = deletePrompt;

    const { ids } = payload;

    if (ids) {
      active.value = StateValue.active;
      (active as DeletePromptState).active = {
        context: {
          ids,
        },
      };
    } else {
      inactive.value = StateValue.inactive;
    }
  }
}

function handleDeleteOkAction(proxy: DraftState) {
  const {
    states: { data },
  } = proxy;

  // istanbul ignore else:
  if (data.value === StateValue.success) {
    const { deletePrompt, deleting } = data.success.states;
    deleting.value = StateValue.active;

    const deleteCommentPromptInactive = deletePrompt;

    // istanbul ignore else:
    if (deletePrompt.value === StateValue.active) {
      deleteCommentPromptInactive.value = StateValue.inactive;

      const effects = getEffects(proxy);
      effects.push({
        key: "deleteEffect",
        ownArgs: {
          ids: deletePrompt.active.context.ids,
        },
      });
    }
  }
}

function handleOnDeletedAction(proxy: DraftState, payload: OnDeletedPayload) {
  const {
    states: { data },
  } = proxy;

  // istanbul ignore else:
  if (data.value === StateValue.success) {
    switch (payload.value) {
      case StateValue.data:
        {
          const {
            data: { successes, failures },
          } = payload;

          const {
            context,
            states: { deleted, deleting },
          } = data.success;

          deleting.value = StateValue.inactive;

          const comments = context.comments;
          const remainingComments: typeof comments = [];
          context.comments = remainingComments;

          let successCount = 0;
          let failureCount = 0;

          comments.forEach((comment) => {
            const { id } = comment;

            if (successes[id]) {
              ++successCount;
            } else {
              remainingComments.push(comment);
            }

            if (failures[id]) {
              ++failureCount;
            }
          });

          const s = deleted as DeletedState;
          s.value = StateValue.active;
          s.active = {
            context: {
              successCount,
              failureCount,
              failures,
            },
          };
        }
        break;
    }
  }
}

function handleCloseUpsertUi(proxy: DraftState) {
  proxy.states.upserting.value = StateValue.inactive;

  const effects = getEffects(proxy);
  effects.push({
    key: "parentEffects",
    ownArgs: {
      type: ParentActionType.comment_action,
      action: {
        type: CommentRemoteActionType.upsert_closed,
      },
    },
  });
}

const parentActionsObject = {
  [CommentRemoteActionType.upsert]: (proxy) => {
    handleUpsertAction(proxy);
  },
  [CommentRemoteActionType.hide_menus]: (proxy) => {
    handleToggleMenuAction(proxy, {});
  },
} as Record<CommentRemoteActionType, (proxy: DraftState) => void>;

function handleParentPostAction(
  proxy: DraftState,
  payload: ParentActionPayload,
) {
  const { actions } = payload;

  actions.forEach(({ type }) => {
    parentActionsObject[type as keyof typeof parentActionsObject](proxy);
  });
}

function getEffects(proxy: DraftState) {
  return getGeneralEffects<EffectType, DraftState>(proxy);
}

// ====================================================
// END state update section
// ====================================================

// ====================================================
// START STATE UPDATE HELPERS SECTION
// ====================================================

function getInitialListState() {
  return {
    states: {
      deleted: {
        value: StateValue.inactive,
      },
      deleting: {
        value: StateValue.inactive,
      },
      deletePrompt: {
        value: StateValue.inactive,
      },
      menu: {
        value: StateValue.inactive,
      },
    },
  } as ListState["success"];
}

function commentCreated(proxy: DraftState) {
  const {
    states: { notification },
  } = proxy;

  const active = notification as NotificationState;

  active.value = StateValue.active;
  active.active = {
    context: {
      message: "Comment created successfully!",
    },
  };

  const effects = getEffects(proxy);

  effects.push({
    key: "timeoutsEffect",
    ownArgs: {
      set: "set-close-comment-notification",
    },
  });
}

// ====================================================
// END STATE UPDATE HELPERS SECTION
// ====================================================

const fetchEffect: DefFetchEffect["func"] = async (_, props, effectArgs) => {
  const { dispatch } = effectArgs;

  const {
    experience: { id: experienceId },
    componentTimeoutsMs: { fetchRetries },
    getExperienceComments,
  } = props;

  const variables = {
    experienceId,
  };

  const maybeCachedExperience = readExperienceCompleteFragment(experienceId);

  if (maybeCachedExperience) {
    const { comments } = maybeCachedExperience;

    if (comments && comments.length) {
      dispatch({
        type: ActionType.on_fetched,
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
      const result =
        (await getExperienceComments(variables)) ||
        // istanbul ignore next:
        ({} as GetExperienceCommentsQueryResult);

      const { data } = result;

      if (data) {
        const maybeCommentsData = data.getExperienceComments;

        switch (maybeCommentsData?.__typename) {
          case "GetExperienceCommentsSuccess":
            {
              const { comments } = maybeCommentsData;
              const commentsList = comments as CommentFragment[];

              dispatch({
                type: ActionType.on_fetched,
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
              type: ActionType.on_fetched,
              value: StateValue.errors,
              errors: maybeCommentsData.errors,
            });
            break;
        }
      } else {
        dispatch({
          type: ActionType.on_fetched,
          value: StateValue.errors,
          errors: {
            error: DATA_FETCHING_FAILED,
          } as GetExperienceCommentsErrorsFragment_errors,
        });
      }
    } catch (error) {
      dispatch({
        type: ActionType.on_fetched,
        value: StateValue.errors,
        errors: {
          error: DATA_FETCHING_FAILED,
        } as GetExperienceCommentsErrorsFragment_errors,
      });
    }

    scrollDocumentToTop();

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
        type: ActionType.on_fetched,
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

type DefFetchEffect = EffectDefinition<"fetchEffect">;

const deleteEffect: DefDeleteEffect["func"] = async (
  { ids },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  const {
    updateExperiencesMutation,
    experience: { id: experienceId },
  } = props;
  const lens = ids.length;

  await updateExperiencesMutation({
    input: [
      {
        deletedComments: ids,
        experienceId,
      },
    ],
    onUpdateSuccess: (result) => {
      const deletes = result && result.comments && result.comments.deletes;

      if (deletes) {
        const successes: OnDeletedSomeSuccessPayload["data"]["successes"] = {};
        const failures: OnDeletedSomeSuccessPayload["data"]["failures"] = {};

        deletes.forEach((d) => {
          switch (d.__typename) {
            case "CommentSuccess":
              successes[d.comment.id] = true;
              break;

            // :TODO: test
            case "CommentUnionErrors":
              {
                const {
                  errors: { meta, errors },
                } = d;

                failures[meta.id] = Object.entries(errors).reduce(
                  (acc, [k, v]) => {
                    const errors = acc[0];
                    let index = acc[1];

                    if (v && k !== "__typename") {
                      errors.push(["" + index++, v]);
                    }

                    acc = [errors, index];

                    return acc;
                  },

                  [[], 1] as [ErrorType, number],
                )[0];
              }
              break;
          }
        });

        dispatch({
          type: ActionType.on_deleted,
          value: StateValue.data,
          data: {
            successes,
            failures,
          },
        });
      } else {
        dispatch({
          type: ActionType.on_deleted,
          value: StateValue.errors,
          error: `Unable to delete ${lens} comment(s)`,
        });
      }
    },
    onError: () => {
      dispatch({
        type: ActionType.on_deleted,
        value: StateValue.errors,
        error: `Unable to delete ${lens} comment(s)`,
      });
    },
  });
};

type DefDeleteEffect = EffectDefinition<
  "deleteEffect",
  {
    ids: string[];
  }
>;

const timeoutsEffect: DefTimeoutsEffect["func"] = (
  { set },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const {
    componentTimeoutsMs: { closeNotification: closeNotificationTimeout },
  } = props;

  let timeoutCb = (undefined as unknown) as () => void;

  switch (set) {
    case "set-close-comment-notification":
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
};

type DefTimeoutsEffect = EffectDefinition<
  "timeoutsEffect",
  {
    set?: "set-close-comment-notification";
    clear?: NodeJS.Timeout;
  }
>;

const parentEffects: DefParentEffect["func"] = (ownArgs, props, effectArgs) => {
  const { parentDispatch } = effectArgs;
  parentDispatch(ownArgs);
};

type DefParentEffect = EffectDefinition<"parentEffects", ParentAction>;

export const effectFunctions = {
  fetchEffect,
  deleteEffect,
  timeoutsEffect,
  parentEffects,
};

export type StateMachine = GenericGeneralEffect<EffectType> & {
  context: {
    experience: ExperienceDetailViewFragment;
  };
  timeouts: Timeouts;
  states: {
    upserting:
      | {
          value: InActiveVal;
        }
      | UpsertActive;
    notification:
      | {
          value: InActiveVal;
        }
      | NotificationState;
    data: DataState;
  };
};

type DraftState = Draft<StateMachine>;

type DataState =
  | {
      value: InitialVal;
    }
  | ListState
  | ListError
  | ListEmpty;

export type EffectType =
  | DefFetchEffect
  | DefDeleteEffect
  | DefTimeoutsEffect
  | DefParentEffect;

type ListState = {
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
        | MenuState;
      deletePrompt:
        | {
            value: InActiveVal;
          }
        | DeletePromptState;
      deleting:
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          };
      deleted:
        | {
            value: InActiveVal;
          }
        | DeletedState;
    };
  };
};

type ListError = {
  value: ErrorsVal;
  errors: {
    context: {
      error: GetExperienceCommentsErrorsFragment_errors["error"];
    };
  };
};

type ListEmpty = {
  value: EmptyVal;
};

// remove export keyword
export type DeleteState = DeletePromptState | DeletedState | DeletingState;

type DeletingState = {
  value: ActiveVal;
};

type DeletedState = {
  value: ActiveVal;
  active: {
    context: {
      successCount: number;
      failureCount: number;
      failures: OnDeletedSomeSuccessPayload["data"]["failures"];
    };
  };
};

type DeletePromptState = {
  value: ActiveVal;
  active: {
    context: {
      ids: string[];
    };
  };
};

type UpsertActive = {
  value: ActiveVal;
};

type NotificationState = {
  value: ActiveVal;
  active: {
    context: {
      message: string;
    };
  };
};

type MenuState = {
  value: ActiveVal;
  active: {
    context: {
      id: string;
    };
  };
};

type Action =
  | ({
      type: ActionType.on_deleted;
    } & OnDeletedPayload)
  | ({
      type: ActionType.on_fetched;
    } & ReceivedPayload)
  | ({
      type: ActionType.on_upsert;
    } & OnUpsertPayload)
  | {
      type: ActionType.close_upsert_ui;
    }
  | {
      type: ActionType.upsert;
    }
  | ({
      type: ActionType.record_timeout;
    } & SetTimeoutPayload)
  | {
      type: ActionType.close_notification;
    }
  | ({
      type: ActionType.toggle_menu;
    } & Partial<WithOneIdPayload>)
  | ({
      type: ActionType.delete_prompt;
    } & Partial<WithManyIdsPayload>)
  | {
      type: ActionType.yes_delete;
    }
  | ({
      type: ActionType.from_parent_post_actions;
    } & ParentActionPayload);

export type CommentRemoteAction =
  | {
      type: CommentRemoteActionType.upsert;
    }
  | {
      type: CommentRemoteActionType.show;
    }
  | {
      type: CommentRemoteActionType.hide;
    }
  | {
      type: CommentRemoteActionType.delete;
    }
  | {
      type: CommentRemoteActionType.hide_menus;
    }
  | {
      type: CommentRemoteActionType.upsert_closed;
    };

type ParentActionPayload = {
  actions: CommentRemoteAction[];
};

type WithManyIdsPayload = {
  ids: string[];
};

type WithOneIdPayload = {
  id: string;
};

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

type OnUpsertPayload = {
  data: CommentFragment;
};

export type CallerProps = {
  experience: ExperienceDetailViewFragment;
  postActions: CommentRemoteAction[];
};

export type Props = CallerProps &
  UpdateExperiencesMutationProps & {
    componentTimeoutsMs: ComponentTimeoutsMs;
    getExperienceComments: GetExperienceCommentsFn;
  };

export type DispatchType = Dispatch<Action>;

export type EffectArgs = {
  dispatch: DispatchType;
  parentDispatch: ParentDispatchType;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Record<string, unknown>
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type ReceivedPayload =
  | {
      value: SuccessVal;
      comments: CommentFragment[];
    }
  | {
      value: ErrorsVal;
      errors: GetExperienceCommentsErrorsFragment_errors;
    };

type OnDeletedPayload = OnDeletedSomeSuccessPayload | OnDeletedAllFailPayload;

type OnDeletedAllFailPayload = {
  value: ErrorsVal;
  error: string;
};

export type OnDeletedSomeSuccessPayload = {
  value: DataVal;
  data: {
    successes: Record<string, true>;
    failures: Record<string, ErrorType>;
  };
};
