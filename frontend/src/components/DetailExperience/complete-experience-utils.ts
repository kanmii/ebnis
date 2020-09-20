import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import { RouteChildrenProps, match } from "react-router-dom";
import { DetailExperienceRouteMatch } from "../../utils/urls";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { isOfflineId } from "../../utils/offlines";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  getUnSyncEntriesErrorsLedger,
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
  FETCH_EXPERIENCES_TIMEOUTS,
  ErfolgWert,
  VersagenWert,
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
  manuallyFetchEntries,
  GetEntriesQueryResult,
} from "../../utils/experience.gql.types";
import { manuallyFetchDetailedExperience } from "../../utils/experience.gql.types";
import {
  parseStringError,
  DATA_FETCHING_FAILED,
  HOLEN_EINTRÄGE_GESCHEITERT,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import {
  sammelnZwischengespeicherteErfahrung,
  getEntriesQuerySuccess,
  toGetEntriesSuccessQuery,
  writeGetEntriesQuery,
} from "../../apollo/get-detailed-experience-query";
import { PageInfoFragment } from "../../graphql/apollo-types/PageInfoFragment";
import { GetEntriesUnionFragment } from "../../graphql/apollo-types/GetEntriesUnionFragment";
import {
  EntryConnectionFragment_edges,
  EntryConnectionFragment,
} from "../../graphql/apollo-types/EntryConnectionFragment";
import { GetDetailExperience } from "../../graphql/apollo-types/GetDetailExperience";
import { PaginationInput } from "../../graphql/apollo-types/globalTypes";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "../../graphql/apollo-types/GetEntries";
import { entryToEdge } from "../NewEntry/entry-to-edge";

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
  RE_FETCH_ENTRIES = "@detailed-experience/re-fetch-entries",
  ON_ENTRIES_RECEIVED = "@detailed-experience/on-entries-received",
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

          case ActionType.RE_FETCH_ENTRIES:
          case ActionType.ON_ENTRIES_RECEIVED:
            handleRefetchEntries(proxy, payload as OnEntriesReceivedPayload);
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

    const einträgeDaten = context.einträgeDaten as Draft<EinträgeDatenErfolg>;

    // ein völlig neu Eintrag
    if (!(vielleichtBearbeitenEintrag || zustand === "ganz-nue")) {
      einträgeDaten.daten.einträge.unshift({
        eintragDaten: neuEintragDaten,
      });
    } else {
      // wir ersetzen die neu Eintrag mit dem zuletzt Eintrag

      const { clientId, dataObjects } = neuEintragDaten;

      einträgeDaten.daten.einträge = einträgeDaten.daten.einträge.map(
        (daten) => {
          return daten.eintragDaten.id === clientId
            ? {
                ...daten,
                eintragDaten: neuEintragDaten,
              }
            : daten;
        },
      );

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
        const { erfahrung, einträgeDaten } = payload.data;

        const dataState = states as Draft<DataState>;
        dataState.value = StateValue.data;

        const dataStateData =
          dataState.data || ({} as Draft<DataState["data"]>);

        dataState.data = dataStateData;

        const context =
          dataStateData.context || ({} as Draft<DataState["data"]["context"]>);

        dataStateData.context = context;
        context.einträgeDaten = einträgeDaten;

        context.experience = erfahrung;

        context.dataDefinitionIdToNameMap = erfahrung.dataDefinitions.reduce(
          (acc, d) => {
            acc[d.id] = d.name;
            return acc;
          },
          {} as DataDefinitionIdToNameMap,
        );

        dataStateData.states = {
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
        };

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

function handleRefetchExperienceAction(proxy: DraftStateMachine) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleRefetchEntries(
  proxy: DraftStateMachine,
  payload: OnEntriesReceivedPayload,
) {
  const { states } = proxy;

  if (states.value === StateValue.data) {
    const { data } = payload;

    if (!data) {
      const effects = getGeneralEffects(proxy);

      effects.push({
        key: "holenEinträgeWirkung",
        ownArgs: {},
      });

      return;
    }

    const context = states.data.context;
    const zuletztEinträge = context.einträgeDaten;

    switch (data.schlüssel) {
      case StateValue.erfolg:
        const { einträge, seiteInfo } = data.daten;

        if (zuletztEinträge.schlüssel === StateValue.erfolg) {
          context.einträgeDaten = {
            schlüssel: data.schlüssel,
            daten: {
              seiteInfo,
              einträge: [...einträge, ...zuletztEinträge.daten.einträge],
            },
          };
        } else {
          context.einträgeDaten = {
            schlüssel: data.schlüssel,
            daten: {
              seiteInfo,
              einträge,
            },
          };
        }
        break;

      case StateValue.versagen:
        break;
    }
  }
}

function getExperienceId(props: Props) {
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
  const { dispatch, stateContext } = effectArgs;

  const {
    experience: { id: experienceId },
  } = stateContext;

  const ledger = getSyncingExperience(experienceId);

  // istanbul ignore next
  if (!ledger) {
    return;
  }

  const { persistor } = window.____ebnis;
  const { offlineExperienceId, newEntryClientId, entriesErrors } = ledger;

  putOrRemoveSyncingExperience(experienceId);

  let mayBeNewEntry: undefined | EntryFragment = undefined;

  const einträgeDaten = stateContext.einträgeDaten as EinträgeDatenErfolg;
  einträgeDaten.daten.einträge.forEach(({ eintragDaten }) => {
    const { clientId } = eintragDaten;

    // das ein ganz Online-Eintrag zuerst erstelltet als Offline-Eintrag
    if (clientId === newEntryClientId) {
      mayBeNewEntry = eintragDaten;
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

const fetchDetailedExperienceEffect: DefFetchDetailedExperienceEffect["func"] = (
  _,
  props,
  { dispatch },
) => {
  const experienceId = getExperienceId(props);
  let fetchExperienceAttemptsCount = 0;
  let timeoutId: null | NodeJS.Timeout = null;
  const timeoutsLen = FETCH_EXPERIENCES_TIMEOUTS.length - 1;

  let bestehendeZwischengespeicherteErgebnis = sammelnZwischengespeicherteErfahrung(
    experienceId,
  );

  if (bestehendeZwischengespeicherteErgebnis) {
    const daten = bestehendeZwischengespeicherteErgebnis.data as GetDetailExperience;

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      ...verarbeitenErfahrungAbfrage(daten.getExperience, daten.getEntries),
    });

    return;
  }

  async function fetchDetailedExperience() {
    try {
      const data = await manuallyFetchDetailedExperience(
        {
          experienceId,
          pagination: {
            first: 10,
          },
        },
        "network-only",
      );

      const daten = (data && data.data) || ({} as GetDetailExperience);

      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        ...verarbeitenErfahrungAbfrage(
          daten.getExperience || null,
          daten.getEntries,
        ),
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

  function mayBeScheduleFetchDetailedExperience() {
    // we are connected
    if (getIsConnected()) {
      fetchDetailedExperience();
      return;
    }

    // we were never able to connect
    if (fetchExperienceAttemptsCount > timeoutsLen) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      });

      return;
    }

    timeoutId = setTimeout(
      mayBeScheduleFetchDetailedExperience,
      FETCH_EXPERIENCES_TIMEOUTS[fetchExperienceAttemptsCount++],
    );
  }

  mayBeScheduleFetchDetailedExperience();
};

type DefFetchDetailedExperienceEffect = EffectDefinition<
  "fetchDetailedExperienceEffect"
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

const holenEinträgeWirkung: HolenEinträgeWirkung["func"] = async (
  { pagination },
  props,
  effectArgs,
) => {
  const erfahrungId = getExperienceId(props);
  const { dispatch } = effectArgs;

  const variables = {
    experienceId: erfahrungId,
    pagination: pagination || {
      first: 10,
    },
  };

  const zuletztEinträge = getEntriesQuerySuccess(erfahrungId);

  try {
    const { data, error } =
      (await manuallyFetchEntries(variables)) || ({} as GetEntriesQueryResult);

    if (data) {
      let verarbeitetEinträge = verarbeitenEinträgeAbfrage(
        erfahrungId,
        data.getEntries,
      );

      if (pagination) {
        anhängenZuletztEinträge(
          erfahrungId,
          verarbeitetEinträge,
          zuletztEinträge,
        );
      }

      dispatch({
        type: ActionType.ON_ENTRIES_RECEIVED,
        data: verarbeitetEinträge,
      });
    }
  } catch (error) {}
};

type HolenEinträgeWirkung = EffectDefinition<
  "holenEinträgeWirkung",
  {
    pagination: PaginationInput;
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
  holenEinträgeWirkung,
};

function verarbeitenErfahrungAbfrage(
  erfahrung: ExperienceFragment | null,
  kriegEinträgeAbfrage: GetEntriesUnionFragment | null,
): OnDataReceivedPayload {
  return erfahrung
    ? {
        key: StateValue.data,
        data: {
          erfahrung,
          einträgeDaten: verarbeitenEinträgeAbfrage(
            erfahrung.id,
            kriegEinträgeAbfrage,
          ),
        },
      }
    : {
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      };
}

function verarbeitenEinträgeAbfrage(
  erfahrungId: string,
  kriegEinträgeAbfrage?: GetEntriesUnionFragment | null,
): EinträgeDaten {
  if (!kriegEinträgeAbfrage) {
    return {
      schlüssel: StateValue.versagen,
      fehler: HOLEN_EINTRÄGE_GESCHEITERT,
    };
  }

  const nichtSynchronisiertFehler =
    getUnSyncEntriesErrorsLedger(erfahrungId) ||
    // istanbul ignore next:
    {};

  if (kriegEinträgeAbfrage.__typename === "GetEntriesSuccess") {
    const daten = kriegEinträgeAbfrage.entries as EntryConnectionFragment;

    const einträge = (daten.edges as EntryConnectionFragment_edges[]).map(
      (edge) => {
        const eintrag = edge.node as EntryFragment;
        return {
          eintragDaten: eintrag,
          nichtSynchronisiertFehler:
            nichtSynchronisiertFehler[eintrag.clientId as string],
        };
      },
    );

    return {
      schlüssel: StateValue.erfolg,
      daten: {
        einträge,
        seiteInfo: daten.pageInfo,
      },
    };
  } else {
    return {
      schlüssel: StateValue.versagen,
      fehler: kriegEinträgeAbfrage.errors.error,
    };
  }
}

function anhängenZuletztEinträge(
  erfahrungId: string,
  eintragDaten: EinträgeDaten,
  zuletztEinträge: GetEntries_getEntries_GetEntriesSuccess_entries,
) {
  if (eintragDaten.schlüssel === StateValue.versagen) {
    return;
  }

  const { einträge, seiteInfo } = eintragDaten.daten;
  const kanten = [
    ...einträge.map(
      (e) => entryToEdge(e.eintragDaten),
      ...(zuletztEinträge.edges as EntryConnectionFragment_edges[]),
    ),
  ];

  const y = toGetEntriesSuccessQuery({
    edges: kanten,
    pageInfo: seiteInfo,
    __typename: "EntryConnection",
  });

  writeGetEntriesQuery(erfahrungId, y);

  const { persistor } = window.____ebnis;
  persistor.persist();
}

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

export type EinträgeDatenErfolg = {
  schlüssel: ErfolgWert;
  daten: Readonly<{
    einträge: DataStateContextEntries;
    seiteInfo: PageInfoFragment;
  }>;
};

type EinträgeDaten =
  | EinträgeDatenErfolg
  | Readonly<{
      schlüssel: VersagenWert;
      fehler: string;
    }>;

export type DataStateContext = Readonly<{
  experience: ExperienceFragment;
  einträgeDaten: EinträgeDaten;
  dataDefinitionIdToNameMap: DataDefinitionIdToNameMap;
}>;

export type DataStateContextEntry = Readonly<{
  eintragDaten: EntryFragment;
  nichtSynchronisiertFehler?: CreateEntryErrorFragment;
}>;

export type DataStateContextEntries = DataStateContextEntry[];

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
    }
  | ({
      type: ActionType.RE_FETCH_ENTRIES;
    } & OnEntriesReceivedPayload)
  | ({
      type: ActionType.ON_ENTRIES_RECEIVED;
    } & OnEntriesReceivedPayload);

type NewEntryActivePayload = {
  bearbeitenEintrag?: EntryFragment;
};

type OnEntriesReceivedPayload = Readonly<{
  data?: EinträgeDaten;
}>;

type OnDataReceivedPayload =
  | {
      key: DataVal;
      data: {
        erfahrung: ExperienceFragment;
        einträgeDaten: EinträgeDaten;
      };
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

export interface DataDefinitionIdToNameMap {
  [dataDefinitionId: string]: string;
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
  | DefDeleteCacheKeysEffect
  | HolenEinträgeWirkung;

// [index/label, [errorKey, errorValue][]][]
export type EintragFehlerAlsListe = [string | number, [string, string][]][];

type EintragFehlerAlsListeKarte = {
  [clientId: string]: EintragFehlerAlsListe;
};
