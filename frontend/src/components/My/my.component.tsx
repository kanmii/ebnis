import React, {
  useLayoutEffect,
  useReducer,
  useCallback,
  Suspense,
  memo,
} from "react";
import {
  MY_TITLE,
  activateNewDomId,
  noExperiencesActivateNewDomId,
  domPrefix,
  experiencesDomId,
  searchInputDomId,
} from "./my.dom";
import { setUpRoutePage } from "../../utils/global-window";
import "./my.styles.scss";
import Loading from "../Loading/loading.component";
import {
  reducer,
  StateValue,
  initState,
  ActionType,
  Props,
  DispatchType,
  ExperiencesMap,
  ExperienceState,
  SearchState,
  SearchActive,
  makeDefaultSearchActive,
} from "./my.utils";
import { NewExperience } from "./my.lazy";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";
import makeClassNames from "classnames";
import { Link } from "react-router-dom";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { getOnlineStatus } from "../DetailExperience/detail-experience.utils";
import { InputChangeEvent } from "../../utils/types";

export function My(props: Props) {
  const { experiences } = props;
  const noExperiences = experiences.length === 0;
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states: { newExperienceActivated, experiences: descriptionsActive, search },
  } = stateMachine;

  useLayoutEffect(() => {
    setUpRoutePage({
      title: MY_TITLE,
    });

    function onDocClicked() {
      dispatch({
        type: ActionType.CLOSE_ALL_OPTIONS_MENU,
      });

      dispatch({
        type: ActionType.CLEAR_SEARCH,
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
  }, []);

  const onNewExperienceActivated = useCallback(() => {
    dispatch({
      type: ActionType.ACTIVATE_NEW_EXPERIENCE,
    });
  }, []);

  return (
    <>
      <div id={domPrefix} className="container my-component">
        {newExperienceActivated.value === StateValue.active && (
          <>
            <Suspense fallback={<Loading />}>
              <NewExperience myDispatch={dispatch} />
            </Suspense>
          </>
        )}

        {noExperiences ? (
          <div className="no-experiences">
            <div className="notification is-info is-light no-experiences__notification">
              <div className="no-experiences__title">No experiences!</div>
              <button
                id={noExperiencesActivateNewDomId}
                onClick={onNewExperienceActivated}
                className="button is-success"
                type="button"
              >
                Create New
              </button>
            </div>
          </div>
        ) : (
          <>
            <SearchComponent state={search} dispatch={dispatch} />

            <ExperiencesComponent
              dispatch={dispatch}
              experiences={experiences}
              experiencesStates={descriptionsActive}
            />
          </>
        )}
      </div>

      <div
        id={activateNewDomId}
        className="new-experience-trigger"
        onClick={onNewExperienceActivated}
      >
        <span>+</span>
      </div>
    </>
  );
}

const ExperiencesComponent = memo(
  (props: ExperiencesComponentProps) => {
    const { dispatch, experiences, experiencesStates } = props;

    return (
      <div className="experiences-container" id={experiencesDomId}>
        {experiences.map((experience) => {
          const { id } = experience;

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
              experience={experience}
              dispatch={dispatch}
            />
          );
        })}
      </div>
    );
  },
  (currentProps, nextProps) => {
    return (
      currentProps.experiencesStates === nextProps.experiencesStates &&
      currentProps.experiences === nextProps.experiences
    );
  },
);

const ExperienceComponent = React.memo(
  function ExperienceFn(props: ExperienceProps) {
    const { experience, experienceState: state, dispatch } = props;
    const { title, description, id } = experience;
    const { isOffline, isPartOffline } = getOnlineStatus(experience);
    const detailPath = makeDetailedExperienceRoute(id);
    const { showingDescription, showingOptionsMenu } = state;

    const onToggleShowMenuOptions = useCallback((e) => {
      dispatch({
        type: ActionType.TOGGLE_SHOW_OPTIONS_MENU,
        id,
      });
      /* eslint-disable-next-line react-hooks/exhaustive-deps*/
    }, []);

    const onToggleShowDescription = useCallback(() => {
      dispatch({
        type: ActionType.TOGGLE_SHOW_DESCRIPTION,
        id,
      });
      /* eslint-disable-next-line react-hooks/exhaustive-deps*/
    }, []);

    return (
      <article
        className={makeClassNames({
          "experience box media": true,
          "experience--is-danger": isOffline,
          "experience--is-warning": isPartOffline,
        })}
      >
        <div className="media-content">
          <div className="content">
            <Link className="neutral-link experience__title" to={detailPath}>
              <strong>{title}</strong>
            </Link>

            {description && (
              <div className="description">
                <div
                  onClick={onToggleShowDescription}
                  className="description__control"
                >
                  <span className="icon">
                    {showingDescription ? (
                      <i className="fas fa-minus description__control--less"></i>
                    ) : (
                      <i className="fas fa-plus description__control--more"></i>
                    )}
                  </span>

                  <strong className="description__label">Description</strong>
                </div>

                <pre
                  className={makeClassNames({
                    description__text: true,
                    "description__text--full": showingDescription,
                    "description__text--summary": !showingDescription,
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
            "is-active": showingOptionsMenu,
          })}
        >
          <div className="dropdown-menu" role="menu">
            <div className="dropdown-content">
              <Link
                to={{
                  pathname: detailPath,
                  state: {
                    delete: true,
                  },
                }}
                className="neutral-link"
              >
                Delete
              </Link>
            </div>
          </div>
        </div>

        <figure
          className="dropdown-trigger media-right"
          onClick={onToggleShowMenuOptions}
        >
          <span className="icon is-small">
            <i className="fas fa-ellipsis-v" aria-hidden="true" />
          </span>
        </figure>
      </article>
    );
  },

  function ExperienceComponentPropsDiff(prevProps, currProps) {
    return (
      prevProps.experienceState.showingDescription ===
        currProps.experienceState.showingDescription &&
      prevProps.experienceState.showingOptionsMenu ===
        currProps.experienceState.showingOptionsMenu
    );
  },
);

const SearchComponent = (props: SearchProps) => {
  const { state, dispatch } = props;
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

interface ExperiencesComponentProps {
  experiences: ExperienceMiniFragment[];
  experiencesStates: ExperiencesMap;
  dispatch: DispatchType;
}

interface ExperienceProps {
  experienceState: ExperienceState;
  experience: ExperienceMiniFragment;
  dispatch: DispatchType;
}

interface SearchProps {
  state: SearchState;
  dispatch: DispatchType;
}
