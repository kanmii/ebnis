import React, {
  useLayoutEffect,
  Suspense,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  createContext,
  useContext,
  Fragment,
} from "react";
import "./styles.scss";
import Header from "../Header/header.component";
import {
  Props,
  initState,
  reducer,
  ActionType,
  formatDatetime,
  effectFunctions,
  DispatchType,
  ShowingOptionsMenuState,
  DataState,
  EinträgeDatenErfolg,
  DataStateContextEntry,
  ExperienceSyncError,
  OldEntryData,
} from "./detailed-experience-utils";
import { setUpRoutePage } from "../../utils/global-window";
import { UpsertEntry } from "./detail-experience.lazy";
import Loading from "../Loading/loading.component";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import {
  StateValue,
  ReactMouseAnchorEvent,
  OnlineStatus,
} from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  newEntryCreatedNotificationCloseId,
  syncErrorsNotificationId,
  noTriggerDocumentEventClassName,
  noEntryTriggerId,
  refetchExperienceId,
  neueHolenEinträgeId,
  holenNächstenEinträgeId,
  updateExperienceSuccessNotificationId,
  isPartOfflineClassName,
  isOfflineClassName,
  fixSyncErrorsId,
  closeSyncErrorsMsgId,
  closeSyncErrorsMsgBtnId,
  syncEntriesErrorsMsgId,
  syncExperienceErrorsMsgId,
} from "./detail-experience.dom";
import { isOfflineId } from "../../utils/offlines";
import makeClassNames from "classnames";
import { useDeleteExperiencesMutation } from "./detail-experience.injectables";
import { activeClassName } from "../../utils/utils.dom";
import { useWithSubscriptionContext } from "../../apollo/injectables";
import { UpsertExperience } from "../My/my.lazy";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { WithSubscriptionContext } from "../../utils/app-context";

type DispatchContextValue = Readonly<{
  onOpenNewEntry: (e: ReactMouseAnchorEvent) => void;
  onCloseNewEntryCreatedNotification: () => void;
  onDeclineDeleteExperience: () => void;
  onConfirmDeleteExperience: () => void;
  onDeleteExperienceRequest: (e: ReactMouseAnchorEvent) => void;
  requestUpdateExperienceUi: (e: ReactMouseAnchorEvent) => void;
  cancelEditExperienceUiRequestCb: (e: ReactMouseAnchorEvent) => void;
  onExperienceUpdatedSuccess: (
    e: ExperienceFragment,
    onlineStatus: OnlineStatus,
  ) => void;
  toggleExperienceMenu: () => void;
  onRefetchEntries: () => void;
  holenNächstenEinträge: () => void;
  dispatch: DispatchType;
  onUpdateExperienceError: (error: string) => void;
  closeSyncErrorsMsg: (e: ReactMouseAnchorEvent) => void;
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
  const [deleteExperiences] = useDeleteExperiencesMutation();

  const {
    states,
    effects: { general: generalEffects },
    timeouts: { genericTimeout },
  } = stateMachine;

  const { onSyncData } = useContext(WithSubscriptionContext);

  useEffect(() => {
    if (onSyncData) {
      dispatch({
        type: ActionType.ON_SYNC,
        ...onSyncData,
      });
    }
  }, [onSyncData]);

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
    deleteExperiences,
  });

  useEffect(() => {
    return () => {
      if (genericTimeout) {
        clearTimeout(genericTimeout);
      }
    };
  }, [genericTimeout]);

  const onOpenNewEntry = useCallback((e: ReactMouseAnchorEvent) => {
    e.preventDefault();

    dispatch({
      type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE,
    });
  }, []);

  const contextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      onOpenNewEntry,
      onCloseNewEntryCreatedNotification: () => {
        dispatch({
          type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
        });
      },
      onDeclineDeleteExperience: () => {
        dispatch({
          type: ActionType.DELETE_EXPERIENCE_CANCELLED,
        });
      },
      onConfirmDeleteExperience: () => {
        dispatch({
          type: ActionType.DELETE_EXPERIENCE_CONFIRMED,
        });
      },
      onDeleteExperienceRequest: (e: ReactMouseAnchorEvent) => {
        e.preventDefault();

        dispatch({
          type: ActionType.DELETE_EXPERIENCE_REQUEST,
        });
      },
      toggleExperienceMenu: () => {
        dispatch({
          type: ActionType.TOGGLE_EXPERIENCE_MENU,
        });
      },
      onRefetchEntries: () => {
        dispatch({
          type: ActionType.RE_FETCH_ENTRIES,
        });
      },
      holenNächstenEinträge: () => {
        dispatch({
          type: ActionType.HOLEN_NÄCHSTE_EINTRÄGE,
        });
      },
      requestUpdateExperienceUi: (e: ReactMouseAnchorEvent) => {
        e.preventDefault();

        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
        });
      },
      cancelEditExperienceUiRequestCb: (e: ReactMouseAnchorEvent) => {
        e.preventDefault();

        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
        });
      },
      onExperienceUpdatedSuccess: (experience, onlineStatus) => {
        dispatch({
          type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
          experience,
          onlineStatus,
        });
      },
      onUpdateExperienceError() {
        //
      },
      closeSyncErrorsMsg: (e: ReactMouseAnchorEvent) => {
        e.preventDefault();

        dispatch({
          type: ActionType.CLOSE_SYNC_ERRORS_MSG,
        });
      },
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onRefetchExperience = useCallback(() => {
    dispatch({
      type: ActionType.RE_FETCH_EXPERIENCE,
    });
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
              onClick={onRefetchExperience}
            >
              Refetch
            </button>
          </div>
        );

      case StateValue.data: {
        return (
          <DispatchProvider value={contextVal}>
            <DataStateProvider value={states.data}>
              <ExperienceComponent />

              <a
                className="upsert-entry-trigger"
                onClick={onOpenNewEntry}
                href="*"
              >
                <span>+</span>
              </a>
            </DataStateProvider>
          </DispatchProvider>
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
export default DetailExperience;

function ExperienceComponent() {
  const {
    dispatch,
    onCloseNewEntryCreatedNotification,
    onRefetchEntries,
    cancelEditExperienceUiRequestCb,
    onExperienceUpdatedSuccess,
    onUpdateExperienceError,
  } = useContext(DispatchContext);

  const {
    context,
    states: {
      deleteExperience: deleteExperienceState,
      upsertEntryActive,
      newEntryCreated,
      einträge: einträgeStatten,
      updateExperienceUiActive,
      syncErrorsMsg,
    },
  } = useContext(DataStateContextC);

  const { experience, syncErrors } = context;

  useLayoutEffect(() => {
    setUpRoutePage({
      title: experience.title,
    });

    function onDocClicked(event: Event) {
      const target = event.target as HTMLElement;

      if (target.classList.contains(noTriggerDocumentEventClassName)) {
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
      ? upsertEntryActive.active.context.bearbeitenEintrag
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
          />
        </Suspense>
      )}

      {deleteExperienceState.value === StateValue.active && (
        <DeleteExperienceModal />
      )}

      {syncErrorsMsg.value === StateValue.active && (
        <SyncErrorsMessageNotificationComponent />
      )}

      {(oldEditedEntryProps ||
        (!syncErrors && upsertEntryActive.value === StateValue.active)) && (
        <Suspense fallback={<Loading />}>
          <UpsertEntry
            experience={experience}
            bearbeitenEintrag={oldEditedEntryProps}
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

        <UpsertEntryNotification
          state={newEntryCreated}
          onCloseNewEntryCreatedNotification={
            onCloseNewEntryCreatedNotification
          }
        />

        {updateExperienceUiActive.value === StateValue.erfolg && (
          <UpdateExperienceSuccessNotification />
        )}

        {einträgeStatten.wert === StateValue.erfolg && (
          <EntriesComponent state={einträgeStatten.erfolg} />
        )}

        {einträgeStatten.wert === StateValue.versagen && (
          <div>
            {einträgeStatten.fehler}

            <button
              id={neueHolenEinträgeId}
              className="button"
              onClick={onRefetchEntries}
            />
          </div>
        )}
      </div>
    </>
  );
}

function EntriesComponent(props: { state: EinträgeDatenErfolg["erfolg"] }) {
  const { connected } = useWithSubscriptionContext();

  const {
    onOpenNewEntry,
    toggleExperienceMenu,
    onDeleteExperienceRequest,
    requestUpdateExperienceUi,
    holenNächstenEinträge,
  } = useContext(DispatchContext);

  const {
    states: { showingOptionsMenu },
  } = useContext(DataStateContextC);

  const {
    context: {
      einträge: entries,
      seiteInfo: { hasNextPage },
      paginierungFehler,
    },
  } = props.state;

  return (
    <>
      {entries.length === 0 && (
        <div className="no-entry-alert">
          <button
            id={noEntryTriggerId}
            className="button"
            onClick={onOpenNewEntry}
          >
            Click here to create your first entry
          </button>

          <ExperienceMenuComponent
            state={showingOptionsMenu}
            toggleExperienceMenu={toggleExperienceMenu}
            onDeleteExperienceRequest={onDeleteExperienceRequest}
            requestUpdateExperienceUi={requestUpdateExperienceUi}
            className="no-entry-menu"
          />
        </div>
      )}

      {entries && entries.length > 0 && (
        <>
          <ExperienceMenuComponent
            state={showingOptionsMenu}
            toggleExperienceMenu={toggleExperienceMenu}
            onDeleteExperienceRequest={onDeleteExperienceRequest}
            requestUpdateExperienceUi={requestUpdateExperienceUi}
          />

          <div className="entries">
            {entries.map((daten, index) => {
              return (
                <EntryComponent
                  key={daten.eintragDaten.id}
                  state={daten}
                  index={index}
                />
              );
            })}
          </div>

          {connected && hasNextPage && (
            <div className="detailed-experience__next-entries">
              {paginierungFehler && (
                <div className="detailed-experience__paginierung-fehler">
                  Unable to fetch more entries
                  {paginierungFehler}
                </div>
              )}

              <button
                id={holenNächstenEinträgeId}
                className="button is-primary"
                onClick={holenNächstenEinträge}
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

function EntryComponent(props: {
  state: DataStateContextEntry;
  index: number;
}) {
  const { dispatch } = useContext(DispatchContext);

  const {
    context: { dataDefinitionIdToNameMap },
  } = useContext(DataStateContextC);

  const {
    state: { eintragDaten, nichtSynchronisiertFehler },
    index,
  } = props;

  const { updatedAt, dataObjects: dObjects, id: entryId } = eintragDaten;
  const dataObjects = dObjects as DataObjectFragment[];
  const isOffline = isOfflineId(entryId);

  return (
    <div
      id={entryId}
      className={makeClassNames({
        "box media entry": true,
        "entry--is-danger": isOffline,
      })}
    >
      <div className="media-content">
        {nichtSynchronisiertFehler && (
          <div>
            <div className="subtitle is-6 entry__unsynced-error">
              <p>Entry has errors and can not be created/uploaded!</p>

              <p style={{ marginTop: "10px" }}>Click 'edit button' to fix.</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                className="button is-small
                detailed-experience__entry-edit"
                onClick={() => {
                  dispatch({
                    type: ActionType.TOGGLE_UPSERT_ENTRY_ACTIVE,
                    bearbeitenEintrag: {
                      entry: eintragDaten,
                      // TODO: remove any type
                      errors: nichtSynchronisiertFehler as any,
                      index,
                    },
                  });
                }}
              >
                Beheben{" "}
              </button>{" "}
            </div>{" "}
          </div>
        )}

        {dataObjects.map((d) => {
          const { id, definitionId, data } = d;

          return (
            <div key={id} className="media data-object">
              <div className="media-content">
                <div>{dataDefinitionIdToNameMap[definitionId]}</div>
                <div>{data}</div>
              </div>
            </div>
          );
        })}

        <div className="entry__updated-at">{formatDatetime(updatedAt)}</div>
      </div>

      <div className="media-right">x</div>
    </div>
  );
}

function SyncErrorsNotificationComponent(props: {
  state: ExperienceSyncError;
}) {
  const { state } = props;

  const { entriesErrors, ownFields, definitionsErrors } = state;

  if (!(entriesErrors || ownFields || definitionsErrors)) {
    return null;
  }

  return (
    <div className="message is-danger" id={syncErrorsNotificationId}>
      <div className="message-header">
        <p>There were errors while uploading changes for this item</p>
      </div>

      <div className="message-body">
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
  onCloseNewEntryCreatedNotification: () => void;
}) {
  const { state, onCloseNewEntryCreatedNotification } = props;

  if (state.value === StateValue.inactive) {
    return null;
  }

  return (
    <div className="notification is-success">
      <button
        id={newEntryCreatedNotificationCloseId}
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
    <div className="modal is-active delete-experience-component">
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
            className="button is-success delete-experience__ok-button"
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

function ExperienceMenuComponent(props: MenuProps) {
  const {
    state,
    toggleExperienceMenu,
    onDeleteExperienceRequest,
    requestUpdateExperienceUi,
    className = "",
  } = props;

  const {
    context: { onlineStatus },
  } = useContext(DataStateContextC);

  return (
    <div
      className={makeClassNames({
        [`detailed-experience-menu ${className}`]: true,
      })}
    >
      <div
        className={makeClassNames({
          "dropdown is-right": true,
          [activeClassName]: state.value === StateValue.active,
        })}
      >
        <div
          className="dropdown-menu detailed-experience-menu__menu"
          role="menu"
        >
          <a
            className="dropdown-content neutral-link detailed__edit-experience-link"
            onClick={requestUpdateExperienceUi}
            href="*"
            style={{
              display: "block",
            }}
          >
            <div className="detailed-experience-menu__content">Edit</div>
          </a>

          <a
            className="dropdown-content neutral-link delete-experience-link"
            onClick={onDeleteExperienceRequest}
            href="*"
            style={{
              display: "block",
            }}
          >
            <div className="detailed-experience-menu__content">Delete</div>
          </a>
        </div>
      </div>

      <button
        className={makeClassNames({
          "button top-options-menu dropdown-trigger": true,
          [noTriggerDocumentEventClassName]: true,
          [isOfflineClassName]: onlineStatus === StateValue.offline,
          [isPartOfflineClassName]: onlineStatus === StateValue.partOffline,
        })}
        onClick={toggleExperienceMenu}
      >
        <span
          className={makeClassNames({
            "icon is-small": true,
            [noTriggerDocumentEventClassName]: true,
          })}
        >
          <i
            className={makeClassNames({
              "fas fa-ellipsis-h": true,
              [noTriggerDocumentEventClassName]: true,
            })}
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  );
}

function UpdateExperienceSuccessNotification() {
  const { requestUpdateExperienceUi } = useContext(DispatchContext);

  return (
    <div className="notification is-success">
      <button
        id={updateExperienceSuccessNotificationId}
        className="delete"
        onClick={requestUpdateExperienceUi}
      />
      Update was successful
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
  } = syncErrors as ExperienceSyncError;

  return (
    <div className="modal is-active delete-experience-component">
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
          {definitionsErrors && (
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
          {definitionsErrors && (
            <button
              className="button is-success delete-experience__ok-button"
              id={fixSyncErrorsId}
              type="button"
              onClick={requestUpdateExperienceUi}
            >
              Fix errors
            </button>
          )}

          <button
            className="button is-warning delete-experience__cancel-button"
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

interface MenuProps {
  state: ShowingOptionsMenuState;
  toggleExperienceMenu: () => void;
  onDeleteExperienceRequest: (event: ReactMouseAnchorEvent) => void;
  className?: string;
  requestUpdateExperienceUi: (event: ReactMouseAnchorEvent) => void;
}
