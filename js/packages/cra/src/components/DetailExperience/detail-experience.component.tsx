import { ReactComponent as ExclamationErrorSvg } from "@eb/cm/src/styles/exclamation-error.svg";
import { trimClass } from "@eb/cm/src/utils";
import { componentTimeoutsMs } from "@eb/cm/src/utils/timers";
import { StateValue } from "@eb/cm/src/utils/types";
import Button from "@eb/jsx/src/components/Button/button.component";
import Modal from "@eb/jsx/src/components/Modal/modal.component";
import Notification from "@eb/jsx/src/components/Notification/notification.component";
import React, {
  Fragment,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
} from "react";
import { useWithSubscriptionContext } from "../../apollo/injectables";
import { clearTimeoutFn } from "./detail-experience.injectables";
import { deleteExperiences } from "../../utils/delete-experiences.gql";
import {
  getExperienceAndEntriesDetailView,
  getExperienceComments,
} from "../../utils/experience.gql.types";
import { setUpRoutePage } from "../../utils/global-window";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { useRunEffects } from "../../utils/use-run-effects";
import { activeClassName } from "../../utils/utils.dom";
import Entries from "../entries/entries.component";
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
import Header from "../Header/header.component";
import Loading from "../Loading/loading.component";
import { UpsertExperience } from "../My/my.lazy";
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
import { Comments } from "./detail-experience.lazy";
import {
  ActionType,
  CallerProps,
  effectFunctions,
  ExperienceSyncError,
  initState,
  Props,
  reducer,
} from "./detailed-experience-utils";
import "./styles.css";

export function DetailExperience(props: Props) {
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states,
    effects: { general: generalEffects },
    timeouts: { genericTimeout },
  } = stateMachine;

  const stateValue = states.value;

  const { onSyncData } = useWithSubscriptionContext();

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
        clearTimeoutFn(genericTimeout);
      }
    };
  }, [genericTimeout]);

  const contextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
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
      commentCb(e, action) {
        dispatch({
          type: ActionType.comment_action,
          action,
        });
      },
    };
  }, []);

  function render() {
    switch (states.value) {
      case StateValue.loading:
        return <Loading />;

      case StateValue.errors:
        return (
          <div>
            {states.errors.context.error}

            <button
              id={refetchId}
              className="button is-link refetch-btn"
              onClick={contextVal.refetchCb}
            >
              Refetch
            </button>
          </div>
        );

      case StateValue.data: {
        return (
          <>
            <DispatchProvider value={contextVal}>
              <DataStateProvider value={states.data}>
                <ExperienceComponent />
                <MenuComponent />
              </DataStateProvider>
            </DispatchProvider>
          </>
        );
      }
    }
  }

  return (
    <>
      <Header />

      {render()}
    </>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return (
    <DetailExperience
      {...props}
      deleteExperiences={deleteExperiences}
      componentTimeoutsMs={componentTimeoutsMs}
      getExperienceComments={getExperienceComments}
      updateExperiencesMutation={updateExperiencesMutation}
      getExperienceAndEntriesDetailView={getExperienceAndEntriesDetailView}
    />
  );
};

function ExperienceComponent() {
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
        <Suspense fallback={<Loading />}>
          <UpsertExperience
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
                  btnType="is-danger"
                  onClick={onDeleteConfirmed}
                >
                  Ok
                </Button>
                <Button
                  id={deleteFooterCloseId}
                  type="button"
                  onClick={onDeleteDeclined}
                  btnType="is-success"
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

      <div id={domPrefix} className="container detailed-experience-component">
        {syncErrors && <SyncErrorsNotificationComponent state={syncErrors} />}

        {updateUiActive.value === StateValue.success && (
          <Notification
            onClose={requestUpdateUiCb}
            id={updateSuccessNotificationId}
            type="is-success"
          >
            Update was successful
          </Notification>
        )}

        {deleteState.value === StateValue.active &&
          deleteState.active.states.value === StateValue.errors && (
            <Notification
              onClose={() => {
                dispatch({
                  type: ActionType.delete,
                  value: "closeNotification",
                });
              }}
              id={deleteFailNotificationCloseId}
              type="is-danger"
              className={trimClass(`
                mb-5
                ${noTriggerDocumentEventClassName}
              `)}
            >
              <div
                className={trimClass(
                  `
                    flex
                    mb-2
                    pl-1
                    pr-2
                    font-semibold
                  `,
                )}
              >
                <div
                  className="flex-shrink-0"
                  style={{
                    width: "24px",
                  }}
                >
                  <ExclamationErrorSvg />
                </div>
                <div
                  className={trimClass(
                    `
                      flex-grow
                      ml-2
                    `,
                  )}
                >
                  Errors while deleting experience
                </div>
              </div>
              <ul
                className={trimClass(
                  `
                      ml-5
                      mt-2
                  `,
                )}
              >
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
          <Comments
            postActions={commentsState.active.context.postActions}
            experience={experience}
            parentDispatch={dispatch}
          />
        )}

        <Entries
          {...entriesState}
          experience={experience}
          syncErrors={syncErrors}
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
    <div className="message is-danger" id={syncErrorsNotificationId}>
      <div className="message-header">
        <p>There were errors while uploading changes for this item</p>
      </div>

      <div className="message-body">
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
                <strong>Entry #{entryIndex}</strong>

                <div className="detailed-experience__data-object-errors">
                  {others &&
                    others.map(([k, v]) => {
                      return (
                        <div key={k}>
                          <span>{k} </span>
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
                                className="detailed-experience__data-object-error"
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
    </div>
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
    <div
      className={trimClass(`
        floating-circular
        ${noTriggerDocumentEventClassName}
      `)}
    >
      <div
        className={trimClass(`
          ebnis-drop-up
          animation
          drop-up-animate-up
          ${state.value === StateValue.active ? activeClassName : ""}
          ${menuSelector}
        `)}
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
                className={trimClass(`
                  content
                  ${noTriggerDocumentEventClassName}
                `)}
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
                className={trimClass(`
                  content
                  ${noTriggerDocumentEventClassName}
                `)}
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
                className={trimClass(`
                  content
                  ${noTriggerDocumentEventClassName}
                `)}
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
          className={trimClass(`
            content
            ${newEntryMenuItemSelector}
          `)}
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
        className={trimClass(`
           circular
           ${menuTriggerSelector}
        `)}
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

  const {
    definitionsErrors,
    entriesErrors,
    ownFieldsErrors,
  } = syncErrors as ExperienceSyncError;

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
              btnType="is-success"
            >
              Fix errors
            </Button>
          )}
          <Button
            id={closeSyncErrorsMsgId}
            type="button"
            onClick={closeSyncErrorsMsg}
            btnType="is-danger"
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal.Card>
    </Modal>
  );
}
