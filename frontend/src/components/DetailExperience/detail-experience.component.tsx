import React, {
  useLayoutEffect,
  Suspense,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import "./detail-experience.styles.scss";
import {
  Props,
  initState,
  reducer,
  ActionType,
  formatDatetime,
  effectFunctions,
  StateMachine,
  DispatchType,
} from "./detail-experience.utils";
import { setUpRoutePage } from "../../utils/global-window";
import { NewEntry } from "./detail-experience.lazy";
import Loading from "../Loading/loading.component";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { StateValue } from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  newEntryCreatedNotificationCloseId,
  entriesErrorsNotificationCloseId,
} from "./detail-experience.dom";
import { isOfflineId } from "../../utils/offlines";
import makeClassNames from "classnames";
import { getSyncEntriesErrorsLedger } from "../../apollo/unsynced-ledger";
import { UnsyncableEntryError } from "../../utils/unsynced-ledger.types";

export function DetailExperience(props: Props) {
  const { experience } = props;
  const syncEntriesErrors =
    getSyncEntriesErrorsLedger(experience.id) ||
    // istanbul ignore next:
    {};
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);
  const entries = entryConnectionToNodes(experience.entries);

  const {
    states: { newEntryActive: newEntryActiveState },
    effects: { general: generalEffects },
    context,
  } = stateMachine;

  useLayoutEffect(() => {
    setUpRoutePage({
      title: experience.title,
    });
  }, [experience]);

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const onOpenNewEntry = useCallback(() => {
    dispatch({
      type: ActionType.TOGGLE_NEW_ENTRY_ACTIVE,
    });
  }, []);

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
  }, []);

  const onCloseEntriesErrorsNotification = useCallback(() => {
    dispatch({
      type: ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION,
    });
  }, []);

  const { autoCloseNotificationTimeoutId } = context;

  useEffect(() => {
    return () => {
      // istanbul ignore else
      if (autoCloseNotificationTimeoutId) {
        clearTimeout(autoCloseNotificationTimeoutId);
      }
    };
  }, [autoCloseNotificationTimeoutId]);

  return (
    <>
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
          state={stateMachine.states.entriesErrors}
          onCloseEntriesErrorsNotification={onCloseEntriesErrorsNotification}
        />

        <NewEntryNotification
          state={stateMachine.states.newEntryCreated}
          onCloseNewEntryCreatedNotification={
            onCloseNewEntryCreatedNotification
          }
        />

        {entries.length === 0 ? (
          <button className="button no-entry-alert" onClick={onOpenNewEntry}>
            Click here to create your first entry
          </button>
        ) : (
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
        )}
      </div>

      <div className="new-entry-trigger" onClick={onOpenNewEntry}>
        <span>+</span>
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

interface EntryProps {
  entry: EntryFragment;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
  entriesErrors: UnsyncableEntryError;
  dispatch: DispatchType;
}

interface DataDefinitionIdToNameMap {
  [dataDefinitionId: string]: string;
}
