import Button from "@eb/jsx/src/components/Button/button.component";
import Notification from "@eb/jsx/src/components/Notification/notification.component";
import { ExperienceData } from "@eb/shared/src/apollo/experience.gql.types";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import errorImage from "@eb/shared/src/media/error-96.png";
import { OnlineStatus, StateValue } from "@eb/shared/src/utils/types";
import {
  ComponentColorType,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
} from "react";
import { unstable_batchedUpdates } from "react-dom";
import { Link } from "react-router-dom";
import { setUpRoutePage } from "../../utils/global-window";
import { InputChangeEvent } from "../../utils/types";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import Header from "../Header/header.component";
import Loading from "../Loading/loading.component";
import {
  activateInsertExperienceDomId,
  descriptionControlClassName,
  descriptionFullClassName,
  descriptionLessClassName,
  descriptionMoreClassName,
  descriptionSummaryClassName,
  domPrefix,
  dropdownIsActiveClassName,
  dropdownTriggerClassName,
  experienceContainerSelector,
  experiencesDomId,
  fetchErrorRetryDomId,
  fetchExperiencesErrorsDomId,
  isOfflineClassName,
  isPartOfflineClassName,
  makeScrollToDomId,
  MY_TITLE,
  noExperiencesActivateNewDomId,
  noTriggerDocumentEventClassName,
  onDeleteExperienceCancelledNotificationId,
  onDeleteExperienceSuccessNotificationId,
  searchInputDomId,
  updateExperienceMenuItemSelector,
  updateExperienceSuccessNotificationCloseClassName,
} from "./my.dom";
import { UpsertExperience } from "./my.lazy";
import "./my.styles.css";
import {
  ActionType,
  DataState,
  DispatchType,
  effectFunctions,
  ExperienceState,
  initState,
  makeDefaultSearchActive,
  Props,
  reducer,
  SearchActive,
} from "./my.utils";

type DispatchContextValue = Readonly<{
  dispatch: DispatchType;
  onUpsertExperienceActivated: (e: ReactMouseEvent) => void;
  onCloseDeleteExperienceNotification: () => void;
  deactivateUpsertExperienceUiCb: (e: ReactMouseEvent) => void;
  onExperienceUpsertSuccess: (
    e: ExperienceListViewFragment,
    o: OnlineStatus,
  ) => void;
  fetchMoreExperiences: () => void;
  onUpdateExperienceError: (error: string) => void;
}>;
const DispatchContext = createContext<DispatchContextValue>(
  {} as DispatchContextValue,
);
const DispatchProvider = DispatchContext.Provider;

const DataStateContextC = createContext<DataState["data"]>(
  {} as DataState["data"],
);
const DataStateProvider = DataStateContextC.Provider;

export function My(props: Props) {
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states,
    effects: { general: generalEffects },
    timeouts: { genericTimeout },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const stateValue = states.value;

  const { onSyncData } = useWithSubscriptionContext();

  useEffect(() => {
    if (onSyncData && stateValue === StateValue.data) {
      dispatch({
        type: ActionType.ON_SYNC,
        data: onSyncData,
      });
    }
  }, [onSyncData, stateValue]);

  useEffect(() => {
    return () => {
      if (genericTimeout) {
        clearTimeout(genericTimeout);
      }
    };
  }, [genericTimeout]);

  useLayoutEffect(() => {
    setUpRoutePage({
      title: MY_TITLE,
    });

    function onDocClicked(event: Event) {
      const target = event.target as HTMLElement;

      if (
        target.classList.contains(noTriggerDocumentEventClassName) ||
        target.closest(`.${noTriggerDocumentEventClassName}`)
      ) {
        return;
      }

      unstable_batchedUpdates(() => {
        dispatch({
          type: ActionType.CLOSE_ALL_OPTIONS_MENU,
        });

        dispatch({
          type: ActionType.CLEAR_SEARCH,
        });
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
  }, []);

  const contextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      onUpsertExperienceActivated(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.ACTIVATE_UPSERT_EXPERIENCE,
        });
      },
      onCloseDeleteExperienceNotification() {
        dispatch({
          type: ActionType.CLOSE_DELETE_EXPERIENCE_NOTIFICATION,
        });
      },
      deactivateUpsertExperienceUiCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.CANCEL_UPSERT_EXPERIENCE,
        });
      },
      onExperienceUpsertSuccess(experience, onlineStatus) {
        dispatch({
          type: ActionType.ON_UPDATE_EXPERIENCE_SUCCESS,
          experience,
          onlineStatus,
        });
      },
      fetchMoreExperiences() {
        dispatch({
          type: ActionType.FETCH_NEXT_EXPERIENCES_PAGE,
        });
      },
      onUpdateExperienceError() {
        dispatch({
          type: ActionType.CANCEL_UPSERT_EXPERIENCE,
        });
      },
    };
  }, []);

  return (
    <>
      <Header />

      {states.value === StateValue.errors ? (
        <FetchExperiencesFail
          error={states.error}
          onReFetch={() => {
            dispatch({
              type: ActionType.DATA_RE_FETCH_REQUEST,
            });
          }}
        />
      ) : states.value === StateValue.loading ? (
        <Loading />
      ) : (
        <DispatchProvider value={contextVal}>
          <DataStateProvider value={states.data}>
            <MyExperiences />
          </DataStateProvider>
        </DispatchProvider>
      )}
    </>
  );
}

export default My;

function MyExperiences() {
  const {
    onUpsertExperienceActivated,
    deactivateUpsertExperienceUiCb,
    onExperienceUpsertSuccess,
    onUpdateExperienceError,
  } = useContext(DispatchContext);

  const {
    states: { upsertExperienceActivated },
    context: { experiences },
  } = useContext(DataStateContextC);

  const noExperiences = experiences.length === 0;

  return (
    <>
      <div id={domPrefix} className="container my-component">
        {upsertExperienceActivated.value === StateValue.active && (
          <Suspense fallback={<Loading />}>
            <UpsertExperience
              experience={upsertExperienceActivated.active.context.experience}
              onClose={deactivateUpsertExperienceUiCb}
              onSuccess={onExperienceUpsertSuccess}
              onError={onUpdateExperienceError}
              className={noTriggerDocumentEventClassName}
            />
          </Suspense>
        )}

        {noExperiences ? (
          <div
            className={cn(
              "no-experiences",
              "flex",
              "justify-center",
              "items-center",
              "!mt-3",
            )}
          >
            <Notification
              type={ComponentColorType.is_light_success}
              style={{
                width: "min(95vw, 500px)",
              }}
            >
              <div className="no-experiences__title">No experiences!</div>
              <Button
                id={noExperiencesActivateNewDomId}
                onClick={onUpsertExperienceActivated}
                type="button"
                btnType={ComponentColorType.is_success}
              >
                Create New
              </Button>
            </Notification>
          </div>
        ) : (
          <>
            <SearchComponent />

            <DeletedExperienceNotification />

            <ExperiencesComponent />
          </>
        )}
      </div>

      <a
        href="*"
        id={activateInsertExperienceDomId}
        className="floating-circular"
        onClick={onUpsertExperienceActivated}
      >
        <span>+</span>
      </a>
    </>
  );
}

function ExperiencesComponent() {
  const {
    states: { experiences: experiencesStates },
    context: { experiences },
  } = useContext(DataStateContextC);

  return useMemo(() => {
    return (
      <div className="experiences-container" id={experiencesDomId}>
        {experiences.map((experienceData) => {
          const { id } = experienceData.experience;

          return (
            <ExperienceComponent
              key={id}
              experienceState={
                experiencesStates[id] ||
                ({
                  showingOptionsMenu: false,
                  showingDescription: false,
                } as ExperienceState)
              }
              experienceData={experienceData}
            />
          );
        })}

        <PaginationComponent />
      </div>
    );
  }, [experiencesStates, experiences]);
}

function ExperienceComponent(props: ExperienceProps) {
  const { dispatch } = useContext(DispatchContext);
  const { experienceData, experienceState: state } = props;
  const { experience, onlineStatus } = experienceData;
  const { title, description, id } = experience;
  const detailPath = makeDetailedExperienceRoute(id);

  const { showingDescription, showingOptionsMenu, showingUpdateSuccess } =
    state;

  return (
    <article
      id={id}
      className={cn({
        "experience box media": true,
        [isOfflineClassName]: onlineStatus === StateValue.offline,
        [isPartOfflineClassName]: onlineStatus === StateValue.partOffline,
        [experienceContainerSelector]: true,
      })}
    >
      <div className="media-content">
        <div className="content">
          <div
            id={makeScrollToDomId(id)}
            className="my-experience__scroll-to visually-hidden"
          />

          {showingUpdateSuccess && (
            <div
              className={cn({
                "notification is-success": true,
                [noTriggerDocumentEventClassName]: true,
              })}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();

                  dispatch({
                    type: ActionType.ON_UPDATE_EXPERIENCE_SUCCESS,
                    experience,
                  });
                }}
                className={`${updateExperienceSuccessNotificationCloseClassName} delete`}
              />
              Updated successfully
            </div>
          )}

          <Link className="neutral-link experience__title" to={detailPath}>
            <strong>{title}</strong>
          </Link>

          {description && (
            <div className="description">
              <div
                onClick={(e) => {
                  e.preventDefault();

                  dispatch({
                    type: ActionType.TOGGLE_SHOW_DESCRIPTION,
                    id,
                  });
                }}
                className={descriptionControlClassName}
              >
                <a className="icon neutral-link" href="*">
                  {showingDescription ? (
                    <i
                      className={cn({
                        "fas fa-minus": true,
                        [descriptionLessClassName]: true,
                      })}
                    ></i>
                  ) : (
                    <i
                      className={cn({
                        "fas fa-plus": true,
                        [descriptionMoreClassName]: true,
                      })}
                    ></i>
                  )}
                </a>

                <strong className="description__label">Description</strong>
              </div>

              <pre
                className={cn({
                  description__text: true,
                  [descriptionFullClassName]: showingDescription,
                  [descriptionSummaryClassName]: !showingDescription,
                })}
              >
                {description}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn({
          "dropdown is-right": true,
          [dropdownIsActiveClassName]: showingOptionsMenu,
        })}
      >
        <div
          className={cn({
            "dropdown-menu": true,
          })}
          role="menu"
        >
          <div className="dropdown-content">
            <a
              className={cn({
                "neutral-link edit-experience-menu-item": true,
                [updateExperienceMenuItemSelector]: true,
              })}
              style={{
                cursor: "pointer",
                display: "block",
              }}
              onClick={(e) => {
                e.preventDefault();

                dispatch({
                  type: ActionType.ACTIVATE_UPSERT_EXPERIENCE,
                  experience,
                });
              }}
              href="*"
            >
              Edit
            </a>
          </div>

          <div className="dropdown-content">
            <a
              className="neutral-link delete-experience-menu-item"
              style={{
                cursor: "pointer",
                display: "block",
              }}
              onClick={(e) => {
                e.preventDefault();

                dispatch({
                  type: ActionType.DELETE_EXPERIENCE_REQUEST,
                  id,
                });
              }}
              href="*"
            >
              Delete
            </a>
          </div>
        </div>
      </div>

      <a
        className={cn({
          [dropdownTriggerClassName]: true,
          "media-right dropdown-trigger": true,
          [noTriggerDocumentEventClassName]: true,
        })}
        onClick={(e) => {
          e.preventDefault();

          dispatch({
            type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
            id,
          });
        }}
        href="*"
      >
        <span className="icon is-small">
          <i className="fas fa-ellipsis-v" aria-hidden="true" />
        </span>
      </a>
    </article>
  );
}

function PaginationComponent() {
  const { fetchMoreExperiences } = useContext(DispatchContext);

  const {
    context: {
      pageInfo: { hasNextPage: nächsteSeiteVorhanden },
    },
  } = useContext(DataStateContextC);

  const { connected } = useWithSubscriptionContext();

  if (!(connected && nächsteSeiteVorhanden)) {
    return null;
  }

  return (
    <div className="my-experiences__prev-next">
      <button
        className="button my-experiences__next"
        onClick={fetchMoreExperiences}
      >
        Next
      </button>
    </div>
  );
}

const SearchComponent = () => {
  const { dispatch } = useContext(DispatchContext);

  const {
    states: { search: state },
  } = useContext(DataStateContextC);

  const stateValue = state.value;

  const active = (state as SearchActive).active || makeDefaultSearchActive();

  const { value, results } = active.context;
  const hasResults = results.length > 0;

  const onSearch = useCallback((e: InputChangeEvent) => {
    const text = e.target.value;
    dispatch({
      type: ActionType.SEARCH,
      text,
    });
  }, []);

  return (
    <div className="search">
      <div className="control has-icons-right">
        <input
          id={searchInputDomId}
          className="input is-rounded"
          type="text"
          placeholder="Search your experiences"
          onChange={onSearch}
          value={value}
        />

        <span className="icon is-small is-right">
          <i className="fas fa-search"></i>
        </span>
      </div>

      <div className="table-container search__results">
        <table className="table is-bordered is-striped is-fullwidth">
          <tbody>
            {stateValue === StateValue.active ? (
              hasResults ? (
                results.map(({ id, title }) => {
                  return (
                    <tr key={id}>
                      <td className="search__link-container">
                        <Link
                          className="neutral-link search__link"
                          to={makeDetailedExperienceRoute(id)}
                        >
                          {title}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="search__no-results">No results</td>
                </tr>
              )
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function DeletedExperienceNotification() {
  const { onCloseDeleteExperienceNotification } = useContext(DispatchContext);

  const {
    states: { deletedExperience: state },
  } = useContext(DataStateContextC);

  let title = "";
  let message = "";
  let domId = "";

  switch (state.value) {
    case StateValue.inactive:
      return null;

    case StateValue.cancelled:
      title = state.cancelled.context.title;
      message = "cancelled";
      domId = onDeleteExperienceCancelledNotificationId;
      break;

    case StateValue.deleted:
      title = state.deleted.context.title;
      message = "successful";
      domId = onDeleteExperienceSuccessNotificationId;
      break;
  }

  return (
    <div className="notification is-warning">
      <button
        id={domId}
        className="delete"
        onClick={onCloseDeleteExperienceNotification}
      />
      Delete of experience
      <strong> {title} </strong> {message}
    </div>
  );
}

function FetchExperiencesFail(props: { error: string; onReFetch: () => void }) {
  const { error, onReFetch } = props;
  return (
    <div className="card my__fetch-errors" id={fetchExperiencesErrorsDomId}>
      <div className="card-image">
        <figure className="image is-96x96 my__fetch-errors-image">
          <img src={errorImage} alt="error loading experiences" />
        </figure>
      </div>

      <div className="my__fetch-errors-content card-content notification is-light is-danger">
        <div className="content">
          <p>{error}</p>
        </div>

        <button
          className="button is-medium"
          type="button"
          id={fetchErrorRetryDomId}
          onClick={onReFetch}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

interface ExperienceProps {
  experienceState: ExperienceState;
  experienceData: ExperienceData;
}
