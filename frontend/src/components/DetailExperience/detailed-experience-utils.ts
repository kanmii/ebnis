import { Reducer, Dispatch } from "react";
import { wrapReducer, wickelnStatten } from "../../logger";
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
  FETCH_EXPERIENCES_TIMEOUTS,
  ErfolgWert,
  VersagenWert,
  EinträgeMitHolenFehlerWert,
  ReFetchOnly as ReFetchOnlyVal,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
} from "../../utils/effects";
import { scrollDocumentToTop } from "./detail-experience.injectables";
import { StateValue, Timeouts } from "../../utils/types";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { CreateEntryErrorFragment } from "../../graphql/apollo-types/CreateEntryErrorFragment";
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
import {
  sammelnZwischengespeicherteErfahrung,
  getEntriesQuerySuccess,
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
import { nonsenseId } from "../../utils/utils.dom";
import { toGetEntriesSuccessQuery } from "../../graphql/utils.gql";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import {
  OnSyncedData,
  OfflineIdToOnlineExperienceMap,
  SyncError,
  OfflineIdToCreateEntrySyncErrorMap,
  OnlineExperienceIdToOfflineEntriesMap,
} from "../../utils/sync-to-server.types";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../WithSubscriptions/with-subscriptions.utils";
import { getSyncError } from "../../apollo/sync-to-server-cache";
import { windowChangeUrl, ChangeUrlType } from "../../utils/global-window";
import { makeDetailedExperienceRoute } from "../../utils/urls";

export enum ActionType {
  TOGGLE_NEW_ENTRY_ACTIVE = "@detailed-experience/deactivate-new-entry",
  ON_ENTRY_CREATED = "@detailed-experience/entry-created",
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
  HOLEN_NÄCHSTE_EINTRÄGE = "@detailed-experience/holen-nächste-einträge",
  AUF_EINTRÄGE_ERHIELTEN = "@detailed-experience/on-entries-received",
  REQUEST_UPDATE_EXPERIENCE_UI = "@detailed-experience/request-update-experience-ui",
  ON_SYNC = "@detailed-experience/on-sync",
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

          case ActionType.REQUEST_UPDATE_EXPERIENCE_UI:
            handleUpdateExperienceUiRequestAction(
              proxy,
              payload as WithMayBeExperiencePayload,
            );
            break;

          case ActionType.ON_SYNC:
            handleOnSyncAction(proxy, payload as OnSyncedData);
            break;

          case ActionType.ON_ENTRY_CREATED:
            handleOnEntryCreatedUpdatedAction(
              proxy,
              payload as OnEntryCreatedPayload,
            );
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
  proxy: DraftState,
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

function handleOnCloseNewEntryCreatedNotification(proxy: DraftState) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.newEntryCreated.value = StateValue.inactive;

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        clear: timeouts.genericTimeout,
      },
    });

    delete timeouts.genericTimeout;
  }
}

function handleOnCloseEntriesErrorsNotification(proxy: DraftState) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;
    states.entriesErrors.value = StateValue.inactive;
  }
}

function handleSetTimeoutAction(proxy: DraftState, payload: SetTimeoutPayload) {
  const { timeouts } = proxy;

  Object.entries(payload).forEach(([key, val]) => {
    timeouts[key] = val;
  });
}

function handleDeleteExperienceRequestAction(
  proxy: DraftState,
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

function handleDeleteExperienceCancelledAction(proxy: DraftState) {
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

function handleDeleteExperienceConfirmedAction(proxy: DraftState) {
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
  proxy: DraftState,
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

function handleOnDataReceivedAction(
  proxy: DraftState,
  payload: OnDataReceivedPayload,
) {
  const { states } = proxy;
  const effects = getGeneralEffects(proxy);
  const { experienceData, syncErrors } = payload;

  switch (experienceData.key) {
    case StateValue.data:
      {
        const { erfahrung, einträgeDaten } = experienceData;

        const dataState = states as Draft<DataState>;
        dataState.value = StateValue.data;

        const dataStateData =
          dataState.data || ({} as Draft<DataState["data"]>);

        dataState.data = dataStateData;

        const context =
          dataStateData.context || ({} as Draft<DataState["data"]["context"]>);

        dataStateData.context = context;
        context.experience = erfahrung;
        context.syncErrors = syncErrors;

        context.dataDefinitionIdToNameMap = makeDataDefinitionIdToNameMap(
          erfahrung.dataDefinitions,
        );

        dataStateData.states = {
          updateExperienceUiActive: {
            value: StateValue.inactive,
          },
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

        effects.push({
          key: "deleteExperienceRequestedEffect",
          ownArgs: {
            experienceId: erfahrung.id,
          },
        });
      }
      break;

    case StateValue.errors:
      states.value = StateValue.errors;
      const errorsState = states as Draft<ErrorState>;
      errorsState.errors = {
        context: {
          error: parseStringError(experienceData.error),
        },
      };
      break;
  }
}

function handleRefetchExperienceAction(proxy: DraftState) {
  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "fetchDetailedExperienceEffect",
    ownArgs: {},
  });
}

function handleRefetchEntries(proxy: DraftState) {
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

function handhabenHolenNächsteEinträgeHandlung(proxy: DraftState) {
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
  proxy: DraftState,
  payload: VerarbeitenEinträgeAbfrageZurückgegebenerWert | ReFetchOnlyPayload,
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

          switch (payload.schlüssel) {
            case StateValue.erfolg:
              context.seiteInfo = payload.seiteInfo;
              context.einträge = [...context.einträge, ...payload.einträge];
              break;

            case StateValue.reFetchOnly:
              const { entries } = payload;
              const idToEntryMap = (entries.edges as EntryConnectionFragment_edges[]).reduce(
                (acc, edge) => {
                  const entry = edge.node as EntryFragment;
                  acc[entry.id] = entry;
                  return acc;
                },
                {} as { [entryId: string]: EntryFragment },
              );

              context.einträge = context.einträge.map((val) => {
                const oldEntry = val.eintragDaten;
                val.eintragDaten = idToEntryMap[oldEntry.id];
                return val;
              });

              break;

            case StateValue.versagen:
              context.paginierungFehler = parseStringError(payload.fehler);
              break;
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
            (payload as any).fehler,
          );
        }
        break;
    }
  }
}

function handleUpdateExperienceUiRequestAction(
  proxy: DraftState,
  { experience }: WithMayBeExperiencePayload,
) {
  const { states: globalStates, timeouts } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const {
      context,
      states: { updateExperienceUiActive: state },
    } = globalStates.data;

    const modifiedState = state;
    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    if (state.value === StateValue.erfolg) {
      modifiedState.value = StateValue.inactive;

      effects.push({
        key: "timeoutsEffect",
        ownArgs: {
          clear: timeouts.genericTimeout,
        },
      });

      delete timeouts.genericTimeout;

      return;
    }

    if (experience) {
      modifiedState.value = StateValue.erfolg;
      context.experience = experience;

      context.dataDefinitionIdToNameMap = makeDataDefinitionIdToNameMap(
        experience.dataDefinitions,
      );

      effects.push(
        {
          key: "holenEinträgeWirkung",
          ownArgs: {
            reFetchFromCache: true,
          },
        },

        {
          key: "timeoutsEffect",
          ownArgs: {
            set: "set-close-update-experience-success-notification",
          },
        },
      );

      return;
    }

    if (state.value === StateValue.inactive) {
      modifiedState.value = StateValue.active;
    } else {
      modifiedState.value = StateValue.inactive;
    }
  }
}

function handleOnSyncAction(proxy: DraftState, payload: OnSyncedData) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    const {
      context,
      states: { einträge: einträgeStatten },
    } = globalStates.data;
    const {
      offlineIdToOnlineExperienceMap,
      onlineExperienceIdToOfflineEntriesMap,
    } = payload;

    const {
      experience: { id },
    } = context;

    if (offlineIdToOnlineExperienceMap) {
      const data = {
        ...offlineIdToOnlineExperienceMap,
      };
      const ownArgs: DefPostOfflineExperiencesSyncEffect["ownArgs"] = {
        data,
      };

      const onlineExperience = offlineIdToOnlineExperienceMap[id];

      if (onlineExperience) {
        // Offline experience now synced

        ownArgs.onlineExperienceId = onlineExperience.id;

        // this offline experience will be purged upon navigation to related
        // online experience, hence deletion here
        const offlineExperienceId = id;
        delete data[offlineExperienceId];
      }

      effects.push({
        key: "postOfflineExperiencesSyncEffect",
        ownArgs,
      });
    }

    if (onlineExperienceIdToOfflineEntriesMap) {
      const offlineIdToOnlineEntryMap =
        onlineExperienceIdToOfflineEntriesMap[id];

      // we have offline experiences now synced
      if (offlineIdToOnlineEntryMap) {
        updateEntries(einträgeStatten, offlineIdToOnlineEntryMap);
      }

      effects.push({
        key: "postOfflineEntriesSyncEffect",
        ownArgs: {
          data: onlineExperienceIdToOfflineEntriesMap,
        },
      });
    }
  }
}

function handleOnEntryCreatedUpdatedAction(
  proxy: DraftState,
  payload: OnEntryCreatedPayload,
) {
  const { states: globalStates } = proxy;

  // istanbul ignore else:
  if (globalStates.value === StateValue.data) {
    const { states } = globalStates.data;

    const {
      newEntryActive,
      notification,
      newEntryCreated,
      einträge: einträgeStatten,
    } = states;

    newEntryActive.value = StateValue.inactive;
    notification.value = StateValue.inactive;

    const { created, updated } = payload;

    const effects = getGeneralEffects<EffectType, DraftState>(proxy);

    effects.push({
      key: "timeoutsEffect",
      ownArgs: {
        set: "set-close-new-entry-created-notification",
      },
    });

    if (updated) {
      const { id } = updated;

      updateEntries(einträgeStatten, {
        [id]: updated,
      });

      return;
    }

    if (created) {
      const newEntryState = newEntryCreated as Draft<
        NewEntryCreatedNotification
      >;

      const { updatedAt } = created;

      newEntryState.value = StateValue.active;

      newEntryState.active = {
        context: {
          message: `New entry created on: ${formatDatetime(updatedAt)}`,
        },
      };

      effects.push({
        key: "scrollDocToTopEffect",
        ownArgs: {},
      });

      switch (einträgeStatten.wert) {
        case StateValue.erfolg:
        case StateValue.einträgeMitHolenFehler:
          const ob = (einträgeStatten[StateValue.erfolg] ||
            einträgeStatten[StateValue.einträgeMitHolenFehler]) as Draft<
            EinträgeDatenErfolg["erfolg"]
          >;

          const { context } = ob;

          context.einträge.unshift({
            eintragDaten: created,
          });

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
                    eintragDaten: created,
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
}

function getExperienceId(props: Props) {
  return (props.match as Match).params.experienceId;
}

function makeDataDefinitionIdToNameMap(definitions: DataDefinitionFragment[]) {
  return definitions.reduce((acc, d) => {
    acc[d.id] = d.name;
    return acc;
  }, {} as DataDefinitionIdToNameMap);
}

function updateEntries(
  state: EinträgeDaten,
  payload: {
    [entryId: string]: EntryFragment;
  },
) {
  const ob = (state[StateValue.erfolg] ||
    state[StateValue.einträgeMitHolenFehler]) as Draft<
    EinträgeDatenErfolg["erfolg"]
  >;

  const { context } = ob;

  context.einträge = context.einträge.map((daten) => {
    const { id } = daten.eintragDaten;
    const updated = payload[id];

    return updated
      ? {
          ...daten,
          eintragDaten: updated,
        }
      : daten;
  });
}

////////////////////////// END STATE UPDATE ////////////////////////////

////////////////////////// EFFECTS SECTION ////////////////////////////

const scrollDocToTopEffect: DefScrollDocToTopEffect["func"] = () => {
  scrollDocumentToTop();
};

type DefScrollDocToTopEffect = EffectDefinition<"scrollDocToTopEffect">;

const timeoutsEffect: DefTimeoutsEffect["func"] = (
  { set, clear },
  __,
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  if (clear) {
    clearTimeout(clear);
  }

  if (set) {
    const timeout = 10 * 1000;
    let timeoutCb = (undefined as unknown) as () => void;

    switch (set) {
      case "set-close-new-entry-created-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.ON_CLOSE_NEW_ENTRY_CREATED_NOTIFICATION,
          });
        };

        break;

      case "set-close-update-experience-success-notification":
        timeoutCb = () => {
          dispatch({
            type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI,
          });
        };

        break;
    }

    const timeoutId = setTimeout(timeoutCb, timeout);

    dispatch({
      type: ActionType.SET_TIMEOUT,
      genericTimeout: timeoutId,
    });
  }
};

type DefTimeoutsEffect = EffectDefinition<
  "timeoutsEffect",
  {
    set?:
      | "set-close-new-entry-created-notification"
      | "set-close-update-experience-success-notification";
    clear?: NodeJS.Timeout;
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

  const syncErrors = getSyncError(experienceId) || undefined;

  if (syncErrors && syncErrors.offlineExperienceId) {
    cleanUpOfflineExperiences({
      [syncErrors.offlineExperienceId]: {} as ExperienceFragment,
    });
  }

  if (bestehendeZwischengespeicherteErgebnis) {
    const daten = bestehendeZwischengespeicherteErgebnis.data as GetDetailExperience;

    dispatch({
      type: ActionType.ON_DATA_RECEIVED,
      experienceData: verarbeitenErfahrungAbfrage(
        daten.getExperience,
        daten.getEntries,
        syncErrors,
      ),
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
        experienceData: verarbeitenErfahrungAbfrage(
          daten.getExperience || null,
          daten.getEntries,
          syncErrors,
        ),
      });
    } catch (error) {
      dispatch({
        type: ActionType.ON_DATA_RECEIVED,
        experienceData: {
          key: StateValue.errors,
          error,
        },
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
        experienceData: {
          key: StateValue.errors,
          error: DATA_FETCHING_FAILED,
        },
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

const holenEinträgeWirkung: DefHolenEinträgeWirkung["func"] = async (
  { pagination, reFetchFromCache },
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

  if (reFetchFromCache && zuletztEinträge) {
    dispatch({
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN,
      schlüssel: StateValue.reFetchOnly,
      entries: zuletztEinträge,
    });

    return;
  }

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
    pagination?: PaginationInput;
    reFetchFromCache?: boolean;
  }
>;

const postOfflineExperiencesSyncEffect: DefPostOfflineExperiencesSyncEffect["func"] = async ({
  data,
  onlineExperienceId: id,
}) => {
  await cleanUpOfflineExperiences(data);

  if (id) {
    windowChangeUrl(makeDetailedExperienceRoute(id), ChangeUrlType.replace);

    return;
  }

  cleanUpOfflineExperiences(data);
};

type DefPostOfflineExperiencesSyncEffect = EffectDefinition<
  "postOfflineExperiencesSyncEffect",
  {
    data: OfflineIdToOnlineExperienceMap;
    onlineExperienceId?: string;
  }
>;

const postOfflineEntriesSyncEffect: DefPostOfflineEntriesSyncEffect["func"] = ({
  data,
}) => {
  cleanUpSyncedOfflineEntries(data);
};

type DefPostOfflineEntriesSyncEffect = EffectDefinition<
  "postOfflineEntriesSyncEffect",
  {
    data: OnlineExperienceIdToOfflineEntriesMap;
  }
>;

export const effectFunctions = {
  scrollDocToTopEffect,
  timeoutsEffect,
  cancelDeleteExperienceEffect,
  deleteExperienceRequestedEffect,
  deleteExperienceEffect,
  fetchDetailedExperienceEffect,
  holenEinträgeWirkung,
  postOfflineExperiencesSyncEffect,
  postOfflineEntriesSyncEffect,
};

function verarbeitenErfahrungAbfrage(
  erfahrung: ExperienceFragment | null,
  kriegEinträgeAbfrage: GetEntriesUnionFragment | null,
  syncErrors?: SyncError,
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
  syncErrors?: SyncError,
): VerarbeitenEinträgeAbfrageZurückgegebenerWert {
  if (!kriegEinträgeAbfrage) {
    return {
      schlüssel: StateValue.versagen,
      fehler: HOLEN_EINTRÄGE_GESCHEITERT,
    };
  }

  const nichtSynchronisiertFehler =
    (syncErrors && syncErrors.createEntries) ||
    ({} as OfflineIdToCreateEntrySyncErrorMap);

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
  let blätternZuId = nonsenseId;

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
  const id =
    "string" === typeof experience
      ? // istanbul ignore next:
        experience
      : experience.id;
  const isOffline = isOfflineId(id);
  const hasUnsaved = getUnsyncedExperience(id);
  const isPartOffline = !isOffline && !!hasUnsaved;
  return { isOffline, isPartOffline };
}

////////////////////////// END HELPER FUNCTIONS ////////////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = GenericGeneralEffect<EffectType> &
  Readonly<{
    states: LoadingState | ErrorState | DataState;
    timeouts: Readonly<Timeouts>;
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
  syncErrors?: SyncError;
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

      updateExperienceUiActive: Readonly<
        | {
            value: InActiveVal;
          }
        | {
            value: ActiveVal;
          }
        | {
            value: ErfolgWert;
          }
      >;
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
      type: ActionType.ON_ENTRY_CREATED;
    } & OnEntryCreatedPayload)
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
  | {
      type: ActionType.RE_FETCH_ENTRIES;
    }
  | ({
      type: ActionType.AUF_EINTRÄGE_ERHIELTEN;
    } & (VerarbeitenEinträgeAbfrageZurückgegebenerWert | ReFetchOnlyPayload))
  | {
      type: ActionType.HOLEN_NÄCHSTE_EINTRÄGE;
    }
  | ({
      type: ActionType.REQUEST_UPDATE_EXPERIENCE_UI;
    } & WithMayBeExperiencePayload)
  | ({
      type: ActionType.ON_SYNC;
    } & OnSyncedData);

type ReFetchOnlyPayload = {
  schlüssel: ReFetchOnlyVal;
  entries: GetEntries_getEntries_GetEntriesSuccess_entries;
};

type WithMayBeExperiencePayload = {
  experience?: ExperienceFragment;
};

type NewEntryActivePayload = {
  bearbeitenEintrag?: EntryFragment;
};

type OnDataReceivedPayload = {
  experienceData: GeholteErfahrungErhieltenNutzlast;
  syncErrors?: SyncError;
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

interface OnEntryCreatedPayload {
  created?: EntryFragment;
  updated?: EntryFragment;
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
  | DefTimeoutsEffect
  | DefCancelDeleteExperienceEffect
  | DefDeleteExperienceRequestedEffect
  | DefDeleteExperienceEffect
  | DefFetchDetailedExperienceEffect
  | DefHolenEinträgeWirkung
  | DefPostOfflineExperiencesSyncEffect
  | DefPostOfflineEntriesSyncEffect;

// [index/label, [errorKey, errorValue][]][]
export type EintragFehlerAlsListe = [string | number, [string, string][]][];

type EintragFehlerAlsListeKarte = {
  [clientId: string]: EintragFehlerAlsListe;
};
