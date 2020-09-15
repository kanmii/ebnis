import { Reducer, Dispatch } from "react";
import { ApolloError, FetchPolicy } from "@apollo/client";
import { wrapReducer } from "../../logger";
import { RouteChildrenProps, match } from "react-router-dom";
import { DetailExperienceRouteMatch } from "../../utils/urls";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { isOfflineId } from "../../utils/offlines";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
} from "../../apollo/unsynced-ledger";
import immer, { Draft } from "immer";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import {
  ActiveVal,
  InActiveVal,
  RequestedVal,
  ErrorsVal,
  DataVal,
  LoadingState,
  LoadingVal,
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
  purgeExperience,
  deleteCacheKeys,
} from "../../apollo/update-get-experiences-mini-query";
import {
  CreateEntryErrorFragment,
  CreateEntryErrorFragment_dataObjects,
} from "../../graphql/apollo-types/CreateEntryErrorFragment";
import { putAndRemoveUnSyncableEntriesErrorsLedger } from "../../apollo/unsynced-ledger";
import { UnsyncableEntriesErrors } from "../../utils/unsynced-ledger.types";
import { MY_URL } from "../../utils/urls";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../../apollo/delete-experience-cache";
import {
  DeleteExperiencesComponentProps,
  DetailedExperienceQueryResult,
} from "../../utils/experience.gql.types";
import { manuallyFetchDetailedExperience } from "../../utils/experience.gql.types";
import {
  parseStringError,
  DATA_FETCHING_FAILED,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { PaginationInput } from "../../graphql/apollo-types/globalTypes";
import { sammelnZwischengespeicherteErfahrung } from "../../apollo/sammeln-zwischengespeicherte-erfahrung";
import { PageInfoFragment } from "../../graphql/apollo-types/PageInfoFragment";
import { GetEntriesUnionFragment } from "../../graphql/apollo-types/GetEntriesUnionFragment";
import {
  EntryConnectionFragment_edges,
  EntryConnectionFragment,
} from "../../graphql/apollo-types/EntryConnectionFragment";

export enum ActionType {
  TOGGLE_NEW_ENTRY_ACTIVE = "@detailed-experience/deactivate-new-entry",
  ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED = "@detailed-experience/on-new-entry-created/offline-experience-synced",
  ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION = "@detailed-experience/on-close-new-entry-created-notification",
  SET_TIMEOUT = "@detailed-experience/set-timeout",
  ON_CLOSE_ENTRIES_ERRORS_NOTIFICATION = "@detailed-experience/on-close-entries-errors-notification",
  DELETE_EXPERIENCE_REQUEST = "@detailed-experience/delete-experience-request",
  DELETE_EXPERIENCE_CANCELLED = "@detailed-experience/delete-experience-cancelled",
  DELETE_EXPERIENCE_CONFIRMED = "@detailed-experience/delete-experience-confirmed",
  TOGGLE_SHOW_OPTIONS_MENU = "@detailed-experience/toggle-options-menu",
  ON_DATA_RECEIVED = "@detailed-experience/on-data-received",
  RE_FETCH_EXPERIENCE = "@detailed-experience/re-fetch-experience",
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
            handleToggleNewEntryActiveAction(
              proxy,
              payload as NewEntryActivePayload,
            );
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

          case ActionType.RE_FETCH_EXPERIENCE:
            handleRefetchExperienceAction(proxy);
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
      value: StateValue.loading,
      // newEntryActive: {
      //   value: StateValue.inactive,
      // },
      // notification: {
      //   value: StateValue.inactive,
      // },
      // newEntryCreated: {
      //   value: StateValue.inactive,
      // },
      // entriesErrors: {
      //   value: StateValue.inactive,
      // },
      // deleteExperience: {
      //   value: StateValue.inactive,
      // },
      // showingOptionsMenu: {
      //   value: StateValue.inactive,
      // },
      // experience: {
      //   value: StateValue.loading,
      // },
    },

    timeouts: {},
  };
}

function handleToggleNewEntryActiveAction(
  proxy: DraftStateMachine,
  payload: NewEntryActivePayload,
) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const { bearbeitenEintrag } = payload;

    const {
      newEntryActive: { value },
    } = states;

    if (bearbeitenEintrag) {
      const state = states.newEntryActive as Draft<NewEntryActive>;
      state.value = StateValue.active;
      state.active = {
        context: {
          bearbeitenEintrag,
        },
      };

      return;
    }

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
}

function handleOnNewEntryCreatedOrOfflineExperienceSynced(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const states = globalStates.data.states;

    const { newEntryActive, notification } = states;
    newEntryActive.value = StateValue.inactive;
    notification.value = StateValue.inactive;

    handleMaybeNewEntryCreatedHelper(proxy, payload);

    const unsyncableEntriesErrors = handleMaybeEntriesErrorsHelper(
      proxy,
      payload,
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
}

function handleMaybeNewEntryCreatedHelper(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
) {
  const {
    mayBeNewEntry,
    mayBeEntriesErrors,
    vielleichtBearbeitenEintrag,
  } = payload;

  // istanbul ignore next:
  if (!mayBeNewEntry) {
    return;
  }

  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const { states, context } = globalStates.data;
    const { entries } = context;
    const { neuEintragDaten, zustand } = mayBeNewEntry;

    const {
      updatedAt,
      clientId: neuErstellteEintragKlientId,
    } = neuEintragDaten;

    const { newEntryCreated } = states;

    const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);
    effects.push({
      key: "autoCloseNotificationEffect",
      ownArgs: {},
    });

    const neuErstellteEintragFehler =
      mayBeEntriesErrors &&
      mayBeEntriesErrors.find((error) => {
        return error.meta.clientId === neuErstellteEintragKlientId;
      });

    if (neuErstellteEintragFehler) {
      return;
    }

    const newEntryState = newEntryCreated as Draft<NewEntryCreatedNotification>;
    newEntryState.value = StateValue.active;

    newEntryState.active = {
      context: {
        message: `New entry created on: ${formatDatetime(updatedAt)}`,
      },
    };

    // ein völlig neu Eintrag
    if (!(vielleichtBearbeitenEintrag || zustand === "ganz-nue")) {
      entries.unshift(neuEintragDaten);
    } else {
      // wir ersetzen die neu Eintrag mit dem zuletzt Eintrag

      const { clientId, dataObjects } = neuEintragDaten;

      context.entries = entries.map((kante) => {
        return kante.id === clientId ? neuEintragDaten : kante;
      });

      // und die Offline-Einträge muss auf die Cache entfernen werden

      effects.push({
        key: "deleteCacheKeysEffect",
        ownArgs: {
          keys: [`Entry:${clientId}`].concat(
            dataObjects.map((d) => {
              return `DataObject:${
                (d as DataObjectFragment).clientId as string
              }`;
            }),
          ),
        },
      });
    }
  }
}

function handleMaybeEntriesErrorsHelper(
  proxy: DraftStateMachine,
  payload: OnNewEntryCreatedOrOfflineExperienceSyncedPayload,
) {
  const unsyncableEntriesErrors = {} as UnsyncableEntriesErrors;
  const { mayBeEntriesErrors } = payload;

  // istanbul ignore next:
  if (!mayBeEntriesErrors) {
    return unsyncableEntriesErrors;
  }

  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const {
      states: { entriesErrors },
    } = globalStates.data;

    const entriesErrorsState = entriesErrors as Draft<
      EntriesErrorsNotification
    >;
    const errorValues = {} as EintragFehlerAlsListeKarte;

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
        ...nichtGegenstandFehlern
      } = entryError;

      const errors: EintragFehlerAlsListe = [];

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

      Object.entries(nichtGegenstandFehlern).forEach(([k, v]) => {
        if (v) {
          errors.push(["", [[k, v]]]);
        }
      });

      unsyncableEntriesErrors[clientId as string] = entryError;
      errorValues[clientId as string] = errors;
    });
  }
  return unsyncableEntriesErrors;
}

function handleOnCloseNewEntryCreatedNotification(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.newEntryCreated.value = StateValue.inactive;
  }
}

function handleOnCloseEntriesErrorsNotification(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.entriesErrors.value = StateValue.inactive;
  }
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

function handleDeleteExperienceRequestAction(
  proxy: DraftStateMachine,
  payload: DeleteExperienceRequestPayload,
) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
    } = globalStates.data;

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
}

function handleDeleteExperienceCancelledAction(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
    } = globalStates.data;
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
  const { states: globalStates } = proxy;

  if (globalStates.value === StateValue.data) {
    const {
      states: { showingOptionsMenu },
    } = globalStates.data;

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
}

function handleOnDataReceivedAction(
  proxy: DraftStateMachine,
  payload: OnDataReceivedPayload,
) {
  const { states } = proxy;
  const effects = getGeneralEffects(proxy);

  switch (payload.key) {
    case StateValue.data:
      {
        const { data, loading, error } = payload.data;

        if (data) {
          const dataState = states as Draft<DataState>;
          dataState.value = StateValue.data;

          const dataStateData =
            dataState.data || ({} as Draft<DataState["data"]>);

          dataState.data = dataStateData;

          const context =
            dataStateData.context ||
            ({} as Draft<DataState["data"]["context"]>);

          dataStateData.context = context;

          const experience = data.getExperience;
          processEntriesData(context, data.getEntries);

          if (experience) {
            context.experience = experience;

            effects.push(
              {
                key: "onOfflineExperienceSyncedEffect",
                ownArgs: {},
              },
              {
                key: "deleteExperienceRequestedEffect",
                ownArgs: {},
              },
            );
          } else {
            proxy.states = {
              value: StateValue.errors,
              errors: {
                context: {
                  error: DATA_FETCHING_FAILED,
                },
              },
            };
          }
        } else if (loading) {
          proxy.states = {
            value: StateValue.loading,
          };
        } else {
          proxy.states = {
            value: StateValue.errors,
            errors: {
              context: {
                error: parseStringError(error as ApolloError),
              },
            },
          };
        }
      }
      break;

    case StateValue.errors:
      states.value = StateValue.errors;
      const errorsState = states as Draft<ErrorState>;
      errorsState.errors = {
        context: {
          error: parseStringError(payload.error),
        },
      };
      break;
  }
}

async function handleRefetchExperienceAction(proxy: DraftStateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function getExperienceId(props: Props) {
  return (props.match as Match).params.experienceId;
}

function processEntriesData(
  context: Draft<DataStateContext>,
  entriesData: GetEntriesUnionFragment | null,
) {
  if (!entriesData) {
    return;
  }

  switch (entriesData.__typename) {
    case "GetEntriesSuccess":
      processEntriesSuccess(context, entriesData.entries);

      break;

    default:
      break;
  }
}

function processEntriesSuccess(
  context: Draft<DataStateContext>,
  connection: EntryConnectionFragment,
) {
  const { edges, pageInfo } = connection;

  context.entries = (edges as EntryConnectionFragment_edges[]).map((edge) => {
    return (edge as EntryConnectionFragment_edges).node as EntryFragment;
  });

  context.pageInfo = pageInfo;
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
    stateContext: {
      experience: { id: experienceId },
      entries,
    },
  } = effectArgs;

  const ledger = getSyncingExperience(experienceId);

  // istanbul ignore next
  if (!ledger) {
    return;
  }

  const { persistor } = window.____ebnis;
  const { offlineExperienceId, newEntryClientId, entriesErrors } = ledger;

  putOrRemoveSyncingExperience(experienceId);

  let mayBeNewEntry: undefined | EntryFragment = undefined;

  entries.forEach((node) => {
    const { clientId } = node;

    // das ein ganz Online-Eintrag zuerst erstelltet als Offline-Eintrag
    if (clientId === newEntryClientId) {
      mayBeNewEntry = node;
    }
  });

  purgeExperience(offlineExperienceId);

  persistor.persist();

  dispatch({
    type: ActionType.ON_NEW_ENTRY_CREATED_OR_OFFLINE_EXPERIENCE_SYNCED,
    mayBeNewEntry: {
      neuEintragDaten: (mayBeNewEntry as unknown) as EntryFragment,
      zustand: "ganz-nue",
    },
    mayBeEntriesErrors: entriesErrors,
  });
};

type DefOnOfflineExperienceSyncedEffect = EffectDefinition<
  "onOfflineExperienceSyncedEffect"
>;

const putEntriesErrorsInLedgerEffect: DefPutEntriesErrorsInLedgerEffect["func"] = (
  ownArgs,
  props,
  effectArgs,
) => {
  putAndRemoveUnSyncableEntriesErrorsLedger(
    effectArgs.stateContext.experience.id,
    ownArgs,
  );
};

type DefPutEntriesErrorsInLedgerEffect = EffectDefinition<
  "putEntriesErrorsInLedgerEffect",
  UnsyncableEntriesErrors
>;

const cancelDeleteExperienceEffect: DefCancelDeleteExperienceEffect["func"] = (
  { key },
  props,
  effectArgs,
) => {
  if (key) {
    const { history } = props;
    const {
      stateContext: { experience },
    } = effectArgs;
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
  const {
    dispatch,
    stateContext: { experience },
  } = effectArgs;
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
    stateContext: {
      experience: { id },
    },
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

    removeUnsyncedExperiences([responseId]);

    const { persistor } = window.____ebnis;
    await persistor.persist();

    history.push(MY_URL);
  } catch (error) {}
};

type DefDeleteExperienceEffect = EffectDefinition<"deleteExperienceEffect">;

let fetchExperienceAttemptsCount = 1;

const fetchDetailedExperienceEffect: DefFetchDetailedExperienceEffect["func"] = (
  { paginationInput },
  props,
  { dispatch },
) => {
  const experienceId = getExperienceId(props);

  let bestehendeZwischengespeicherteErgebnis = sammelnZwischengespeicherteErfahrung(
    experienceId,
  );

  if (!paginationInput && bestehendeZwischengespeicherteErgebnis) {
    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      key: StateValue.data,
      data: bestehendeZwischengespeicherteErgebnis,
    });

    return;
  }

  let timeoutId: null | NodeJS.Timeout = null;
  let fetchPolicy: FetchPolicy = "cache-only";
  const timeouts = [2000, 2000, 3000, 5000];
  const timeoutsLen = timeouts.length - 1;

  async function fetchDetailedExperience() {
    try {
      if (!paginationInput) {
        paginationInput = {
          first: 10,
        };
      }

      const data = await manuallyFetchDetailedExperience(
        {
          experienceId,
          pagination: paginationInput,
        },
        fetchPolicy,
      );

      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.data,
        data,
      });
    } catch (error) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.errors,
        error,
      });
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  fetchExperienceAttemptsCount = 1;

  if (isOfflineId(experienceId)) {
    fetchDetailedExperience();
    return;
  }

  function mayBeScheduleFetchDetailedExperience() {
    const isConnected = getIsConnected();

    // we are connected
    if (isConnected) {
      const { isOffline, isPartOffline } = getOnlineStatus(experienceId);

      if (isOffline || isPartOffline) {
        fetchDetailedExperience();
      } else {
        fetchPolicy = "network-only";
        fetchDetailedExperience();
      }
      return;
    }

    // we are not connected, oder das is nicht ein Seitennummerierung Anforderung
    if (
      isConnected === false ||
      (bestehendeZwischengespeicherteErgebnis && !paginationInput)
    ) {
      fetchDetailedExperience();
      return;
    }

    // we are still trying to connect
    if (fetchExperienceAttemptsCount > timeoutsLen) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      });

      return;
    }

    ++fetchExperienceAttemptsCount;

    timeoutId = setTimeout(
      mayBeScheduleFetchDetailedExperience,
      timeouts[fetchExperienceAttemptsCount++],
    );
  }

  mayBeScheduleFetchDetailedExperience();
};

type DefFetchDetailedExperienceEffect = EffectDefinition<
  "fetchDetailedExperienceEffect",
  {
    paginationInput?: PaginationInput;
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

const deleteCacheKeysEffect: DefDeleteCacheKeysEffect["func"] = async ({
  keys,
}) => {
  deleteCacheKeys({
    wurzelSchlüssel: keys,
  });

  const { persistor } = window.____ebnis;
  await persistor.persist();
};

type DefDeleteCacheKeysEffect = EffectDefinition<
  "deleteCacheKeysEffect",
  {
    keys: string[];
  }
>;

export const effectFunctions = {
  scrollDocToTopEffect,
  autoCloseNotificationEffect,
  onOfflineExperienceSyncedEffect,
  putEntriesErrorsInLedgerEffect,
  cancelDeleteExperienceEffect,
  deleteExperienceRequestedEffect,
  deleteExperienceEffect,
  fetchDetailedExperienceEffect,
  clearTimeoutEffect,
  deleteCacheKeysEffect,
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

export function getOnlineStatus<T extends { id: string }>(
  experience: string | T,
) {
  const id = "string" === typeof experience ? experience : experience.id;
  const isOffline = isOfflineId(id);
  const hasUnsaved = getUnsyncedExperience(id);
  const isPartOffline = !isOffline && !!hasUnsaved;
  return { isOffline, isPartOffline };
}

////////////////////////// END HELPER FUNCTIONS ////////////////////////////

type DraftStateMachine = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: LoadingState | ErrorState | DataState;

    timeouts: Timeouts;
  }>;

type Timeouts = Readonly<{
  autoCloseNotification?: NodeJS.Timeout;
}>;

type ErrorState = Readonly<{
  value: ErrorsVal;
  errors: Readonly<{
    context: Readonly<{
      error: string;
    }>;
  }>;
}>;

export type DataStateContext = Readonly<{
  experience: ExperienceFragment;
  entries: EntryFragment[];
  pageInfo: PageInfoFragment;
}>;

export type DataState = Readonly<{
  value: DataVal;
  data: Readonly<{
    context: DataStateContext;
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
    }>;
  }>;
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
      bearbeitenEintrag?: EntryFragment;
    }>;
  }>;
}>;

type EntriesErrorsNotification = Readonly<{
  value: ActiveVal;
  active: {
    context: {
      errors: EintragFehlerAlsListeKarte;
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

export type Props = RouteChildrenProps<
  DetailExperienceRouteMatch,
  {
    delete: boolean;
  }
>;

export type Match = match<DetailExperienceRouteMatch>;

type Action =
  | ({
      type: ActionType.TOGGLE_NEW_ENTRY_ACTIVE;
    } & NewEntryActivePayload)
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
      type: ActionType.RE_FETCH_EXPERIENCE;
    };

type NewEntryActivePayload = {
  bearbeitenEintrag?: EntryFragment;
};

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: DetailedExperienceQueryResult;
    }
  | {
      key: ErrorsVal;
      error: Error | string;
    }
  | {
      key: LoadingVal;
    };

interface ToggleOptionsMenuPayload {
  key?: "close" | "open";
}

interface DeleteExperienceRequestPayload {
  key?: RequestedVal;
}

interface OnNewEntryCreatedOrOfflineExperienceSyncedPayload {
  mayBeNewEntry?: {
    zustand: "ganz-nue" | "synchronisiert";
    neuEintragDaten: EntryFragment;
  };
  mayBeEntriesErrors?: CreateEntryErrorFragment[] | null;
  vielleichtBearbeitenEintrag?: EntryFragment;
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
  stateContext: DataStateContext;
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
  | DefCancelDeleteExperienceEffect
  | DefDeleteExperienceRequestedEffect
  | DefDeleteExperienceEffect
  | DefFetchDetailedExperienceEffect
  | DefClearTimeoutEffect
  | DefDeleteCacheKeysEffect;

// [index/label, [errorKey, errorValue][]][]
export type EintragFehlerAlsListe = [string | number, [string, string][]][];

type EintragFehlerAlsListeKarte = {
  [clientId: string]: EintragFehlerAlsListe;
};
