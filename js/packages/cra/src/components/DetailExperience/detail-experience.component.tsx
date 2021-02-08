import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import { ReactComponent as DotsVerticalSvg } from "@eb/cm/src/styles/dots-vertical.svg";
import makeClassNames from "classnames";
import React, {
  createContext,
  Fragment,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
} from "react";
import { useWithSubscriptionContext } from "../../apollo/injectables";
import { setUpRoutePage } from "../../utils/global-window";
import {
  OnlineStatus,
  ReactMouseAnchorEvent,
  StateValue,
} from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import { activeClassName } from "../../utils/utils.dom";
import Entry from "../Entry/entry.component";
import { ActivateUpdateEntryCb } from "../Entry/entry.utils";
import Header from "../Header/header.component";
import Loading from "../Loading/loading.component";
import { UpsertExperience } from "../My/my.lazy";
import {
  closeDeleteEntryConfirmationId,
  closeSyncErrorsMsgBtnId,
  closeSyncErrorsMsgId,
  closeUpsertEntryNotificationId,
  createCommentsLabelText,
  deleteExperienceMenuItemSelector,
  deleteExperienceOkSelector,
  editExperienceMenuItemSelector,
  entriesContainerId,
  entryDeleteFailNotificationId,
  entryDeleteSuccessNotificationId,
  experienceMenuSelector,
  experienceMenuTriggerSelector,
  fetchNextEntriesId,
  fixSyncErrorsId,
  hideCommentsLabelText,
  newEntryMenuItemSelector,
  emptyCommentsContainerId,
  noEntryTriggerId,
  noTriggerDocumentEventClassName,
  okDeleteEntryId,
  refetchEntriesId,
  refetchExperienceId,
  showCommentsLabelText,
  showExperienceCommentsLinkSelector,
  syncEntriesErrorsMsgId,
  syncErrorsNotificationId,
  syncExperienceErrorsMsgId,
  updateExperienceSuccessNotificationId,
  commentsErrorContainerId,
} from "./detail-experience.dom";
import {
  useDeleteExperiencesMutation,
  useUpdateExperiencesOnlineMutation,
} from "./detail-experience.injectables";
import { UpsertEntry } from "./detail-experience.lazy";
import {
  ActionType,
  CallerProps,
  CommentsDataState,
  DataState,
  DispatchType,
  effectFunctions,
  EntriesDataSuccessSate,
  ExperienceSyncError,
  initState,
  OldEntryData,
  Props,
  reducer,
} from "./detailed-experience-utils";
import "./styles.css";

type DispatchContextValue = Readonly<{
  onOpenNewEntry: (e: ReactMouseAnchorEvent) => void;
  onCloseNewEntryCreatedNotification: (e: ReactMouseAnchorEvent) => void;
  onDeclineDeleteExperience: (e: ReactMouseAnchorEvent) => void;
  onConfirmDeleteExperience: (e: ReactMouseAnchorEvent) => void;
  onDeleteExperienceRequest: (e: ReactMouseAnchorEvent) => void;
  requestUpdateExperienceUi: (e: ReactMouseAnchorEvent) => void;
  cancelEditExperienceUiRequestCb: (e: ReactMouseAnchorEvent) => void;
  onExperienceUpdatedSuccess: (
    e: ExperienceDetailViewFragment,
    onlineStatus: OnlineStatus,
  ) => void;
  toggleExperienceMenu: (e: ReactMouseAnchorEvent) => void;
  refetchEntries: (e: ReactMouseAnchorEvent) => void;
  fetchNextEntries: (e: ReactMouseAnchorEvent) => void;
  dispatch: DispatchType;
  onUpdateExperienceError: (error: string) => void;
  closeSyncErrorsMsg: (e: ReactMouseAnchorEvent) => void;
  refetchExperience: (e: ReactMouseAnchorEvent) => void;
  activateUpdateEntryCb: ActivateUpdateEntryCb;
  entriesOptionsCb: (entry: EntryFragment) => void;
  deleteEntryRequest: (entry: EntryFragment) => void;
  deleteEntry: (e: ReactMouseAnchorEvent) => void;
  cancelDeleteEntry: (e: ReactMouseAnchorEvent) => void;
  onShowComments: (e: ReactMouseAnchorEvent) => void;
}>;
const DispatchContext = createContext<DispatchContextValue>(
  {} as DispatchContextValue,
);
const DispatchProvider = DispatchContext.Provider;

const DataStateContextC = createContext<DataState["data"]>(
  {} as DataState["data"],
);
const DataStateProvider = DataStateContextC.Provider;

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
        type: ActionType.ON_SYNC,
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
        clearTimeout(genericTimeout);
      }
    };
  }, [genericTimeout]);

  const contextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      onOpenNewEntry(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE,
        });
      },
      onCloseNewEntryCreatedNotification() {
        dispatch({
          type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
        });
      },
      onDeclineDeleteExperience() {
        dispatch({
          type: ActionType.DELETE_EXPERIENCE_CANCELLED,
        });
      },
      onConfirmDeleteExperience() {
        dispatch({
          type: ActionType.DELETE_EXPERIENCE_CONFIRMED,
        });
      },
      onDeleteExperienceRequest(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.DELETE_EXPERIENCE_REQUEST,
        });
      },
      toggleExperienceMenu() {
        dispatch({
          type: ActionType.TOGGLE_EXPERIENCE_MENU,
        });
      },
      refetchEntries() {
        dispatch({
          type: ActionType.RE_FETCH_ENTRIES,
        });
      },
      fetchNextEntries() {
        dispatch({
          type: ActionType.FETCH_NEXT_ENTRIES,
        });
      },
      requestUpdateExperienceUi(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
        });
      },
      cancelEditExperienceUiRequestCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
        });
      },
      onExperienceUpdatedSuccess(experience, onlineStatus) {
        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
          experience,
          onlineStatus,
        });
      },
      onUpdateExperienceError() {
        //
      },
      closeSyncErrorsMsg(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.CLOSE_SYNC_ERRORS_MSG,
        });
      },
      refetchExperience(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.RE_FETCH_EXPERIENCE,
        });
      },
      activateUpdateEntryCb(data) {
        dispatch({
          type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE,
          updatingEntry: data,
        });
      },
      entriesOptionsCb(entry) {
        dispatch({
          type: ActionType.ENTRIES_OPTIONS,
          entry,
        });
      },
      deleteEntryRequest(entry) {
        dispatch({
          type: ActionType.DELETE_ENTRY,
          key: StateValue.requested,
          entry,
        });
      },
      deleteEntry(e) {
        e.preventDefault();
        dispatch({
          type: ActionType.DELETE_ENTRY,
          key: StateValue.deleted,
        });
      },
      cancelDeleteEntry(e) {
        e.preventDefault();
        dispatch({
          type: ActionType.DELETE_ENTRY,
          key: StateValue.cancelled,
        });
      },
      onShowComments(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.FETCH_COMMENTS,
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
              id={refetchExperienceId}
              className="button is-link refetch-btn"
              onClick={contextVal.refetchExperience}
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
  const [deleteExperiences] = useDeleteExperiencesMutation();
  const [updateExperiencesOnline] = useUpdateExperiencesOnlineMutation();

  return (
    <DetailExperience
      {...props}
      deleteExperiences={deleteExperiences}
      updateExperiencesOnline={updateExperiencesOnline}
    />
  );
};

function ExperienceComponent() {
  const {
    dispatch,
    refetchEntries,
    cancelEditExperienceUiRequestCb,
    onExperienceUpdatedSuccess,
    onUpdateExperienceError,
    requestUpdateExperienceUi,
    cancelDeleteEntry,
  } = useContext(DispatchContext);

  const {
    context,
    states: {
      deleteExperience: deleteExperienceState,
      upsertEntryActive,
      newEntryCreated,
      entries: entriesState,
      updateExperienceUiActive,
      syncErrorsMsg,
      entriesOptions,
      comments: commentsState,
    },
  } = useContext(DataStateContextC);

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
        type: ActionType.TOGGLE_EXPERIENCE_MENU,
        key: "close",
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [experience]);

  const oldEditedEntryProps =
    upsertEntryActive.value === StateValue.active
      ? upsertEntryActive.active.context.updatingEntry
      : undefined;

  return (
    <>
      {updateExperienceUiActive.value === StateValue.active && (
        <Suspense fallback={<Loading />}>
          <UpsertExperience
            experience={experience}
            onClose={cancelEditExperienceUiRequestCb}
            onSuccess={onExperienceUpdatedSuccess}
            onError={onUpdateExperienceError}
            className={noTriggerDocumentEventClassName}
          />
        </Suspense>
      )}

      {deleteExperienceState.value === StateValue.active && (
        <DeleteExperienceModal />
      )}

      {syncErrorsMsg.value === StateValue.active && (
        <SyncErrorsMessageNotificationComponent />
      )}

      {entriesOptions.value === StateValue.requested && (
        <DeleteEntryConfirmationComponent />
      )}

      {(oldEditedEntryProps ||
        (!syncErrors && upsertEntryActive.value === StateValue.active)) && (
        <Suspense fallback={<Loading />}>
          <UpsertEntry
            experience={experience}
            updatingEntry={oldEditedEntryProps}
            onSuccess={(entry, onlineStatus) => {
              let oldData: undefined | OldEntryData = undefined;

              if (oldEditedEntryProps) {
                const { entry, index } = oldEditedEntryProps;

                oldData = {
                  entry,
                  index,
                };
              }

              dispatch({
                type: ActionType.ON_UPSERT_ENTRY_SUCCESS,
                newData: {
                  entry,
                  onlineStatus,
                },
                oldData,
              });
            }}
            onClose={() => {
              dispatch({
                type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE,
              });
            }}
          />
        </Suspense>
      )}

      <div className="container detailed-experience-component">
        {syncErrors && <SyncErrorsNotificationComponent state={syncErrors} />}

        <UpsertEntryNotification state={newEntryCreated} />

        {updateExperienceUiActive.value === StateValue.success && (
          <SuccessNotificationComponent
            onClose={requestUpdateExperienceUi}
            message="Update was successful"
            domId={updateExperienceSuccessNotificationId}
            type="success"
          />
        )}

        {entriesOptions.value === StateValue.deleteSuccess && (
          <SuccessNotificationComponent
            domId={entryDeleteSuccessNotificationId}
            message="Entry deleted successfully"
            onClose={cancelDeleteEntry}
            type="success"
          />
        )}

        {entriesOptions.value === StateValue.errors && (
          <SuccessNotificationComponent
            domId={entryDeleteFailNotificationId}
            message={
              <div>
                Entry delete failed with error:
                <p>{entriesOptions.errors.error}</p>
              </div>
            }
            onClose={cancelDeleteEntry}
            type="error"
          />
        )}

        <CommentsComponent state={commentsState} />

        {entriesState.value === StateValue.success && (
          <EntriesComponent state={entriesState.success} />
        )}

        {entriesState.value === StateValue.fail && (
          <>
            <div className={noTriggerDocumentEventClassName}>
              {entriesState.error}

              <button
                id={refetchEntriesId}
                className="button is-link"
                onClick={refetchEntries}
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EntriesComponent(props: { state: EntriesDataSuccessSate["success"] }) {
  const { connected } = useWithSubscriptionContext();

  const {
    onOpenNewEntry,
    fetchNextEntries,
    activateUpdateEntryCb,
    entriesOptionsCb,
    deleteEntryRequest,
  } = useContext(DispatchContext);

  const {
    context: { dataDefinitionIdToNameMap },
    states: { entriesOptions, comments: commentsState },
  } = useContext(DataStateContextC);

  const {
    context: {
      entries,
      pageInfo: { hasNextPage },
      pagingError,
    },
  } = props.state;

  return (
    <>
      {entries.length === 0 ? (
        <div
          id={noEntryTriggerId}
          className={makeClassNames({
            [noTriggerDocumentEventClassName]: true,
            "cursor-pointer": true,
            "font-semibold": true,
            "text-blue-400": true,
            "hover:text-blue-500": true,
            "pt-3": true,
          })}
          onClick={onOpenNewEntry}
        >
          Click here to create your first entry
        </div>
      ) : (
        <>
          <div id={entriesContainerId}>
            {commentsState.value !== StateValue.unRequested && (
              <p
                className={makeClassNames({
                  "font-black": true,
                  "text-2xl": true,
                  "mb-2": true,
                  "mt-10": true,
                  shadow: true,
                  "pl-3": true,
                })}
              >
                Entries
              </p>
            )}

            {entries.map((daten, index) => {
              const {
                entryData: { id },
              } = daten;

              return (
                <Entry
                  key={id}
                  state={daten}
                  index={index}
                  activateUpdateEntryCb={activateUpdateEntryCb}
                  dataDefinitionIdToNameMap={dataDefinitionIdToNameMap}
                  entriesOptionsCb={entriesOptionsCb}
                  menuActive={
                    entriesOptions.value === StateValue.active &&
                    entriesOptions.active.id === id
                  }
                  deleteEntryRequest={deleteEntryRequest}
                />
              );
            })}
          </div>

          {connected && hasNextPage && (
            <div className="detailed-experience__next-entries">
              {pagingError && (
                <div className="detailed-experience__paginierung-error">
                  Unable to fetch more entries
                  {pagingError}
                </div>
              )}

              <button
                id={fetchNextEntriesId}
                className="button is-primary"
                onClick={fetchNextEntries}
              >
                More
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function CommentsComponent(props: { state: CommentsDataState }) {
  const { state } = props;

  switch (state.value) {
    case StateValue.success: {
      const { comments } = state.success.context;

      return (
        <div
          className={makeClassNames({
            "mb-5": true,
          })}
        >
          <div>
            <p
              className={makeClassNames({
                "font-black": true,
                "text-2xl": true,
                "mb-2": true,
                shadow: true,
                "pl-3": true,
              })}
            >
              Comments
            </p>

            {comments.map((comment, index) => {
              const { id, text } = comment;

              return (
                <div key={id} id={id} className="p-5 shadow-lg flex">
                  <p className="whitespace-pre-line flex-1">{text}</p>

                  <div className="ebnis-dropdown-menu">
                    <div className="dropdown-menu hidden1" role="menu">
                      <div className="dropdown-content">Edit</div>

                      <div className="dropdown-content">Delete</div>
                    </div>
                  </div>

                  <div className="dropdown-trigger cursor-pointer">
                    <DotsVerticalSvg />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case StateValue.empty:
      return (
        <div
          id={emptyCommentsContainerId}
          className={makeClassNames({
            [noTriggerDocumentEventClassName]: true,
            "cursor-pointer": true,
            "font-semibold": true,
            "text-blue-400": true,
            "hover:text-blue-500": true,
            "mb-3": true,
            "pt-3": true,
          })}
        >
          No comments. Click here to create one.
        </div>
      );

    case StateValue.errors: {
      const { error } = state.errors.context;
      return (
        <div id={commentsErrorContainerId}>
          <div>
            <p>Error occurred while fetching comments:</p>

            <p>{error}</p>
          </div>

          <p>Click here to retry.</p>
        </div>
      );
    }

    default:
      return null;
  }
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
          entriesErrors.map(([entryIndex, { others, dataObjects }]) => {
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

function UpsertEntryNotification(props: {
  state: DataState["data"]["states"]["newEntryCreated"];
}) {
  const { state } = props;
  const { onCloseNewEntryCreatedNotification } = useContext(DispatchContext);

  if (state.value === StateValue.inactive) {
    return null;
  }

  return (
    <div className="notification is-success">
      <button
        id={closeUpsertEntryNotificationId}
        className="delete"
        onClick={onCloseNewEntryCreatedNotification}
      />
      {state.active.context.message}
    </div>
  );
}

function DeleteExperienceModal() {
  const { onDeclineDeleteExperience, onConfirmDeleteExperience } = useContext(
    DispatchContext,
  );

  const {
    context: {
      experience: { title },
    },
  } = useContext(DataStateContextC);

  return (
    <div
      className={makeClassNames({
        "modal is-active delete-experience-component": true,
        [noTriggerDocumentEventClassName]: true,
      })}
    >
      <div className="modal-background"></div>

      <div className="modal-card">
        <header className="modal-card-head">
          <div className="modal-card-title">
            <strong>Delete Experience</strong>
            <div className="experience-title">{title}</div>
          </div>

          <button
            className="delete upsert-entry__delete"
            aria-label="close"
            type="button"
            onClick={onDeclineDeleteExperience}
          ></button>
        </header>

        <footer className="modal-card-foot">
          <button
            className={makeClassNames({
              "button is-success": true,
              [deleteExperienceOkSelector]: true,
            })}
            id={""}
            type="button"
            onClick={onConfirmDeleteExperience}
          >
            Ok
          </button>

          <button
            className="button is-danger delete-experience__cancel-button"
            id={""}
            type="button"
            onClick={onDeclineDeleteExperience}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

function MenuComponent() {
  const {
    states: { showingOptionsMenu: state, comments: commentsState },
  } = useContext(DataStateContextC);

  const {
    toggleExperienceMenu,
    onDeleteExperienceRequest,
    requestUpdateExperienceUi,
    onShowComments,
    onOpenNewEntry,
  } = useContext(DispatchContext);

  let commentLabel = "";

  switch (commentsState.value) {
    case StateValue.unRequested:
      commentLabel = showCommentsLabelText;
      break;

    case StateValue.success:
      commentLabel = hideCommentsLabelText;
      break;

    case StateValue.empty:
    case StateValue.errors:
      commentLabel = createCommentsLabelText;
      break;
  }

  return (
    <div
      className={makeClassNames({
        "floating-circular": true,
        [noTriggerDocumentEventClassName]: true,
      })}
    >
      <div
        className={makeClassNames({
          "ebnis-drop-up": true,
          animation: true,
          "drop-up-animate-up": true,
          [activeClassName]: state.value === StateValue.active,
          [experienceMenuSelector]: true,
        })}
      >
        <div
          className={makeClassNames({
            content: true,
            [editExperienceMenuItemSelector]: true,
          })}
          onClick={requestUpdateExperienceUi}
        >
          Edit
        </div>

        <div
          className={makeClassNames({
            content: true,
            [deleteExperienceMenuItemSelector]: true,
          })}
          onClick={onDeleteExperienceRequest}
        >
          Delete
        </div>

        <div
          className={makeClassNames({
            content: true,
            [showExperienceCommentsLinkSelector]: true,
          })}
          onClick={onShowComments}
        >
          {commentLabel}
        </div>

        <div
          className={makeClassNames({
            content: true,
            [newEntryMenuItemSelector]: true,
          })}
          onClick={onOpenNewEntry}
        >
          New entry
        </div>
      </div>

      <div
        className={makeClassNames({
          circular: true,
          [experienceMenuTriggerSelector]: true,
        })}
        onClick={toggleExperienceMenu}
      >
        <span>+</span>
      </div>
    </div>
  );
}

function SuccessNotificationComponent(props: {
  onClose: (e: ReactMouseAnchorEvent) => void;
  message: React.ReactNode;
  domId: string;
  type: "success" | "error";
}) {
  const { onClose, message, domId, type } = props;

  return (
    <div
      className={makeClassNames({
        notification: true,
        "is-success": type === "success",
        "is-danger": type === "error",
      })}
    >
      <button id={domId} className="delete" onClick={onClose} />
      {message}
    </div>
  );
}

function SyncErrorsMessageNotificationComponent() {
  const { closeSyncErrorsMsg, requestUpdateExperienceUi } = useContext(
    DispatchContext,
  );

  const {
    context: { syncErrors },
  } = useContext(DataStateContextC);

  const {
    definitionsErrors,
    entriesErrors,
    ownFieldsErrors,
  } = syncErrors as ExperienceSyncError;

  return (
    <div className="modal is-active upsert-experience-notification-modal">
      <div className="modal-background"></div>

      <div className="modal-card">
        <header className="modal-card-head">
          <div className="modal-card-title"></div>

          <button
            className="delete upsert-entry__delete"
            aria-label="close"
            type="button"
            onClick={closeSyncErrorsMsg}
            id={closeSyncErrorsMsgBtnId}
          />
        </header>

        <section className="modal-card-body">
          {(definitionsErrors || ownFieldsErrors) && (
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
        </section>

        <footer className="modal-card-foot">
          {(definitionsErrors || ownFieldsErrors) && (
            <button
              className="button is-success"
              id={fixSyncErrorsId}
              type="button"
              onClick={requestUpdateExperienceUi}
            >
              Fix errors
            </button>
          )}

          <button
            className="button is-warning"
            id={closeSyncErrorsMsgId}
            type="button"
            onClick={closeSyncErrorsMsg}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

function DeleteEntryConfirmationComponent() {
  const { cancelDeleteEntry, deleteEntry } = useContext(DispatchContext);

  return (
    <div
      className={`modal is-active delete-entry-modal ${noTriggerDocumentEventClassName}`}
    >
      <div className="modal-background"></div>

      <div className="modal-card">
        <header className="modal-card-head">
          <div className="modal-card-title">
            <strong>Delete Entry</strong>
          </div>

          <button
            className="delete upsert-entry__delete"
            aria-label="close"
            type="button"
            onClick={cancelDeleteEntry}
          ></button>
        </header>

        <footer className="modal-card-foot">
          <button
            className="button is-success"
            id={okDeleteEntryId}
            type="button"
            onClick={deleteEntry}
          >
            Ok
          </button>

          <button
            className="button is-danger delete-experience__cancel-button"
            id={closeDeleteEntryConfirmationId}
            type="button"
            onClick={cancelDeleteEntry}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
