import { Reducer, Dispatch } from "react";
import { ApolloError } from "@apollo/client";
import { wrapReducer } from "../../logger";
import { RouteChildrenProps, match } from "react-router-dom";
import { DetailExperienceRouteMatch } from "../../utils/urls";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { isOfflineId } from "../../utils/offlines";
import { getUnsyncedExperience } from "../../apollo/unsynced-ledger";
import immer, { Draft } from "immer";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import {
  ActiveVal,
  InActiveVal,
  RequestedVal,
  LoadingVal,
  ErrorsVal,
  DataVal,
  InitialVal,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { scrollDocumentToTop } from "./detail-experience.injectables";
import { StateValue } from "../../utils/types";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import {
  getSyncingExperience,
  putOrRemoveSyncingExperience,
} from "../../apollo/syncing-experience-ledger";
import {
  replaceOrRemoveExperiencesInGetExperiencesMiniQuery,
  purgeExperiencesFromCache,
} from "../../apollo/update-get-experiences-mini-query";
import { EntryConnectionFragment_edges } from "../../graphql/apollo-types/EntryConnectionFragment";
import {
  CreateEntryErrorFragment,
  CreateEntryErrorFragment_dataObjects,
} from "../../graphql/apollo-types/CreateEntryErrorFragment";
import { putAndRemoveUnSyncableEntriesErrorsLedger } from "../../apollo/unsynced-ledger";
import {
  UnsyncableEntriesErrors,
  UnsyncableEntryError,
  RemoveUnsyncableEntriesErrors,
} from "../../utils/unsynced-ledger.types";
import { MY_URL } from "../../utils/urls";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../../apollo/delete-experience-cache";
import { DeleteExperiencesComponentProps } from "../../utils/experience.gql.types";
import { DetailedExperienceQueryResult } from "../../utils/experience.gql.types";
import { manuallyFetchDetailedExperience } from "../../utils/experience.gql.types";
import { entriesPaginationVariables } from "../../graphql/entry.gql";
import {
  parseStringError,
  GENERIC_SERVER_ERROR,
} from "../../utils/common-errors";

export enum ActionType {
  TOGGLE_NEW_ENTRY_ACTIVE = "@detailed-experience/deactivate-new-entry",
  ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED = "@detailed-experience/on-new-entry-created/offline-experience-synced",
  ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION = "@detailed-experience/on-close-new-entry-created-notification",
  SET_TIMEOUT = "@detailed-experience/set-timeout",
  ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION = "@detailed-experience/on-close-entries-errors-notification",
  ON_EDIT_ENTRY = "@detailed-experience/on-edit-entry",
  DELETE_EXPERIENCE_REQUEST = "@detailed-experience/delete-experience-request",
  DELETE_EXPERIENCE_CANCELLED = "@detailed-experience/delete-experience-cancelled",
  DELETE_EXPERIENCE_CONFIRMED = "@detailed-experience/delete-experience-confirmed",
  TOGGLE_SHOW_OPTIONS_MENU = "@detailed-experience/toggle-options-menu",
  ON_DATA_RECEIVED = "@detailed-experience/on-data-received",
  DATA_RE_FETCH_REQUEST = "@detailed-experience/data-re-fetch-request",
  CLEAR_TIMEOUT = "@detailed-experience/clear-timeout",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        delete proxy.effects.general[StateValue.hasEffects];

        switch (type) {
          case ActionType.TOGGLE_NEW_ENTRY_ACTIVE:
            handleToggleNewEntryActiveAction(proxy);
            break;

          case ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED:
            handleOnNewEntryCreatedOrOfflineExperienceSynced(
              proxy,
              payload as OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
            );
            break;

          case ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION:
            handleOnCloseNewEntryCreatedNotification(proxy);
            break;

          case ActionType.SET_TIMEOUT:
            handleSetTimeoutAction(proxy, payload as SetTimeoutPayload);
            break;

          case ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION:
            handleOnCloseEntriesErrorsNotification(proxy);
            break;

          case ActionType.ON_EDIT_ENTRY:
            handleOnEditEntryAction(proxy, payload as OnEditEntryPayload);
            break;

          case ActionType.DELETE_EXPERIENCE_REQUEST:
            handleDeleteExperienceRequestAction(
              proxy,
              payload as DeleteExperienceRequestPayload,
            );
            break;

          case ActionType.DELETE_EXPERIENCE_CANCELLED:
            handleDeleteExperienceCancelledAction(proxy);
            break;

          case ActionType.DELETE_EXPERIENCE_CONFIRMED:
            handleDeleteExperienceConfirmedAction(proxy);
            break;

          case ActionType.TOGGLE_SHOW_OPTIONS_MENU:
            handleToggleShowOptionsMenuAction(
              proxy,
              payload as ToggleOptionsMenuPayload,
            );
            break;

          case ActionType.ON_DATA_RECEIVED:
            handleOnDataReceivedAction(proxy, payload as OnDataReceivedPayload);
            break;

          case ActionType.DATA_RE_FETCH_REQUEST:
            handleDataReFetchRequestAction(proxy);
            break;

          case ActionType.CLEAR_TIMEOUT:
            handleClearTimoutAction(proxy, payload as ClearTimeoutPayload);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(props: Props): StateMachine {
  return {
    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "fetchDetailedExperienceEffect",
                ownArgs: {},
              },
            ],
          },
        },
      },
    },
    states: {
      newEntryActive: {
        value: StateValue.inactive,
      },
      notification: {
        value: StateValue.inactive,
      },
      newEntryCreated: {
        value: StateValue.inactive,
      },
      entriesErrors: {
        value: StateValue.inactive,
      },
      deleteExperience: {
        value: StateValue.inactive,
      },
      showingOptionsMenu: {
        value: StateValue.inactive,
      },
      experience: {
        value: StateValue.loading,
      },
    },

    timeouts: {},
  };
}

function handleToggleNewEntryActiveAction(proxy: DraftStateMachine) {
  const { states } = proxy;
  const {
    newEntryActive: { value },
  } = states;

  if (value === StateValue.active) {
    states.newEntryActive.value = StateValue.inactive;
    return;
  }

  const state = states.newEntryActive as Draft<NewEntryActive>;
  state.value = StateValue.active;
  state.active = {
    context: {},
  };
}

function handleOnNewEntryCreatedOrOfflineExperienceSynced(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
) {
  const { states } = proxy;
  const { newEntryActive, notification } = states;
  newEntryActive.value = StateValue.inactive;
  notification.value = StateValue.inactive;

  let unsyncableEntriesErrors = handleMaybeNewEntryCreatedHelper(
    proxy,
    payload,
  ) as UnsyncableEntriesErrors;

  unsyncableEntriesErrors = handleMaybeEntriesErrorsHelper(
    proxy,
    payload,
    unsyncableEntriesErrors,
  );

  const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);

  effects.push({
    key: "scrollDocToTopEffect",
    ownArgs: {},
  });

  // istanbul ignore else:
  if (Object.keys(unsyncableEntriesErrors).length) {
    effects.push({
      key: "putEntriesErrorsInLedgerEffect",
      ownArgs: unsyncableEntriesErrors,
    });
  }
}

function handleMaybeNewEntryCreatedHelper(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
): RemoveUnsyncableEntriesErrors | UnsyncableEntriesErrors {
  const { mayBeNewEntry } = payload;
  const emptyReturn = {} as RemoveUnsyncableEntriesErrors;

  // istanbul ignore next:
  if (!mayBeNewEntry) {
    return emptyReturn;
  }

  const { states } = proxy;
  const { newEntryCreated } = states;
  const { updatedAt, clientId, id } = mayBeNewEntry;

  const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);
  effects.push(
    {
      key: "fetchDetailedExperienceEffect",
      ownArgs: {},
    },
    {
      key: "autoCloseNotificationEffect",
      ownArgs: {},
    },
  );

  const newEntryState = newEntryCreated as Draft<NewEntryCreatedNotification>;
  newEntryState.value = StateValue.active;

  newEntryState.active = {
    context: {
      message: `New entry created on: ${formatDatetime(updatedAt)}`,
    },
  };

  // offline entry synced. id === clientId => offline entry
  // istanbul ignore else:
  if (clientId && id !== clientId) {
    effects.push({
      key: "onEntrySyncedEffect",
      ownArgs: {
        clientId,
      },
    });

    return {
      [clientId]: null,
    };
  }

  // istanbul ignore next:
  return emptyReturn;
}

function handleMaybeEntriesErrorsHelper(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
  unsyncableEntriesErrors: UnsyncableEntriesErrors,
) {
  const { mayBeEntriesErrors } = payload;

  // istanbul ignore next:
  if (!mayBeEntriesErrors) {
    return unsyncableEntriesErrors;
  }

  const {
    states: { entriesErrors },
  } = proxy;

  const entriesErrorsState = entriesErrors as Draft<EntriesErrorsNotification>;
  const errorValues = {} as UnsyncableEntriesErrors;

  entriesErrorsState.value = StateValue.active;
  entriesErrorsState.active = {
    context: {
      errors: errorValues,
    },
  };

  mayBeEntriesErrors.forEach((entryError) => {
    const {
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars*/
      __typename,
      meta: { clientId },
      dataObjects,
      ...otherErrors
    } = entryError;

    const errors: UnsyncableEntryError = [];

    // istanbul ignore else:
    if (dataObjects) {
      dataObjects.forEach((d) => {
        const {
          /* eslint-disable-next-line @typescript-eslint/no-unused-vars*/
          __typename,
          meta: { index },
          ...otherDataErrors
        } = d as CreateEntryErrorFragment_dataObjects;

        const dataErrors: [string, string][] = [];

        Object.entries(otherDataErrors).forEach(([k, v]) => {
          if (v) {
            dataErrors.push([k, v]);
          }
        });

        errors.push([index + 1, dataErrors]);
      });
    }

    Object.entries(otherErrors).forEach(([k, v]) => {
      if (v) {
        errors.push(["", [[k, v]]]);
      }
    });

    unsyncableEntriesErrors[clientId as string] = errors;
    errorValues[clientId as string] = errors;
  });

  return unsyncableEntriesErrors;
}

function handleOnCloseNewEntryCreatedNotification(proxy: DraftStateMachine) {
  proxy.states.newEntryCreated.value = StateValue.inactive;
}

function handleOnCloseEntriesErrorsNotification(proxy: DraftStateMachine) {
  proxy.states.entriesErrors.value = StateValue.inactive;
}

function handleSetTimeoutAction(
  proxy: DraftStateMachine,
  payload: SetTimeoutPayload,
) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key] = val;
  });
}

function handleOnEditEntryAction(
  proxy: DraftStateMachine,
  payload: OnEditEntryPayload,
) {
  const {
    states: { newEntryActive },
  } = proxy;

  const state = newEntryActive as Draft<NewEntryActive>;
  state.value = StateValue.active;
  state.active = {
    context: {
      clientId: payload.entryClientId,
    },
  };
}

function handleDeleteExperienceRequestAction(
  proxy: DraftStateMachine,
  payload: DeleteExperienceRequestPayload,
) {
  const {
    states: { deleteExperience },
  } = proxy;

  deleteExperience.value = StateValue.active;
  const deleteExperienceActive = deleteExperience as Draft<
    DeleteExperienceActiveState
  >;

  deleteExperienceActive.active = {
    context: {
      key: payload.key,
    },
  };
}

function handleDeleteExperienceCancelledAction(proxy: DraftStateMachine) {
  const {
    states: { deleteExperience },
  } = proxy;

  deleteExperience.value = StateValue.inactive;

  const deleteExperienceActive = deleteExperience as DeleteExperienceActiveState;

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "cancelDeleteExperienceEffect",
    ownArgs: {
      key: deleteExperienceActive.active.context.key,
    },
  });
}

function handleDeleteExperienceConfirmedAction(proxy: DraftStateMachine) {
  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "deleteExperienceEffect",
    ownArgs: {},
  });
}

function handleToggleShowOptionsMenuAction(
  proxy: DraftStateMachine,
  payload: ToggleOptionsMenuPayload,
) {
  const {
    states: { showingOptionsMenu },
  } = proxy;

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

function handleOnDataReceivedAction(
  proxy: DraftStateMachine,
  payload: OnDataReceivedPayload,
) {
  const { timeouts, states } = proxy;

  switch (payload.key) {
    case StateValue.data:
      {
        const { data, loading, error } = payload.data;

        if (data) {
          const experience = data.getExperience;

          if (experience) {
            states.experience = {
              value: StateValue.data,
              data: experience,
            };
          } else {
            states.experience = {
              value: StateValue.errors,
              error: GENERIC_SERVER_ERROR,
            };
          }
        } else if (loading) {
          states.experience = {
            value: StateValue.loading,
          };
        } else {
          states.experience = {
            value: StateValue.errors,
            error: parseStringError(error as ApolloError),
          };
        }
      }
      break;

    case StateValue.errors:
      states.experience = {
        value: StateValue.errors,
        error: parseStringError(payload.error),
      };
      break;
  }

  const effects = getGeneralEffects(proxy);

  effects.push(
    {
      key: "clearTimeoutEffect",
      ownArgs: {
        timeoutId: timeouts.fetchExperience,
      },
    },

    {
      key: "onOfflineExperienceSyncedEffect",
      ownArgs: {},
    },
    {
      key: "deleteExperienceRequestedEffect",
      ownArgs: {},
    },
  );
}

async function handleDataReFetchRequestAction(proxy: DraftStateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleClearTimoutAction(
  proxy: DraftStateMachine,
  payload: ClearTimeoutPayload,
) {
  const { key, timedOut } = payload;
  const { timeouts, states } = proxy;

  switch (key) {
    case "fetchExperience":
      timeouts.fetchExperience = undefined;

      if (timedOut) {
        states.experience = {
          value: StateValue.errors,
          error: GENERIC_SERVER_ERROR,
        };
      }
      break;
  }
}

function getExperienceId(props: IndexProps) {
  return (props.match as Match).params.experienceId;
}

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////
const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

const autoCloseNotificationEffect: DefAutoCloseNotificationEffect["func"] = (
  _,
  __,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const timeout = 10 * 1000;

  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
    });
  }, timeout);

  dispatch({
    type: ActionType.SET_TIMEOUT,
    autoCloseNotification: timeoutId,
  });
};

type DefAutoCloseNotificationEffect = EffectDefinition<
  "autoCloseNotificationEffect"
>;

const onOfflineExperienceSyncedEffect: DefOnOfflineExperienceSyncedEffect["func"] = (
  _,
  _props,
  effectArgs,
) => {
  const {
    dispatch,

    experience: { id, entries },
  } = effectArgs;

  const ledger = getSyncingExperience(id);

  // istanbul ignore else
  if (ledger) {
    const { persistor } = window.____ebnis;
    const { offlineExperienceId, newEntryClientId, entriesErrors } = ledger;

    replaceOrRemoveExperiencesInGetExperiencesMiniQuery({
      [offlineExperienceId]: null,
    });

    putOrRemoveSyncingExperience(id);

    const dataToPurge = [
      `Experience:${offlineExperienceId}`,
      `$Experience:${offlineExperienceId}`,
      `DataDefinition:${offlineExperienceId}`,
      "DataObjectErrorMeta:null",
    ];

    let mayBeNewEntry: undefined | EntryFragment = undefined;

    (entries.edges as EntryConnectionFragment_edges[]).forEach((edge) => {
      const node = edge.node as EntryFragment;
      const { id, clientId } = node;

      if (isOfflineId(id)) {
        if (clientId === newEntryClientId) {
          mayBeNewEntry = node;
        }
      } else {
        dataToPurge.push(`Entry:${clientId}`, `DataObject:${clientId}`);
      }

      return !isOfflineId(id) && clientId === newEntryClientId;
    });

    purgeExperiencesFromCache(dataToPurge);

    persistor.persist();

    dispatch({
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
      mayBeNewEntry,
      mayBeEntriesErrors: entriesErrors,
    });
  }
};

type DefOnOfflineExperienceSyncedEffect = EffectDefinition<
  "onOfflineExperienceSyncedEffect"
>;

const putEntriesErrorsInLedgerEffect: DefPutEntriesErrorsInLedgerEffect["func"] = (
  ownArgs,
  props,
  effectArgs,
) => {
  putAndRemoveUnSyncableEntriesErrorsLedger(effectArgs.experience.id, ownArgs);
};

type DefPutEntriesErrorsInLedgerEffect = EffectDefinition<
  "putEntriesErrorsInLedgerEffect",
  UnsyncableEntriesErrors
>;

const onEntrySyncedEffect: DefOnEntrySyncedEffect["func"] = ({ clientId }) => {
  purgeExperiencesFromCache([`Entry:${clientId}`, `DataObject:${clientId}`]);
  const { persistor } = window.____ebnis;
  persistor.persist();
};

type DefOnEntrySyncedEffect = EffectDefinition<
  "onEntrySyncedEffect",
  {
    clientId: string;
  }
>;

const cancelDeleteExperienceEffect: DefCancelDeleteExperienceEffect["func"] = (
  { key },
  props,
  effectArgs,
) => {
  if (key) {
    const { history } = props;
    const { experience } = effectArgs;
    const { id, title } = experience;

    putOrRemoveDeleteExperienceLedger({
      key: StateValue.cancelled,
      id,
      title,
    });

    history.push(MY_URL);
  }
};

type DefCancelDeleteExperienceEffect = EffectDefinition<
  "cancelDeleteExperienceEffect",
  DeleteExperienceRequestPayload
>;

const deleteExperienceRequestedEffect: DefDeleteExperienceRequestedEffect["func"] = (
  _,
  props,
  effectArgs,
) => {
  const { dispatch, experience } = effectArgs;
  const deleteExperienceLedger = getDeleteExperienceLedger(experience.id);

  if (
    deleteExperienceLedger &&
    deleteExperienceLedger.key === StateValue.requested
  ) {
    putOrRemoveDeleteExperienceLedger();

    dispatch({
      type: ActionType.DELETE_EXPERIENCE_REQUEST,
      key: deleteExperienceLedger.key,
    });
  }
};

type DefDeleteExperienceRequestedEffect = EffectDefinition<
  "deleteExperienceRequestedEffect"
>;

const deleteExperienceEffect: DefDeleteExperienceEffect["func"] = async (
  _,
  props,
  effectArgs,
) => {
  const { history } = props;

  const {
    deleteExperiences,

    experience: { id },
  } = effectArgs;

  try {
    const response = await deleteExperiences({
      variables: {
        input: [id],
      },
    });

    const validResponse =
      response && response.data && response.data.deleteExperiences;

    if (!validResponse) {
      return;
    }

    if (validResponse.__typename === "DeleteExperiencesAllFail") {
      return;
    }

    const experienceResponse = validResponse.experiences[0];

    if (experienceResponse.__typename === "DeleteExperienceErrors") {
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

    history.push(MY_URL);
  } catch (error) {}
};

type DefDeleteExperienceEffect = EffectDefinition<"deleteExperienceEffect">;

const fetchDetailedExperienceEffect: DefFetchDetailedExperienceEffect["func"] = async (
  _,
  props,
  { dispatch },
) => {
  const timeout = 15 * 1000;

  const timeoutId = setTimeout(() => {
    dispatch({
      type: ActionType.CLEAR_TIMEOUT,
      key: "fetchExperience",
      timedOut: true,
    });
  }, timeout);

  try {
    const experienceId = getExperienceId(props);

    dispatch({
      type: ActionType.SET_TIMEOUT,
      fetchExperience: timeoutId,
    });

    const data = await manuallyFetchDetailedExperience({
      id: experienceId,
      entriesPagination: entriesPaginationVariables.entriesPagination,
    });

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.data,
      data,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.errors,
      error,
    });
  }
};

type DefFetchDetailedExperienceEffect = EffectDefinition<
  "fetchDetailedExperienceEffect",
  {
    initial?: InitialVal;
  }
>;

const clearTimeoutEffect: DefClearTimeoutEffect["func"] = (ownArgs) => {
  clearTimeout(ownArgs.timeoutId);
};

type DefClearTimeoutEffect = EffectDefinition<
  "clearTimeoutEffect",
  {
    timeoutId: NodeJS.Timeout;
  }
>;

export const effectFunctions = {
  scrollDocToTopEffect,
  autoCloseNotificationEffect,
  onOfflineExperienceSyncedEffect,
  putEntriesErrorsInLedgerEffect,
  onEntrySyncedEffect,
  cancelDeleteExperienceEffect,
  deleteExperienceRequestedEffect,
  deleteExperienceEffect,
  fetchDetailedExperienceEffect,
  clearTimeoutEffect,
};

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

export function getOnlineStatus<T extends { id: string }>(experience: T) {
  const { id } = experience;
  const isOffline = isOfflineId(experience.id);
  const hasUnsaved = getUnsyncedExperience(id);
  const isPartOffline = !isOffline && !!hasUnsaved;
  return { isOffline, isPartOffline };
}

////////////////////////// END HELPER FUNCTIONS ////////////////////////////

type DraftStateMachine = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: Readonly<{
      newEntryActive: Readonly<
        | {
            value: InActiveVal;
          }
        | NewEntryActive
      >;

      newEntryCreated: Readonly<
        | {
            value: InActiveVal;
          }
        | NewEntryCreatedNotification
      >;

      entriesErrors: Readonly<
        | {
            value: InActiveVal;
          }
        | EntriesErrorsNotification
      >;

      notification: Readonly<
        | {
            value: InActiveVal;
          }
        | NotificationActive
      >;

      deleteExperience: DeleteExperienceState;

      showingOptionsMenu: ShowingOptionsMenuState;

      experience: LoadingState | ErrorState | DataState;
    }>;

    timeouts: Timeouts;
  }>;

type Timeouts = Readonly<{
  fetchExperience?: NodeJS.Timeout;
  autoCloseNotification?: NodeJS.Timeout;
}>;

type LoadingState = Readonly<{
  value: LoadingVal;
}>;

type ErrorState = Readonly<{
  value: ErrorsVal;
  error: string;
}>;

export type DataState = Readonly<{
  value: DataVal;
  data: ExperienceFragment;
}>;

export type ShowingOptionsMenuState = Readonly<
  | {
      value: InActiveVal;
    }
  | {
      value: ActiveVal;
    }
>;

type DeleteExperienceState = Readonly<
  | {
      value: InActiveVal;
    }
  | DeleteExperienceActiveState
>;

type DeleteExperienceActiveState = Readonly<{
  value: ActiveVal;
  active: {
    context: {
      key?: RequestedVal; // with key, we know request came from 'my' component
    };
  };
}>;

type NewEntryActive = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      clientId?: string;
    }>;
  }>;
}>;

type EntriesErrorsNotification = Readonly<{
  value: ActiveVal;
  active: {
    context: {
      errors: UnsyncableEntriesErrors;
    };
  };
}>;

type NewEntryCreatedNotification = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      message: string;
    }>;
  }>;
}>;

type NotificationActive = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      message: string;
    }>;
  }>;
}>;

export type IndexCallerProps = RouteChildrenProps<
  DetailExperienceRouteMatch,
  {
    delete: boolean;
  }
>;

export type IndexProps = IndexCallerProps;

export type CallerProps = {
  delete?: boolean;
};

export type Props = IndexCallerProps & CallerProps;

export type Match = match<DetailExperienceRouteMatch>;

type Action =
  | {
      type: ActionType.TOGGLE_NEW_ENTRY_ACTIVE;
    }
  | ({
      type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED;
    } & OnNewEntryCreatedOrOfflineExperienceSyncedPayload)
  | {
      type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION;
    }
  | ({
      type: ActionType.SET_TIMEOUT;
    } & SetTimeoutPayload)
  | {
      type: ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION;
    }
  | ({
      type: ActionType.ON_EDIT_ENTRY;
    } & OnEditEntryPayload)
  | ({
      type: ActionType.DELETE_EXPERIENCE_REQUEST;
    } & DeleteExperienceRequestPayload)
  | {
      type: ActionType.DELETE_EXPERIENCE_CANCELLED;
    }
  | {
      type: ActionType.DELETE_EXPERIENCE_CONFIRMED;
    }
  | ({
      type: ActionType.TOGGLE_SHOW_OPTIONS_MENU;
    } & ToggleOptionsMenuPayload)
  | ({
      type: ActionType.ON_DATA_RECEIVED;
    } & OnDataReceivedPayload)
  | {
      type: ActionType.DATA_RE_FETCH_REQUEST;
    }
  | ({
      type: ActionType.CLEAR_TIMEOUT;
    } & ClearTimeoutPayload);

type ClearTimeoutPayload = {
  key: keyof Timeouts;
  timedOut?: true;
};

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: DetailedExperienceQueryResult;
    }
  | {
      key: ErrorsVal;
      error: Error;
    };

interface ToggleOptionsMenuPayload {
  key?: "close" | "open";
}

interface DeleteExperienceRequestPayload {
  key?: RequestedVal;
}

interface OnEditEntryPayload {
  entryClientId: string;
}

interface OnNewEntryCreatedOrOfflineExperienceSyncedPayload {
  mayBeNewEntry?: EntryFragment | null;
  mayBeEntriesErrors?: CreateEntryErrorFragment[] | null;
}

type SetTimeoutPayload = {
  [k in keyof Timeouts]: NodeJS.Timeout;
};

export type DispatchType = Dispatch<Action>;

export interface DetailedExperienceChildDispatchProps {
  detailedExperienceDispatch: DispatchType;
}

export type EffectArgs = DeleteExperiencesComponentProps & {
  dispatch: DispatchType;
  experience: ExperienceFragment;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

export type EffectType =
  | DefScrollDocToTopEffect
  | DefAutoCloseNotificationEffect
  | DefOnOfflineExperienceSyncedEffect
  | DefPutEntriesErrorsInLedgerEffect
  | DefOnEntrySyncedEffect
  | DefCancelDeleteExperienceEffect
  | DefDeleteExperienceRequestedEffect
  | DefDeleteExperienceEffect
  | DefFetchDetailedExperienceEffect
  | DefClearTimeoutEffect;
