import React, {
  useLayoutEffect,
  Suspense,
  useReducer,
  useCallback,
  useEffect,
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
  StateMachine,
  DispatchType,
  ShowingOptionsMenuState,
  DataState,
} from "./utils";
import { setUpRoutePage } from "../../utils/global-window";
import { NewEntry } from "./detail-experience.lazy";
import Loading from "../Loading/loading.component";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { StateValue, ReactMouseAnchorEvent } from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
  noTriggerDocumentEventClassName,
  noEntryTrigger,
} from "./detail-experience.dom";
import { isOfflineId } from "../../utils/offlines";
import makeClassNames from "classnames";
import { getSyncEntriesErrorsLedger } from "../../apollo/unsynced-ledger";
import { UnsyncableEntryError } from "../../utils/unsynced-ledger.types";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { useDeleteExperiencesMutation } from "./detail-experience.injectables";

export function DetailExperience(props: Props) {
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);
  const [deleteExperiences] = useDeleteExperiencesMutation();

  const {
    states: {
      newEntryActive,
      deleteExperience,
      showingOptionsMenu,
      experience: experienceState,
      entriesErrors,
      newEntryCreated,
    },
    effects: { general: generalEffects },
    timeouts: {
      fetchExperience: fetchExperienceTimeout,
      autoCloseNotification: autoCloseNotificationTimeout,
    },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
    deleteExperiences,
    experience: (experienceState as DataState).data,
  });

  useEffect(() => {
    if (fetchExperienceTimeout) {
      return () => {
        clearTimeout(fetchExperienceTimeout);
      };
    }

    return undefined;
  }, [fetchExperienceTimeout]);

  useEffect(() => {
    if (autoCloseNotificationTimeout) {
      return () => {
        clearTimeout(autoCloseNotificationTimeout);
      };
    }

    return undefined;
  }, [autoCloseNotificationTimeout]);

  const onOpenNewEntry = useCallback((e: ReactMouseAnchorEvent) => {
    e.preventDefault();

    dispatch({
      type: ActionType.TOGGLE_NEW_ENTRY_ACTIVE,
    });
  }, []);

  function render() {
    switch (experienceState.value) {
      case StateValue.loading:
        return <Loading />;

      case StateValue.errors:
        return experienceState.error;

      case StateValue.data:
        return (
          <ExperienceComponent
            {...props}
            experience={experienceState.data}
            newEntryActive={newEntryActive}
            deleteExperience={deleteExperience}
            showingOptionsMenu={showingOptionsMenu}
            dispatch={dispatch}
            onOpenNewEntry={onOpenNewEntry}
            entriesErrors={entriesErrors}
            newEntryCreated={newEntryCreated}
          />
        );
    }
  }

  return (
    <>
      <Header />

      <a className="new-entry-trigger" onClick={onOpenNewEntry} href="*">
        <span>+</span>
      </a>

      {render()}
    </>
  );
}

// istanbul ignore next:
export default DetailExperience;

function ExperienceComponent(props: ExperienceProps) {
  const {
    experience,
    dispatch,
    showingOptionsMenu,
    deleteExperience: deleteExperienceState,
    newEntryActive: newEntryActiveState,
    newEntryCreated,
    entriesErrors,
    onOpenNewEntry,
  } = props;

  const syncEntriesErrors =
    getSyncEntriesErrorsLedger(experience.id) ||
    // istanbul ignore next:
    {};

  const entries = entryConnectionToNodes(experience.entries);

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
        type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
        key: "close",
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [experience]);

  const dataDefinitionIdToNameMap = experience.dataDefinitions.reduce(
    (acc, d) => {
      acc[d.id] = d.name;
      return acc;
    },
    {} as DataDefinitionIdToNameMap,
  );

  const onCloseNewEntryCreatedNotification = useCallback(() => {
    dispatch({
      type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onCloseEntriesErrorsNotification = useCallback(() => {
    dispatch({
      type: ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onDeclineDeleteExperience = useCallback(() => {
    dispatch({
      type: ActionType.DELETE_EXPERIENCE_CANCELLED,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onConfirmDeleteExperience = useCallback(() => {
    dispatch({
      type: ActionType.DELETE_EXPERIENCE_CONFIRMED,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onDeleteExperienceRequest = useCallback((e: ReactMouseAnchorEvent) => {
    e.preventDefault();

    dispatch({
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  const onToggleMenu = useCallback(() => {
    dispatch({
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  return (
    <>
      {deleteExperienceState.value === StateValue.active && (
        <DeleteExperienceModal
          title={experience.title}
          onDeclineDeleteExperience={onDeclineDeleteExperience}
          onConfirmDeleteExperience={onConfirmDeleteExperience}
        />
      )}

      <div className="container detailed-experience-component">
        {newEntryActiveState.value === StateValue.active && (
          <Suspense fallback={<Loading />}>
            <NewEntry
              experience={experience}
              detailedExperienceDispatch={dispatch}
              clientId={newEntryActiveState.active.context.clientId}
            />
          </Suspense>
        )}

        <EntriesErrorsNotification
          state={entriesErrors}
          onCloseEntriesErrorsNotification={onCloseEntriesErrorsNotification}
        />

        <NewEntryNotification
          state={newEntryCreated}
          onCloseNewEntryCreatedNotification={
            onCloseNewEntryCreatedNotification
          }
        />

        {entries.length === 0 && (
          <div className="no-entry-alert">
            <button
              className={makeClassNames({
                button: true,
                [noEntryTrigger]: true,
              })}
              onClick={onOpenNewEntry}
            >
              Click here to create your first entry
            </button>

            <Menu
              state={showingOptionsMenu}
              onToggleMenu={onToggleMenu}
              onDeleteExperienceRequest={onDeleteExperienceRequest}
              className="no-entry-menu"
            />
          </div>
        )}

        {entries.length > 0 && (
          <>
            <Menu
              state={showingOptionsMenu}
              onToggleMenu={onToggleMenu}
              onDeleteExperienceRequest={onDeleteExperienceRequest}
            />

            <div className="entries">
              {entries.map((entry) => {
                return (
                  <EntryComponent
                    key={entry.id}
                    entry={entry}
                    dataDefinitionIdToNameMap={dataDefinitionIdToNameMap}
                    entriesErrors={syncEntriesErrors[entry.clientId as string]}
                    dispatch={dispatch}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EntryComponent(props: EntryProps) {
  const { entry, dataDefinitionIdToNameMap, entriesErrors, dispatch } = props;
  const { updatedAt, dataObjects: dObjects, id: entryId, clientId } = entry;
  const dataObjects = dObjects as DataObjectFragment[];
  const isOffline = isOfflineId(entryId);

  return (
    <div
      className={makeClassNames({
        "box media entry": true,
        "entry--is-danger": isOffline,
      })}
    >
      <div className="media-content">
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

        {entriesErrors && (
          <div>
            <hr />

            <p className="subtitle is-6">Did not sync because of errors</p>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <button
                type="button"
                className="button is-small entry__edit"
                onClick={() => {
                  dispatch({
                    type: ActionType.ON_EDIT_ENTRY,
                    entryClientId: clientId as string,
                  });
                }}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="media-right">x</div>
    </div>
  );
}

function entryConnectionToNodes(entries: EntryConnectionFragment) {
  return (entries.edges as EntryConnectionFragment_edges[]).map((e) => {
    const edge = e as EntryConnectionFragment_edges;
    return edge.node as EntryFragment;
  });
}

function EntriesErrorsNotification(props: {
  state: StateMachine["states"]["entriesErrors"];
  onCloseEntriesErrorsNotification: () => void;
}) {
  const { state, onCloseEntriesErrorsNotification } = props;

  if (state.value === StateValue.inactive) {
    return null;
  }

  return (
    <div className="message is-danger">
      <div className="message-header">
        <p>There were errors while syncing entry to our server</p>
        <button
          id={entriesErrorsNotificationCloseId}
          className="delete"
          aria-label="delete"
          onClick={onCloseEntriesErrorsNotification}
        />
      </div>

      <div className="message-body">
        {Object.entries(state.active.context.errors).map(
          ([id, entryErrorsList]) => {
            return (
              <div key={id} id={id}>
                {entryErrorsList.map((entryErrors, entryErrorsIndex) => {
                  const [label, errors] = entryErrors;

                  return (
                    <div key={entryErrorsIndex}>
                      {label && <div> Data object: {label}</div>}

                      {errors.map((entryError, index) => {
                        const [key, value] = entryError;
                        return (
                          <div key={index}>
                            <span>{key}</span>
                            <span>{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

function NewEntryNotification(props: {
  state: StateMachine["states"]["newEntryCreated"];
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

function DeleteExperienceModal(props: DeleteExperienceProps) {
  const { title, onDeclineDeleteExperience, onConfirmDeleteExperience } = props;

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
            className="delete new-entry__delete"
            aria-label="close"
            type="button"
            onClick={onDeclineDeleteExperience}
          ></button>
        </header>

        <footer className="modal-card-foot">
          <button
            className="button is-success"
            id={""}
            type="button"
            onClick={onConfirmDeleteExperience}
          >
            Ok
          </button>

          <button
            className="button is-danger cancel-button"
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

function Menu(props: MenuProps) {
  const {
    state,
    onToggleMenu,
    onDeleteExperienceRequest,
    className = "",
  } = props;

  return (
    <div className={`detailed-menu ${className}`}>
      <div
        className={makeClassNames({
          "dropdown is-right": true,
          "is-active": state.value === StateValue.active,
        })}
      >
        <div className="dropdown-menu detailed-menu__menu" role="menu">
          <a
            className="dropdown-content neutral-link"
            onClick={onDeleteExperienceRequest}
            href="*"
            style={{
              display: "block",
            }}
          >
            <div className="detailed-menu__content">Delete</div>
          </a>
        </div>
      </div>

      <button
        className={makeClassNames({
          "button top-options-menu dropdown-trigger": true,
          [noTriggerDocumentEventClassName]: true,
        })}
        onClick={onToggleMenu}
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

interface EntryProps {
  entry: EntryFragment;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  entriesErrors: UnsyncableEntryError;
  dispatch: DispatchType;
}

interface DataDefinitionIdToNameMap {
  [dataDefinitionId: string]: string;
}

interface DeleteExperienceProps {
  title: string;
  onDeclineDeleteExperience: () => void;
  onConfirmDeleteExperience: () => void;
}

interface MenuProps {
  state: ShowingOptionsMenuState;
  onToggleMenu: () => void;
  onDeleteExperienceRequest: (event: ReactMouseAnchorEvent) => void;
  className?: string;
}

type ExperienceProps = {
  experience: ExperienceFragment;
  dispatch: DispatchType;
  onOpenNewEntry: (e: ReactMouseAnchorEvent) => void;
} & Pick<
  StateMachine["states"],
  | "showingOptionsMenu"
  | "entriesErrors"
  | "newEntryActive"
  | "deleteExperience"
  | "newEntryCreated"
>;
