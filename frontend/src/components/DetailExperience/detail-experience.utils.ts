import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import { RouteChildrenProps, match } from "react-router-dom";
import { DetailExperienceRouteMatch } from "../../utils/urls";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { isOfflineId } from "../../utils/offlines";
import { getUnsyncedExperience } from "../../apollo/unsynced-ledger";
import immer, { Draft } from "immer";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import { ActiveVal, InActiveVal } from "../../utils/types";
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
} from "../NewExperience/new-experience.resolvers";
import {
  replaceOrRemoveExperiencesInGetExperiencesMiniQuery,
  purgeExperiencesFromCache,
} from "../../apollo/update-get-experiences-mini-query";
import { EntryConnectionFragment_edges } from "../../graphql/apollo-types/EntryConnectionFragment";
import {
  CreateEntryErrorFragment,
  CreateEntryErrorFragment_dataObjects,
} from "../../graphql/apollo-types/CreateEntryErrorFragment";
import { putAndRemoveSyncEntriesErrorsLedger } from "../../apollo/unsynced-ledger";
import {
  UnsyncableEntriesErrors,
  UnsyncableEntryError,
  RemoveUnsyncableEntriesErrors,
} from "../../utils/unsynced-ledger.types";

export enum ActionType {
  TOGGLE_NEW_ENTRY_ACTIVE = "@detailed-experience/deactivate-new-entry",
  ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED = "@detailed-experience/on-new-entry-created/offline-experience-synced",
  ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION = "@detailed-experience/on-close-new-entry-created-notification",
  SET_TIMEOUT = "@detailed-experience/set-timeout",
  ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION = "@detailed-experience/on-close-entries-errors-notification",
  ON_EDIT_ENTRY = "@detailed-experience/on-edit-entry",
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
            handleSetTimeout(proxy, payload as SetTimeoutPayload);
            break;

          case ActionType.ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION:
            handleOnCloseEntriesErrorsNotification(proxy);
            break;

          case ActionType.ON_EDIT_ENTRY:
            handleOnEditEntryAction(proxy, payload as OnEditEntryPayload);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////
export function initState(props: Props): StateMachine {
  return {
    context: {},
    effects: {
      general: {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "onOfflineExperienceSyncedEffect",
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
    },
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

  const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);

  effects.push({
    key: "scrollDocToTopEffect",
    ownArgs: {},
  });

  let unsyncableEntriesErrors = handleMaybeNewEntryCreatedHelper(
    proxy,
    payload,
  ) as UnsyncableEntriesErrors;

  unsyncableEntriesErrors = handleMaybeEntriesErrorsHelper(
    proxy,
    payload,
    unsyncableEntriesErrors,
  );

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

  const { states, context } = proxy;
  const { newEntryCreated } = states;
  const { updatedAt, clientId, id } = mayBeNewEntry;

  const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);
  effects.push({
    key: "autoCloseNotificationEffect",
    ownArgs: {
      timeoutId: context.autoCloseNotificationTimeoutId,
    },
  });

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
  const errorValues = {} as UnsyncableEntriesErrors

  entriesErrorsState.value = StateValue.active;
  entriesErrorsState.active = {
    context: {
      errors: errorValues
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

function handleSetTimeout(
  proxy: DraftStateMachine,
  payload: SetTimeoutPayload,
) {
  const { context } = proxy;
  const { id } = payload;
  context.autoCloseNotificationTimeoutId = id;
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

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////
const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

const autoCloseNotificationEffect: DefAutoCloseNotificationEffect["func"] = (
  ownArgs,
  _,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const { timeoutId } = ownArgs;

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  const id = setTimeout(() => {
    dispatch({
      type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
    });
  }, 10000);

  dispatch({
    type: ActionType.SET_TIMEOUT,
    id,
  });
};

type DefAutoCloseNotificationEffect = EffectDefinition<
  "autoCloseNotificationEffect",
  {
    timeoutId?: NodeJS.Timeout;
  }
>;

const onOfflineExperienceSyncedEffect: DefOnOfflineExperienceSyncedEffect["func"] = (
  _,
  props,
  effectArgs,
) => {
  const {
    experience: { id, entries },
  } = props;

  const { dispatch } = effectArgs;

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
) => {
  putAndRemoveSyncEntriesErrorsLedger(props.experience.id, ownArgs);
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

export const effectFunctions = {
  scrollDocToTopEffect,
  autoCloseNotificationEffect,
  onOfflineExperienceSyncedEffect,
  putEntriesErrorsInLedgerEffect,
  onEntrySyncedEffect,
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
    context: StateContext;
  }> &
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
    }>;
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

type StateContext = Readonly<{
  autoCloseNotificationTimeoutId?: NodeJS.Timeout;
}>;

type NotificationActive = Readonly<{
  value: ActiveVal;
  active: Readonly<{
    context: Readonly<{
      message: string;
    }>;
  }>;
}>;

export type CallerProps = RouteChildrenProps<DetailExperienceRouteMatch>;

export type Props = CallerProps & {
  experience: ExperienceFragment;
};
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
    } & OnEditEntryPayload);

interface OnEditEntryPayload {
  entryClientId: string;
}

interface OnNewEntryCreatedOrOfflineExperienceSyncedPayload {
  mayBeNewEntry?: EntryFragment | null;
  mayBeEntriesErrors?: CreateEntryErrorFragment[] | null;
}

interface SetTimeoutPayload {
  id?: NodeJS.Timeout;
}

export type DispatchType = Dispatch<Action>;

export interface DetailedExperienceChildDispatchProps {
  detailedExperienceDispatch: DispatchType;
}

export interface EffectArgs {
  dispatch: DispatchType;
}

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type EffectType =
  | DefScrollDocToTopEffect
  | DefAutoCloseNotificationEffect
  | DefOnOfflineExperienceSyncedEffect
  | DefPutEntriesErrorsInLedgerEffect
  | DefOnEntrySyncedEffect;
type EffectList = EffectType[];
