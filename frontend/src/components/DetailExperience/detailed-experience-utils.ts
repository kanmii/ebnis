import { Reducer, Dispatch } from "react";
import { wrapReducer, wickelnStatten } from "../../logger";
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
  FETCH_EXPERIENCES_TIMEOUTS,
  ErfolgWert,
  VersagenWert,
  EinträgeMitHolenFehlerWert,
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
import { ApolloError } from "@apollo/client";
import { scrollIntoView } from "../../utils/scroll-into-view";

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
  AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN = "@detailed-experience/on-data-received",
  RE_FETCH_EXPERIENCE = "@detailed-experience/re-fetch-experience",
  RE_FETCH_ENTRIES = "@detailed-experience/re-fetch-entries",
  HOLEN_NÄCHSTE_EINTRÄGE = "@detailed-experience/holen-nächste-einträge",
  AUF_EINTRÄGE_ERHIELTEN = "@detailed-experience/on-entries-received",
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

          case ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN:
            handhabenGeholteErfahrungDaten(
              proxy,
              payload as GeholteErfahrungErhieltenNutzlast,
            );
            break;

          case ActionType.RE_FETCH_EXPERIENCE:
            handleRefetchExperienceAction(proxy);
            break;

          case ActionType.RE_FETCH_ENTRIES:
            handleRefetchEntries(proxy);
            break;

          case ActionType.AUF_EINTRÄGE_ERHIELTEN:
            handhabenEinträgeErhieltenHandlung(
              proxy,
              payload as VerarbeitenEinträgeAbfrageZurückgegebenerWert,
            );
            break;

          case ActionType.HOLEN_NÄCHSTE_EINTRÄGE:
            handhabenHolenNächsteEinträgeHandlung(proxy);
            break;
        }
      });
    },

    // true,
  );

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(): StateMachine {
  const state = {
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

  return wickelnStatten(state);
}

function handleToggleNewEntryActiveAction(
  proxy: DraftStateMachine,
  payload: NewEntryActivePayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
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

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states, context } = globalStates.data;

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
        ownArgs: {
          errors: unsyncableEntriesErrors,
          experience: context.experience,
        },
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

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const { neuEintragDaten, zustand } = mayBeNewEntry;

    const {
      updatedAt,
      clientId: neuErstellteEintragKlientId,
    } = neuEintragDaten;

    const { newEntryCreated, einträge: einträgeStatten } = states;

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

    // istanbul ignore next:
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

    switch (einträgeStatten.wert) {
      case StateValue.erfolg:
      case StateValue.einträgeMitHolenFehler:
        const ob =
          einträgeStatten[StateValue.erfolg] ||
          einträgeStatten[StateValue.einträgeMitHolenFehler];

        verarbeitenEinträgeContext(
          proxy,
          ob.context,
          neuEintragDaten,
          zustand,
          vielleichtBearbeitenEintrag,
        );
        break;

      case StateValue.versagen:
        {
          const einträgeMitHolenFehler = states.einträge as Draft<
            EinträgeMitHolenFehler
          >;

          einträgeMitHolenFehler.wert = StateValue.einträgeMitHolenFehler;
          einträgeMitHolenFehler.einträgeMitHolenFehler = {
            context: {
              einträge: [
                {
                  eintragDaten: neuEintragDaten,
                },
              ],
              holenFehler: einträgeStatten.fehler,
            },
          };
        }
        break;
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

  // istanbul ignore else:
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

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.newEntryCreated.value = StateValue.inactive;
  }
}

function handleOnCloseEntriesErrorsNotification(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
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

  // istanbul ignore else:
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

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      states: { deleteExperience },
      context: { experience },
    } = globalStates.data;

    const deleteExperienceActive = deleteExperience as DeleteExperienceActiveState;

    // istanbul ignore else:
    if (deleteExperienceActive.value === StateValue.active) {
      deleteExperience.value = StateValue.inactive;
      const effects = getGeneralEffects(proxy);

      effects.push({
        key: "cancelDeleteExperienceEffect",
        ownArgs: {
          schlüssel: deleteExperienceActive.active.context.key,
          experience,
        },
      });
    }
  }
}

function handleDeleteExperienceConfirmedAction(proxy: DraftStateMachine) {
  const { states } = proxy;

  // istanbul ignore else
  if (states.value === StateValue.data) {
    const effects = getGeneralEffects(proxy);
    effects.push({
      key: "deleteExperienceEffect",
      ownArgs: {
        erfahrungId: states.data.context.experience.id,
      },
    });
  }
}

function handleToggleShowOptionsMenuAction(
  proxy: DraftStateMachine,
  payload: ToggleOptionsMenuPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
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

function handhabenGeholteErfahrungDaten(
  proxy: DraftStateMachine,
  payload: GeholteErfahrungErhieltenNutzlast,
) {
  const { states } = proxy;
  const effects = getGeneralEffects(proxy);

  switch (payload.key) {
    case StateValue.data:
      {
        const { erfahrung, einträgeDaten } = payload;

        const dataState = states as Draft<DataState>;
        dataState.value = StateValue.data;

        const dataStateData =
          dataState.data || ({} as Draft<DataState["data"]>);

        dataState.data = dataStateData;

        const context =
          dataStateData.context || ({} as Draft<DataState["data"]["context"]>);

        dataStateData.context = context;
        context.experience = erfahrung;
        const { id: erfahrungId } = erfahrung;

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
          einträge:
            einträgeDaten.schlüssel === StateValue.erfolg
              ? {
                  wert: StateValue.erfolg,
                  erfolg: {
                    context: {
                      einträge: einträgeDaten.einträge,
                      seiteInfo: einträgeDaten.seiteInfo,
                    },
                  },
                }
              : {
                  wert: StateValue.versagen,
                  fehler: parseStringError(einträgeDaten.fehler),
                },
        };

        effects.push(
          {
            key: "onOfflineExperienceSyncedEffect",
            ownArgs: {
              erfahrungId,
              einträge:
                einträgeDaten.schlüssel === StateValue.erfolg &&
                einträgeDaten.einträge,
            },
          },
          {
            key: "deleteExperienceRequestedEffect",
            ownArgs: {
              experienceId: erfahrung.id,
            },
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

function handleRefetchEntries(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    // istanbul ignore else
    if (states.einträge.wert !== StateValue.erfolg) {
      const effects = getGeneralEffects(proxy);

      effects.push({
        key: "holenEinträgeWirkung",
        ownArgs: {},
      });
    }
  }
}

function handhabenHolenNächsteEinträgeHandlung(proxy: DraftStateMachine) {
  const { states: globalStates } = proxy;

  // istanbul ignore else
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    // istanbul ignore else
    if (states.einträge.wert === StateValue.erfolg) {
      const {
        hasNextPage,
        endCursor,
      } = states.einträge.erfolg.context.seiteInfo;

      // istanbul ignore else
      if (hasNextPage) {
        const effects = getGeneralEffects(proxy);

        effects.push({
          key: "holenEinträgeWirkung",
          ownArgs: {
            pagination: {
              first: 10,
              after: endCursor,
            },
          },
        });
      }
    }
  }
}

function handhabenEinträgeErhieltenHandlung(
  proxy: DraftStateMachine,
  payload: VerarbeitenEinträgeAbfrageZurückgegebenerWert,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    const einträgeStatten = states.einträge;

    switch (einträgeStatten.wert) {
      case StateValue.erfolg:
        {
          const { context } = einträgeStatten.erfolg;

          if (payload.schlüssel === StateValue.erfolg) {
            context.seiteInfo = payload.seiteInfo;
            context.einträge = [...context.einträge, ...payload.einträge];
          } else {
            context.paginierungFehler = parseStringError(payload.fehler);
          }
        }
        break;

      case StateValue.versagen:
        // istanbul ignore else:
        if (payload.schlüssel === StateValue.erfolg) {
          const einträgeErfolgStatten = states.einträge as Draft<
            EinträgeDatenErfolg
          >;

          einträgeErfolgStatten.wert = StateValue.erfolg;
          einträgeErfolgStatten.erfolg = {
            context: {
              einträge: payload.einträge,
              seiteInfo: payload.seiteInfo,
            },
          };
        }
        break;

      case StateValue.einträgeMitHolenFehler:
        if (payload.schlüssel === StateValue.erfolg) {
          const einträgeErfolgStatten = states.einträge as Draft<
            EinträgeDatenErfolg
          >;

          einträgeErfolgStatten.wert = StateValue.erfolg;

          einträgeErfolgStatten.erfolg = {
            context: {
              einträge: payload.einträge,
              seiteInfo: payload.seiteInfo,
            },
          };
        } else {
          einträgeStatten.einträgeMitHolenFehler.context.holenFehler = parseStringError(
            payload.fehler,
          );
        }
        break;
    }
  }
}

function getExperienceId(props: Props) {
  return (props.match as Match).params.experienceId;
}

function verarbeitenEinträgeContext(
  proxy: DraftStateMachine,
  context: Draft<EinträgeDatenErfolg["erfolg"]["context"]>,
  neuEintragDaten: EntryFragment,
  zustand: ErstellenNeuEintragZustand,
  vielleichtBearbeitenEintrag?: EntryFragment,
) {
  const effects = getGeneralEffects<EffectType, DraftStateMachine>(proxy);

  // ein völlig neu Eintrag
  // istanbul ignore else:
  if (!(vielleichtBearbeitenEintrag || zustand === "ganz-nue")) {
    context.einträge.unshift({
      eintragDaten: neuEintragDaten,
    });
  } else {
    // wir ersetzen die neu Eintrag mit dem zuletzt Eintrag

    const { clientId, dataObjects } = neuEintragDaten;

    context.einträge = context.einträge.map((daten) => {
      return daten.eintragDaten.id === clientId
        ? {
            ...daten,
            eintragDaten: neuEintragDaten,
          }
        : daten;
    });

    // und die Offline-Einträge muss auf die Cache entfernen werden

    effects.push({
      key: "deleteCacheKeysEffect",
      ownArgs: {
        keys: [`Entry:${clientId}`].concat(
          dataObjects.map((d) => {
            return `DataObject:${(d as DataObjectFragment).clientId as string}`;
          }),
        ),
      },
    });
  }
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
  { erfahrungId, einträge },
  _props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  const ledger = getSyncingExperience(erfahrungId);

  // istanbul ignore next
  if (!ledger) {
    return;
  }

  const { persistor } = window.____ebnis;
  const { offlineExperienceId, newEntryClientId, entriesErrors } = ledger;

  putOrRemoveSyncingExperience(erfahrungId);

  let mayBeNewEntry: undefined | EntryFragment = undefined;

  einträge &&
    einträge.forEach(({ eintragDaten }) => {
      const { clientId } = eintragDaten;

      // das ein ganz Online-Eintrag zuerst erstelltet als Offline-Eintrag
      // istanbul ignore else:
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
  "onOfflineExperienceSyncedEffect",
  {
    erfahrungId: string;
    einträge?: DataStateContextEntries;
  }
>;

const deleteExperienceRequestedEffect: DefDeleteExperienceRequestedEffect["func"] = (
  { experienceId },
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const deleteExperienceLedger = getDeleteExperienceLedger(experienceId);

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
  "deleteExperienceRequestedEffect",
  {
    experienceId: string;
  }
>;

const putEntriesErrorsInLedgerEffect: DefPutEntriesErrorsInLedgerEffect["func"] = (
  { experience: { id }, errors },
  props,
  effectArgs,
) => {
  putAndRemoveUnSyncableEntriesErrorsLedger(id, errors);
};

type DefPutEntriesErrorsInLedgerEffect = EffectDefinition<
  "putEntriesErrorsInLedgerEffect",
  {
    experience: ExperienceFragment;
    errors: UnsyncableEntriesErrors;
  }
>;

const cancelDeleteExperienceEffect: DefCancelDeleteExperienceEffect["func"] = (
  { schlüssel, experience: { id, title } },
  props,
) => {
  if (schlüssel) {
    const { history } = props;

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
  {
    experience: ExperienceFragment;
    schlüssel: string;
  }
>;

const deleteExperienceEffect: DefDeleteExperienceEffect["func"] = async (
  { erfahrungId },
  props,
  effectArgs,
) => {
  const { history } = props;

  const { deleteExperiences } = effectArgs;

  try {
    const response = await deleteExperiences({
      variables: {
        input: [erfahrungId],
      },
    });

    const validResponse =
      response && response.data && response.data.deleteExperiences;

    // istanbul ignore next
    if (!validResponse) {
      return;
    }

    // istanbul ignore next
    if (validResponse.__typename === "DeleteExperiencesAllFail") {
      return;
    }

    const experienceResponse = validResponse.experiences[0];

    // istanbul ignore next
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

type DefDeleteExperienceEffect = EffectDefinition<
  "deleteExperienceEffect",
  {
    erfahrungId: string;
  }
>;

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
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
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
        type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
        ...verarbeitenErfahrungAbfrage(
          daten.getExperience || null,
          daten.getEntries,
        ),
      });
    } catch (error) {
      dispatch({
        type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
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
        type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN,
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

const holenEinträgeWirkung: DefHolenEinträgeWirkung["func"] = async (
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
      (await manuallyFetchEntries(variables)) ||
      // istanbul ignore next:
      ({} as GetEntriesQueryResult);

    if (data) {
      let verarbeitetEinträge = verarbeitenEinträgeAbfrage(
        erfahrungId,
        data.getEntries,
      );

      if (pagination) {
        const blätternZuId = anhängenZuletztEinträge(
          erfahrungId,
          verarbeitetEinträge,
          zuletztEinträge,
        );

        setTimeout(() => {
          scrollIntoView(blätternZuId);
        });
      }

      dispatch({
        type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
        ...verarbeitetEinträge,
      });
    } else {
      dispatch({
        type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
        schlüssel: StateValue.versagen,
        fehler: error as ApolloError,
      });
    }
  } catch (error) {
    dispatch({
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.versagen,
      fehler: error,
    });
  }
};

type DefHolenEinträgeWirkung = EffectDefinition<
  "holenEinträgeWirkung",
  {
    pagination: PaginationInput;
  }
>;

const onInitStattenWirkung: DefOnInitStattenWirkung["func"] = (
  { erfahrungId, einträge },
  _props,
  effectArgs,
) => {
  //
};

type DefOnInitStattenWirkung = EffectDefinition<
  "onInitStattenWirkung",
  {
    erfahrungId: string;
    einträge?: DataStateContextEntries;
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
  onInitStattenWirkung,
};

function verarbeitenErfahrungAbfrage(
  erfahrung: ExperienceFragment | null,
  kriegEinträgeAbfrage: GetEntriesUnionFragment | null,
): GeholteErfahrungErhieltenNutzlast {
  return erfahrung
    ? {
        key: StateValue.data,
        erfahrung,
        einträgeDaten: verarbeitenEinträgeAbfrage(
          erfahrung.id,
          kriegEinträgeAbfrage,
        ),
      }
    : {
        key: StateValue.errors,
        error: DATA_FETCHING_FAILED,
      };
}

function verarbeitenEinträgeAbfrage(
  erfahrungId: string,
  kriegEinträgeAbfrage?: GetEntriesUnionFragment | null,
): VerarbeitenEinträgeAbfrageZurückgegebenerWert {
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
      einträge,
      seiteInfo: daten.pageInfo,
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
  eintragDaten: VerarbeitenEinträgeAbfrageZurückgegebenerWert,
  zuletztEinträge?: GetEntries_getEntries_GetEntriesSuccess_entries,
) {
  let blätternZuId = "??";

  if (eintragDaten.schlüssel === StateValue.versagen) {
    return blätternZuId;
  }

  const { einträge, seiteInfo } = eintragDaten;

  const zurzeitEinträgeKanten = einträge.map((e) =>
    entryToEdge(e.eintragDaten),
  );

  const zuletztEinträgeKanten = ((
    zuletztEinträge ||
    // istanbul ignore next:
    ({} as GetEntries_getEntries_GetEntriesSuccess_entries)
  ).edges ||
    // istanbul ignore next:
    []) as EntryConnectionFragment_edges[];

  const kanten = [...zuletztEinträgeKanten, ...zurzeitEinträgeKanten];

  const y = toGetEntriesSuccessQuery({
    edges: kanten,
    pageInfo: seiteInfo,
    __typename: "EntryConnection",
  });

  writeGetEntriesQuery(erfahrungId, y);

  const { persistor } = window.____ebnis;
  persistor.persist();

  if (zuletztEinträgeKanten.length) {
    blätternZuId = (zuletztEinträgeKanten[zuletztEinträgeKanten.length - 1]
      .node as EntryFragment).id;
  } else {
    blätternZuId = (zurzeitEinträgeKanten[0].node as EntryFragment).id;
  }

  return (
    blätternZuId ||
    // istanbul ignore next:
    "??"
  );
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

type VerarbeitenEinträgeAbfrageZurückgegebenerWert =
  | {
      schlüssel: ErfolgWert;
      einträge: DataStateContextEntries;
      seiteInfo: PageInfoFragment;
      // paginierungFehler?: string;
    }
  | {
      schlüssel: VersagenWert;
      fehler: string | Error;
    };

export type EinträgeDatenErfolg = {
  wert: ErfolgWert;
  erfolg: {
    context: Readonly<{
      einträge: DataStateContextEntries;
      seiteInfo: PageInfoFragment;
      paginierungFehler?: string;
    }>;
  };
};

export type EinträgeDatenVersagen = Readonly<{
  wert: VersagenWert;
  fehler: string;
}>;

export type EinträgeMitHolenFehler = Readonly<{
  wert: EinträgeMitHolenFehlerWert;
  einträgeMitHolenFehler: {
    context: Readonly<{
      einträge: DataStateContextEntries;
      holenFehler?: string;
    }>;
  };
}>;

type EinträgeDaten =
  | EinträgeDatenErfolg
  | EinträgeMitHolenFehler
  | EinträgeDatenVersagen;

export type DataStateContext = Readonly<{
  experience: ExperienceFragment;
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

      einträge: EinträgeDaten;
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
      type: ActionType.AUF_GEHOLTE_ERFAHRUNG_DATEN_ERHIELTEN;
    } & GeholteErfahrungErhieltenNutzlast)
  | {
      type: ActionType.RE_FETCH_EXPERIENCE;
    }
  | {
      type: ActionType.RE_FETCH_ENTRIES;
    }
  | ({
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN;
    } & VerarbeitenEinträgeAbfrageZurückgegebenerWert)
  | {
      type: ActionType.HOLEN_NÄCHSTE_EINTRÄGE;
    };

type NewEntryActivePayload = {
  bearbeitenEintrag?: EntryFragment;
};

type GeholteErfahrungErhieltenNutzlast =
  | {
      key: DataVal;
      erfahrung: ExperienceFragment;
      einträgeDaten: VerarbeitenEinträgeAbfrageZurückgegebenerWert;
    }
  | {
      key: ErrorsVal;
      error: Error | string;
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

type ErstellenNeuEintragZustand = "ganz-nue" | "synchronisiert";

interface OnNewEntryCreatedOrOfflineExperienceSyncedPayload {
  mayBeNewEntry?: {
    zustand: ErstellenNeuEintragZustand;
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
  | DefHolenEinträgeWirkung
  | DefOnInitStattenWirkung;

// [index/label, [errorKey, errorValue][]][]
export type EintragFehlerAlsListe = [string | number, [string, string][]][];

type EintragFehlerAlsListeKarte = {
  [clientId: string]: EintragFehlerAlsListe;
};
