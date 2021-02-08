import React, {
  useLayoutEffect,
  useReducer,
  useCallback,
  Suspense,
  useEffect,
  createContext,
  useMemo,
  useContext,
} from "react";
import {
  MY_TITLE,
  activateInsertExperienceDomId,
  noExperiencesActivateNewDomId,
  domPrefix,
  experiencesDomId,
  searchInputDomId,
  isOfflineClassName,
  isPartOfflineClassName,
  descriptionMoreClassName,
  descriptionSummaryClassName,
  descriptionFullClassName,
  descriptionLessClassName,
  descriptionControlClassName,
  dropdownTriggerClassName,
  dropdownIsActiveClassName,
  fetchExperiencesErrorsDomId,
  fetchErrorRetryDomId,
  onDeleteExperienceSuccessNotificationId,
  onDeleteExperienceCancelledNotificationId,
  makeScrollToDomId,
  updateExperienceMenuItemSelector,
  updateExperienceSuccessNotificationCloseClassName,
  experienceContainerSelector,
  noTriggerDocumentEventClassName,
} from "./my.dom";
import { setUpRoutePage } from "../../utils/global-window";
import "./my.styles.css";
import Loading from "../Loading/loading.component";
import {
  StateValue,
  ReactMouseAnchorEvent,
  OnlineStatus,
} from "../../utils/types";
import {
  reducer,
  initState,
  ActionType,
  Props,
  DispatchType,
  ExperienceState,
  SearchActive,
  makeDefaultSearchActive,
  effectFunctions,
  DataState,
} from "./my.utils";
import { UpsertExperience } from "./my.lazy";
import makeClassNames from "classnames";
import { Link } from "react-router-dom";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { InputChangeEvent } from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import errorImage from "@eb/cm/src/media/error-96.png";
import Header from "../Header/header.component";
import { unstable_batchedUpdates } from "react-dom";
import { useWithSubscriptionContext } from "../../apollo/injectables";
import { ExperienceListViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceListViewFragment";
import { ExperienceData } from "../../utils/experience.gql.types";

type DispatchContextValue = Readonly<{
  dispatch: DispatchType;
  onUpsertExperienceActivated: (e: ReactMouseAnchorEvent) => void;
  onCloseDeleteExperienceNotification: () => void;
  deactivateUpsertExperienceUiCb: (e: ReactMouseAnchorEvent) => void;
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
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
          <div className="no-experiences">
            <div className="notification is-info is-light no-experiences__notification">
              <div className="no-experiences__title">No experiences!</div>
              <button
                id={noExperiencesActivateNewDomId}
                onClick={onUpsertExperienceActivated}
                className="button is-success"
                type="button"
              >
                Create New
              </button>
            </div>
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

  const {
    showingDescription,
    showingOptionsMenu,
    showingUpdateSuccess,
  } = state;

  return (
    <article
      id={id}
      className={makeClassNames({
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
              className={makeClassNames({
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
                  /* eslint-disable-next-line react-hooks/exhaustive-deps*/
                }}
                className={descriptionControlClassName}
              >
                <a className="icon neutral-link" href="*">
                  {showingDescription ? (
                    <i
                      className={makeClassNames({
                        "fas fa-minus": true,
                        [descriptionLessClassName]: true,
                      })}
                    ></i>
                  ) : (
                    <i
                      className={makeClassNames({
                        "fas fa-plus": true,
                        [descriptionMoreClassName]: true,
                      })}
                    ></i>
                  )}
                </a>

                <strong className="description__label">Description</strong>
              </div>

              <pre
                className={makeClassNames({
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
        className={makeClassNames({
          "dropdown is-right": true,
          [dropdownIsActiveClassName]: showingOptionsMenu,
        })}
      >
        <div
          className={makeClassNames({
            "dropdown-menu": true,
          })}
          role="menu"
        >
          <div className="dropdown-content">
            <a
              className={makeClassNames({
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
        className={makeClassNames({
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
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
        <table className="table table is-bordered is-striped is-fullwidth">
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
