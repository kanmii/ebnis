import { Button } from "@eb/jsx/src/Button";
import { DropdownMenu } from "@eb/jsx/src/DropdownMenu";
import Modal from "@eb/jsx/src/Modal";
import { Notification } from "@eb/jsx/src/Notification";
import { getExperienceComments } from "@eb/shared/src/apollo/experience.gql.types";
import { updateExperiencesMutation } from "@eb/shared/src/apollo/update-experiences.gql";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { Fragment, Suspense, useEffect, useReducer } from "react";
import { useRunEffects } from "../../utils/use-run-effects";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import { ActionType as ParentAction } from "../DetailExperience/detailed-experience-utils";
import Loading from "../Loading/loading.component";
import {
  commentItemContainerSelector,
  commentItemOptionsSelector,
  commentItemOptionsToggleSelector,
  commentNotificationCloseId,
  commentsErrorContainerId,
  commentsHeaderNewId,
  deleteCommentMenuSelector,
  deleteCommentPromptFooterCloseId,
  deleteCommentPromptHeaderCloseId,
  deleteCommentPromptOkId,
  deletedCommentsFailure,
  deletedCommentsFailureSelector,
  deletedCommentsSuccess,
  emptyCommentsContainerId,
} from "./experience-comments.dom";
import { UpsertComment } from "./experience-comments.lazy";
import {
  ActionType,
  CallerProps,
  effectFunctions,
  initState,
  OnDeletedSomeSuccessPayload,
  Props,
  reducer,
} from "./experience-comments.utils";

export function Comments(props: Props) {
  const [state, dispatch] = useReducer(reducer, props, initState);
  const { experience, postActions, parentDispatch } = props;

  const {
    effects: { general },
    states: { upserting, data, notification },
  } = state;

  let component: null | JSX.Element = null;

  const effectArgs = {
    dispatch,
  };

  useRunEffects(general, effectFunctions, props, effectArgs);

  useEffect(() => {
    if (postActions.length) {
      dispatch({
        type: ActionType.from_parent_post_actions,
        actions: postActions,
      });
    }
  }, [postActions]);

  switch (data.value) {
    case StateValue.success:
      {
        const {
          success: {
            context: { comments },
            states: { deleted, menu, deletePrompt, deleting },
          },
        } = data;
        let failures = {} as OnDeletedSomeSuccessPayload["data"]["failures"];
        let failureCount = 0;
        let successCount = 0;

        if (deleted.value === StateValue.active) {
          const context = deleted.active.context;
          failures = context.failures;
          failureCount = context.failureCount;
          successCount = context.successCount;
        }

        component = (
          <>
            {deleting.value === StateValue.active && <Loading />}

            {deletePrompt.value === StateValue.active && (
              <Modal
                className={noTriggerDocumentEventClassName}
                onClose={() => {
                  dispatch({
                    type: ActionType.delete_prompt,
                  });
                }}
              >
                <Modal.Card>
                  <Modal.Header id={deleteCommentPromptHeaderCloseId}>
                    <span>Delete </span>
                    <span>
                      {deletePrompt.active.context.ids.length === 1
                        ? "comment"
                        : "comments"}
                    </span>
                    ?
                  </Modal.Header>

                  <Modal.Footer>
                    <Button
                      id={deleteCommentPromptOkId}
                      className="mr-4"
                      btnType={ComponentColorType.is_danger}
                      onClick={() => {
                        dispatch({
                          type: ActionType.yes_delete,
                        });
                      }}
                    >
                      Ok
                    </Button>

                    <Button
                      id={deleteCommentPromptFooterCloseId}
                      onClick={() => {
                        dispatch({
                          type: ActionType.delete_prompt,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </Modal.Footer>
                </Modal.Card>
              </Modal>
            )}

            <div className="mb-5">
              <div>
                <div className="font-black text-2xl mb-2 shadow pl-3 flex justify-between">
                  <div>Comments</div>
                  <a
                    id={commentsHeaderNewId}
                    className={cn(
                      "bg-blue-300 cursor-pointer pl-5 pr-5 rounded-br rounded-tr text-white",
                      noTriggerDocumentEventClassName,
                    )}
                    onClick={() => {
                      parentDispatch({
                        type: ParentAction.toggle_menu,
                        key: "close",
                      });

                      dispatch({
                        type: ActionType.upsert,
                      });
                    }}
                  >
                    +
                  </a>
                </div>

                {successCount || failureCount ? (
                  <Notification
                    className={cn("mt-5", noTriggerDocumentEventClassName)}
                    type={
                      successCount
                        ? ComponentColorType.is_light_success
                        : ComponentColorType.is_light_danger
                    }
                    close={{
                      onClose: () => {
                        //
                      },
                    }}
                  >
                    {successCount && (
                      <div id={deletedCommentsSuccess}>
                        {successCount} deleted
                      </div>
                    )}

                    {failureCount && (
                      <div
                        id={deletedCommentsFailure}
                        className="pt-3 text-red-800"
                      >
                        {failureCount} not deleted. See below.
                      </div>
                    )}
                  </Notification>
                ) : null}

                {notification.value === StateValue.active && (
                  <Notification
                    id={commentNotificationCloseId}
                    type={ComponentColorType.is_success}
                    onClose={() => {
                      // commentCb(e, CommentAction.CLOSE_NOTIFICATION);
                    }}
                  >
                    {notification.active.context.message}
                  </Notification>
                )}

                {comments.map((comment) => {
                  const { id, text } = comment;

                  return (
                    <Fragment key={id}>
                      {failures[id] && (
                        <>
                          <Notification
                            className={cn(
                              "mt-5",
                              deletedCommentsFailureSelector,
                              noTriggerDocumentEventClassName,
                            )}
                            type={ComponentColorType.is_light_danger}
                            close={{
                              onClose: () => {
                                //
                              },
                            }}
                          >
                            Errors deleting comment:
                            <ul className="list-disc ml-5">
                              {failures[id].map(([k, v]) => {
                                return <li key={k}>{v}</li>;
                              })}
                            </ul>
                          </Notification>
                        </>
                      )}

                      <div
                        id={id}
                        className={cn(
                          "shadow-lg relative mt-5",
                          commentItemContainerSelector,
                        )}
                      >
                        <p
                          className={cn(
                            "eb-tiny-scroll whitespace-pre-line max-h-80 overflow-y-auto pb-4",
                            "pl-4 pr-12 pt-6 border-t break-words",
                          )}
                        >
                          {text}
                        </p>
                        <DropdownMenu>
                          <DropdownMenu.Menu
                            className={`
                            ${commentItemOptionsSelector}
                            ${noTriggerDocumentEventClassName}
                          `}
                            active={
                              menu.value === StateValue.active &&
                              menu.active.context.id === id
                            }
                          >
                            <DropdownMenu.Item onClick={() => undefined}>
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className={deleteCommentMenuSelector}
                              onClick={() => {
                                dispatch({
                                  type: ActionType.delete_prompt,
                                  ids: [id],
                                });
                              }}
                            >
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Menu>
                          <DropdownMenu.Trigger
                            className={`
                              ${noTriggerDocumentEventClassName}
                              ${commentItemOptionsToggleSelector}
                            `}
                            onClick={() => {
                              dispatch({
                                type: ActionType.toggle_menu,
                                id,
                              });
                            }}
                          />
                        </DropdownMenu>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </>
        );
      }
      break;

    case StateValue.empty:
      {
        component = (
          <div
            id={emptyCommentsContainerId}
            className={cn(
              "cursor-pointer font-semibold text-blue-400 hover:text-blue-500 mb-3 pt-3",
              noTriggerDocumentEventClassName,
            )}
            onClick={() => {
              dispatch({
                type: ActionType.upsert,
              });
            }}
          >
            No comments. Click here to create one.
          </div>
        );
      }
      break;

    case StateValue.errors:
      {
        const { error } = data.errors.context;
        component = (
          <div id={commentsErrorContainerId}>
            <div>
              <p>Error occurred while fetching comments:</p>

              <p>{error}</p>
            </div>

            <p>Click here to retry.</p>
          </div>
        );
      }
      break;
  }

  return (
    <>
      {upserting.value === StateValue.active && (
        <Suspense fallback={<Loading />}>
          <UpsertComment
            association={{
              id: experience.id,
            }}
            className={noTriggerDocumentEventClassName}
            onSuccess={(data) => {
              dispatch({
                type: ActionType.on_upsert,
                data,
              });
            }}
            onClose={() => {
              dispatch({
                type: ActionType.close_upsert_ui,
              });
            }}
          />
        </Suspense>
      )}

      {component}
    </>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return (
    <Comments
      componentTimeoutsMs={componentTimeoutsMs}
      getExperienceComments={getExperienceComments}
      updateExperiencesMutation={updateExperiencesMutation}
      {...props}
    />
  );
};
