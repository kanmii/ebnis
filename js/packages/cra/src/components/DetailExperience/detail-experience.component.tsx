import { Button } from "@eb/jsx/src/Button";
import Modal from "@eb/jsx/src/Modal";
import { Notification } from "@eb/jsx/src/Notification";
import { setUpRoutePage } from "@eb/shared/src/global-window";
import { ReactComponent as ExclamationErrorSvg } from "@eb/shared/src/styles/exclamation-error.svg";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, {
  Fragment,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
} from "react";
import { useRunEffects } from "../../utils/use-run-effects";
import { activeClassName } from "../../utils/utils.dom";
import { EntriesInjectType } from "../entries/entries.default";
import { EntriesRemoteActionType } from "../entries/entries.utils";
import {
  createCommentsLabelText,
  createCommentsMenuId,
  hideCommentsLabelText,
  hideCommentsMenuId,
  showCommentsLabelText,
  showCommentsMenuId,
} from "../experience-comments/experience-comments.dom";
import { CommentRemoteActionType } from "../experience-comments/experience-comments.utils";
import { LoadingComponentType } from "../Loading/loading.component";
import { UpsertExperienceInjectType } from "../My/my.lazy";
import {
  DataStateContext,
  DataStateProvider,
  DispatchContext,
  DispatchContextValue,
  DispatchProvider,
} from "./detail-experience.context";
import {
  closeSyncErrorsMsgBtnId,
  closeSyncErrorsMsgId,
  deleteFailNotificationCloseId,
  deleteFooterCloseId,
  deleteHeaderCloseId,
  deleteMenuItemId,
  deleteOkId,
  domPrefix,
  fixSyncErrorsId,
  menuSelector,
  menuTriggerSelector,
  newEntryMenuItemSelector,
  noTriggerDocumentEventClassName,
  refetchId,
  syncEntriesErrorsMsgId,
  syncErrorsNotificationId,
  syncExperienceErrorsMsgId,
  updateMenuItemId,
  updateSuccessNotificationId,
} from "./detail-experience.dom";
import { CommentsInjectType } from "./detail-experience.lazy";
import {
  ActionType,
  effectFunctions,
  ExperienceSyncError,
  initState,
  Props,
  reducer,
} from "./detailed-experience-utils";

export function DetailExperience(props: Props) {
  const {
    HeaderComponentFn,
    LoadingComponentInject: LoadingComponentFn,
    useWithSubscriptionContextInject,
    clearTimeoutFnInject,
    UpsertExperienceInject,
    CommentsInject,
    EntriesInject,
  } = props;

  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states,
    effects: { general: generalEffects },
    timeouts: { genericTimeout },
  } = stateMachine;

  const stateValue = states.value;

  const { onSyncData } = useWithSubscriptionContextInject();

  useEffect(() => {
    if (onSyncData && stateValue === StateValue.data) {
      dispatch({
        type: ActionType.on_sync,
        ...onSyncData,
      });
    }
  }, [onSyncData, stateValue]);

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
  });

  useEffect(() => {
    return () => {
      if (genericTimeout) {
        clearTimeoutFnInject(genericTimeout);
      }
    };
  }, [genericTimeout]);

  const dispatchContextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      useWithSubscriptionContextInject,
      onDeleteDeclined() {
        dispatch({
          type: ActionType.delete,
          value: "cancelled",
        });
      },
      onDeleteConfirmed() {
        dispatch({
          type: ActionType.delete,
          value: "confirmed",
        });
      },
      onDeleteRequested(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.delete,
          value: "request",
        });
      },
      toggleMenuCb() {
        dispatch({
          type: ActionType.toggle_menu,
        });
      },
      requestUpdateUiCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.request_update_ui,
        });
      },
      cancelUpdateUiRequestCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.request_update_ui,
        });
      },
      onUpdateSuccess(experience, onlineStatus) {
        dispatch({
          type: ActionType.request_update_ui,
          experience,
          onlineStatus,
        });
      },
      // istanbul ignore next:
      onUpdateError() {
        //
      },
      closeSyncErrorsMsg(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.close_sync_errors_msg,
        });
      },
      refetchCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.re_fetch,
        });
      },
      commentCb(_e, action) {
        dispatch({
          type: ActionType.comment_action,
          action,
        });
      },
    };
  }, []);

  return (
    <>
      <HeaderComponentFn />

      <div>
        <DispatchProvider value={dispatchContextVal}>
          {(function renderDetailExperience() {
            switch (states.value) {
              case StateValue.loading:
                return <LoadingComponentFn />;

              case StateValue.errors:
                return (
                  <>
                    {states.errors.context.error}

                    <Button
                      id={refetchId}
                      className="block mt-[25px] min-w-[150px]"
                      onClick={dispatchContextVal.refetchCb}
                    >
                      Refetch
                    </Button>
                  </>
                );

              case StateValue.data: {
                return (
                  <>
                    <DataStateProvider value={states.data}>
                      <ExperienceComponent
                        LoadingComponentInject={LoadingComponentFn}
                        UpsertExperienceInject={UpsertExperienceInject}
                        CommentsInject={CommentsInject}
                        EntriesInject={EntriesInject}
                      />
                      <MenuComponent />
                    </DataStateProvider>
                  </>
                );
              }
            }
          })()}
        </DispatchProvider>
      </div>
    </>
  );
}

function ExperienceComponent(
  props: LoadingComponentType &
    UpsertExperienceInjectType &
    CommentsInjectType &
    EntriesInjectType,
) {
  const {
    LoadingComponentInject: LoadingComponentFn,
    UpsertExperienceInject,
    CommentsInject,
    EntriesInject,
  } = props;

  const {
    dispatch,
    cancelUpdateUiRequestCb,
    onUpdateSuccess,
    onUpdateError,
    requestUpdateUiCb,
    onDeleteDeclined: onDeleteDeclined,
    onDeleteConfirmed: onDeleteConfirmed,
  } = useContext(DispatchContext);

  const {
    context,
    states: {
      deleteExperience: deleteState,
      entries: entriesState,
      updateUiActive,
      syncErrorsMsg,
      comments: commentsState,
    },
  } = useContext(DataStateContext);

  const { experience, syncErrors } = context;

  useLayoutEffect(() => {
    setUpRoutePage({
      title: experience.title,
    });

    function onDocClicked(event: Event) {
      const target = event.target as HTMLElement;

      if (
        target.classList.contains(noTriggerDocumentEventClassName) ||
        target.closest(`.${noTriggerDocumentEventClassName}`)
      ) {
        return;
      }

      dispatch({
        type: ActionType.toggle_menu,
        key: "close",
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
  }, [experience]);

  return (
    <>
      {updateUiActive.value === StateValue.active && (
        <Suspense fallback={<LoadingComponentFn />}>
          <UpsertExperienceInject
            experience={experience}
            onClose={cancelUpdateUiRequestCb}
            onSuccess={onUpdateSuccess}
            onError={onUpdateError}
            className={noTriggerDocumentEventClassName}
          />
        </Suspense>
      )}

      {deleteState.value === StateValue.active &&
        deleteState.active.states.value === StateValue.requested && (
          <Modal
            className={noTriggerDocumentEventClassName}
            onClose={onDeleteDeclined}
          >
            <Modal.Card>
              <Modal.Header id={deleteHeaderCloseId}>
                <strong>Delete Experience</strong>
                <div>{experience.title}</div>
              </Modal.Header>
              <Modal.Footer>
                <Button
                  id={deleteOkId}
                  type="button"
                  btnType={ComponentColorType.is_danger}
                  onClick={onDeleteConfirmed}
                >
                  Ok
                </Button>
                <Button
                  id={deleteFooterCloseId}
                  type="button"
                  onClick={onDeleteDeclined}
                  btnType={ComponentColorType.is_success}
                  className="ml-5"
                >
                  Cancel
                </Button>
              </Modal.Footer>
            </Modal.Card>
          </Modal>
        )}

      {syncErrorsMsg.value === StateValue.active && (
        <PromptToFixSyncErrorNotificationComponent />
      )}

      <div
        id={domPrefix}
        className={cn("detailed-experience-component")}
        style={{
          paddingBottom: "calc(var(--floatingCircularBottom) * 2.66)",
          paddingTop: "10px",
        }}
      >
        {syncErrors && <SyncErrorsNotificationComponent state={syncErrors} />}

        {updateUiActive.value === StateValue.success && (
          <Notification
            close={{
              onClose: requestUpdateUiCb,
              id: updateSuccessNotificationId,
            }}
            type={ComponentColorType.is_success}
          >
            Update was successful
          </Notification>
        )}

        {deleteState.value === StateValue.active &&
          deleteState.active.states.value === StateValue.errors && (
            <Notification
              close={{
                onClose: () => {
                  dispatch({
                    type: ActionType.delete,
                    value: "closeNotification",
                  });
                },
                id: deleteFailNotificationCloseId,
              }}
              type={ComponentColorType.is_danger}
              className={cn("mb-5", noTriggerDocumentEventClassName)}
            >
              <div className="flex mb-2 pl-1 pr-2 font-semibold">
                <div
                  className="flex-shrink-0"
                  style={{
                    width: "24px",
                  }}
                >
                  <ExclamationErrorSvg />
                </div>
                <div className="flex-grow ml-2">
                  Errors while deleting experience
                </div>
              </div>
              <ul className="ml-5 mt-2">
                {deleteState.active.states.errors.map(([key, error]) => {
                  return (
                    <li
                      key={key}
                      className={`
                        list-disc
                         mb-2
                      `}
                    >
                      {error}
                    </li>
                  );
                })}
              </ul>
            </Notification>
          )}

        {commentsState.value === StateValue.active && (
          <CommentsInject
            postActions={commentsState.active.context.postActions}
            experience={experience}
            parentDispatch={dispatch}
          />
        )}

        <EntriesInject
          {...entriesState}
          experience={experience}
          parentDispatch={dispatch}
        />
      </div>
    </>
  );
}

function SyncErrorsNotificationComponent(props: {
  state: ExperienceSyncError;
}) {
  const { state } = props;

  const { entriesErrors, definitionsErrors, ownFieldsErrors } = state;

  return (
    <Notification
      type={ComponentColorType.is_danger}
      className={noTriggerDocumentEventClassName}
      id={syncErrorsNotificationId}
    >
      <p>There were errors while uploading changes for this item</p>

      <div>
        {ownFieldsErrors &&
          ownFieldsErrors.map(([k, v]) => {
            return (
              <div key={k}>
                <span>{k}: </span>
                <span>{v}</span>
              </div>
            );
          })}

        {definitionsErrors &&
          definitionsErrors.map(([k, v]) => {
            return (
              <div key={k}>
                <span>{k}: </span>
                <span>{v}</span>
              </div>
            );
          })}

        {entriesErrors &&
          entriesErrors.map(([, { others, dataObjects }], entryIndex) => {
            return (
              <Fragment key={entryIndex}>
                <strong>Entry #{entryIndex + 1}</strong>

                <div
                  className="relative"
                  style={{
                    left: "10px",
                  }}
                >
                  {others &&
                    others.map(([k, v]) => {
                      return (
                        <div key={k}>
                          <span>{k}: </span>
                          <span>{v}</span>
                        </div>
                      );
                    })}

                  {dataObjects &&
                    dataObjects.map(([dataIndex, errors]) => {
                      return (
                        <div key={dataIndex}>
                          <div>Data #{dataIndex}</div>
                          {errors.map(([k, v]) => {
                            return (
                              <div
                                key={k}
                                className="relative"
                                style={{
                                  left: "10px",
                                }}
                              >
                                <span>{k} </span>
                                <span>{v}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                </div>
              </Fragment>
            );
          })}
      </div>
    </Notification>
  );
}

function MenuComponent() {
  const {
    states: {
      showingOptionsMenu: state,
      comments: commentsState,
      upsertingComment: upsertingCommentState,
    },
  } = useContext(DataStateContext);

  const {
    toggleMenuCb,
    onDeleteRequested,
    requestUpdateUiCb,
    commentCb,
    dispatch,
  } = useContext(DispatchContext);

  const createCommentLabel = createCommentsLabelText;
  let showCommentLabel = "";
  let hideCommentLabel = "";

  if (commentsState.value === StateValue.inactive) {
    showCommentLabel = showCommentsLabelText;
  } else {
    hideCommentLabel = hideCommentsLabelText;
  }

  return (
    <div className={cn("floating-circular", noTriggerDocumentEventClassName)}>
      <div
        className={cn(
          "ebnis-drop-up animation drop-up-animate-up",
          state.value === StateValue.active ? activeClassName : "",
          menuSelector,
        )}
      >
        <a
          id={updateMenuItemId}
          className="content"
          onClick={requestUpdateUiCb}
        >
          Edit
        </a>

        <a
          id={deleteMenuItemId}
          className="content"
          onClick={onDeleteRequested}
        >
          Delete
        </a>

        {upsertingCommentState.value === StateValue.inactive && (
          <>
            {hideCommentLabel && (
              <a
                id={hideCommentsMenuId}
                className={cn("content", noTriggerDocumentEventClassName)}
                onClick={(e) => {
                  commentCb(e, {
                    type: CommentRemoteActionType.hide,
                  });
                }}
              >
                {hideCommentLabel}
              </a>
            )}

            {showCommentLabel && (
              <a
                id={showCommentsMenuId}
                className={cn("content", noTriggerDocumentEventClassName)}
                onClick={(e) => {
                  commentCb(e, {
                    type: CommentRemoteActionType.show,
                  });
                }}
              >
                {showCommentLabel}
              </a>
            )}

            {createCommentLabel && (
              <a
                id={createCommentsMenuId}
                className={cn("content", noTriggerDocumentEventClassName)}
                onClick={(e) => {
                  commentCb(e, {
                    type: CommentRemoteActionType.upsert,
                  });
                }}
              >
                {createCommentLabel}
              </a>
            )}
          </>
        )}

        <a
          className={cn("content", newEntryMenuItemSelector)}
          onClick={() => {
            dispatch({
              type: ActionType.entries_actions,
              action: EntriesRemoteActionType.upsert,
            });
          }}
        >
          New entry
        </a>
      </div>

      <div
        className={cn("circular", menuTriggerSelector)}
        onClick={toggleMenuCb}
      >
        <a className="text-white">+</a>
      </div>
    </div>
  );
}

function PromptToFixSyncErrorNotificationComponent() {
  const { closeSyncErrorsMsg, requestUpdateUiCb } = useContext(DispatchContext);

  const {
    context: { syncErrors },
  } = useContext(DataStateContext);

  const { definitionsErrors, entriesErrors, ownFieldsErrors } =
    syncErrors as ExperienceSyncError;

  const hasDefOrOwnFieldsErrors =
    definitionsErrors ||
    // istanbul ignore next:
    ownFieldsErrors;

  return (
    <Modal onClose={closeSyncErrorsMsg}>
      <Modal.Card>
        <Modal.Header id={closeSyncErrorsMsgBtnId}>
          Please fix sync errors
        </Modal.Header>
        <Modal.Body>
          {hasDefOrOwnFieldsErrors && (
            <strong id={syncExperienceErrorsMsgId}>
              There are errors while syncing the experience. Click on 'Fix'
              button below
            </strong>
          )}
          {entriesErrors && (
            <strong id={syncEntriesErrorsMsgId}>
              There are entries errors. Click on the entry to fix.
            </strong>
          )}
        </Modal.Body>
        <Modal.Footer>
          {hasDefOrOwnFieldsErrors && (
            <Button
              id={fixSyncErrorsId}
              type="button"
              onClick={requestUpdateUiCb}
              btnType={ComponentColorType.is_success}
            >
              Fix errors
            </Button>
          )}
          <Button
            id={closeSyncErrorsMsgId}
            type="button"
            onClick={closeSyncErrorsMsg}
            btnType={ComponentColorType.is_danger}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal.Card>
    </Modal>
  );
}
