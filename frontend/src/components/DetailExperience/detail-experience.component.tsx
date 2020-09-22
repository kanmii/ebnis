import React, {
  useLayoutEffect,
  Suspense,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  createContext,
  useContext,
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
} from "./detailed-experience-utils";
import { setUpRoutePage } from "../../utils/global-window";
import { NewEntry } from "./detail-experience.lazy";
import Loading from "../Loading/loading.component";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { StateValue, ReactMouseAnchorEvent } from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
  noTriggerDocumentEventClassName,
  noEntryTriggerId,
  refetchExperienceId,
  neueHolenEinträgeId,
  holenNächstenEinträgeId,
} from "./detail-experience.dom";
import { isOfflineId } from "../../utils/offlines";
import makeClassNames from "classnames";
import { useDeleteExperiencesMutation } from "./detail-experience.injectables";
import { activeClassName } from "../../utils/utils.dom";
import { useWithSubscriptionContext } from "../../apollo/injectables";

type DispatchContextValue = Readonly<{
  onOpenNewEntry: (e: ReactMouseAnchorEvent) => void;
  onCloseNewEntryCreatedNotification: () => void;
  onCloseEntriesErrorsNotification: () => void;
  onDeclineDeleteExperience: () => void;
  onConfirmDeleteExperience: () => void;
  onDeleteExperienceRequest: (e: ReactMouseAnchorEvent) => void;
  onToggleMenu: () => void;
  onRefetchEntries: () => void;
  holenNächstenEinträge: () => void;
  dispatch: DispatchType;
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
    timeouts: { autoCloseNotification: autoCloseNotificationTimeout },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
    deleteExperiences,
  });

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

  const contextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      onOpenNewEntry,
      onCloseNewEntryCreatedNotification: () => {
        dispatch({
          type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
        });
      },
      onCloseEntriesErrorsNotification: () => {
        dispatch({
          type: ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION,
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
      onToggleMenu: () => {
        dispatch({
          type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
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
                className="new-entry-trigger"
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
    onCloseEntriesErrorsNotification,
    onCloseNewEntryCreatedNotification,
    onRefetchEntries,
  } = useContext(DispatchContext);

  const {
    context,
    states: {
      deleteExperience: deleteExperienceState,
      newEntryActive: newEntryActiveState,
      newEntryCreated,
      entriesErrors,
      einträge: einträgeStatten,
    },
  } = useContext(DataStateContextC);

  const { experience } = context;

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

  return (
    <>
      {deleteExperienceState.value === StateValue.active && (
        <DeleteExperienceModal />
      )}

      <div className="container detailed-experience-component">
        {newEntryActiveState.value === StateValue.active && (
          <Suspense fallback={<Loading />}>
            <NewEntry
              experience={experience}
              detailedExperienceDispatch={dispatch}
              bearbeitenEintrag={
                newEntryActiveState.active.context.bearbeitenEintrag
              }
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
    onToggleMenu,
    onDeleteExperienceRequest,
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

          <Menu
            state={showingOptionsMenu}
            onToggleMenu={onToggleMenu}
            onDeleteExperienceRequest={onDeleteExperienceRequest}
            className="no-entry-menu"
          />
        </div>
      )}

      {entries && entries.length > 0 && (
        <>
          <Menu
            state={showingOptionsMenu}
            onToggleMenu={onToggleMenu}
            onDeleteExperienceRequest={onDeleteExperienceRequest}
          />

          <div className="entries">
            {entries.map((daten, index) => {
              return (
                <EntryComponent key={daten.eintragDaten.id} state={daten} />
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

function EntryComponent(props: { state: DataStateContextEntry }) {
  const { dispatch } = useContext(DispatchContext);

  const {
    context: { dataDefinitionIdToNameMap },
  } = useContext(DataStateContextC);

  const {
    state: { eintragDaten, nichtSynchronisiertFehler },
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

            <div
              style={{
                textAlign: "right",
              }}
            >
              <button
                type="button"
                className="button is-small detailed-experience__entry-edit"
                onClick={() => {
                  dispatch({
                    type: ActionType.TOGGLE_NEW_ENTRY_ACTIVE,
                    bearbeitenEintrag: eintragDaten,
                  });
                }}
              >
                Beheben
              </button>
            </div>
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

function EntriesErrorsNotification(props: {
  state: DataState["data"]["states"]["entriesErrors"];
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
            className="delete new-entry__delete"
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
          [activeClassName]: state.value === StateValue.active,
        })}
      >
        <div className="dropdown-menu detailed-menu__menu" role="menu">
          <a
            className="dropdown-content neutral-link delete-experience-link"
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

interface MenuProps {
  state: ShowingOptionsMenuState;
  onToggleMenu: () => void;
  onDeleteExperienceRequest: (event: ReactMouseAnchorEvent) => void;
  className?: string;
}
