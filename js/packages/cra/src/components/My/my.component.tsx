import { Button } from "@eb/jsx/src/Button";
import { Card } from "@eb/jsx/src/Card";
import { DropdownMenu } from "@eb/jsx/src/DropdownMenu";
import { Input, Textarea } from "@eb/jsx/src/Input";
import { Notification } from "@eb/jsx/src/Notification";
import { getCachedExperiencesConnectionListView } from "@eb/shared/src/apollo/cached-experiences-list-view";
import { ExperienceData } from "@eb/shared/src/apollo/experience.gql.types";
import { getExperienceConnectionListView } from "@eb/shared/src/apollo/get-experiences-connection-list.gql";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import errorImage from "@eb/shared/src/media/error-96.png";
import { ReactComponent as SearchIconSvg } from "@eb/shared/src/styles/search-solid.svg";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { OnlineStatus, StateValue } from "@eb/shared/src/utils/types";
import {
  ComponentColorType,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { unstable_batchedUpdates } from "react-dom";
import { Link } from "react-router-dom";
import { setUpRoutePage } from "../../utils/global-window";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import HeaderComponent from "../Header/header.component";
import Loading from "../Loading/loading.component";
import {
  activateInsertExperienceDomId,
  descriptionContainerSelector,
  descriptionHideSelector,
  descriptionShowHideSelector,
  descriptionShowSelector,
  descriptionTextSelector,
  domPrefix,
  dropdownMenuMenuSelector,
  dropdownTriggerSelector,
  experienceContainerSelector,
  experiencesDomId,
  fetchErrorRetryDomId,
  fetchExperiencesErrorsDomId,
  fetchNextSelector,
  isOfflineClassName,
  isPartOfflineClassName,
  makeScrollToDomId,
  MY_TITLE,
  noExperiencesActivateNewDomId,
  noSearchResultSelector,
  noTriggerDocumentEventClassName,
  onDeleteExperienceCancelledNotificationId,
  onDeleteExperienceSuccessNotificationId,
  searchInputDomId,
  searchLinkSelector,
  updateExperienceMenuItemSelector,
  updateExperienceSuccessNotificationSelector,
} from "./my.dom";
import { UpsertExperience } from "./my.lazy";
import {
  ActionType,
  CallerProps,
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

const DispatchContext = createContext<DispatchContextValue>(
  {} as DispatchContextValue,
);
const DispatchProvider = DispatchContext.Provider;

const DataStateContextC = createContext<DataState["data"]>(
  {} as DataState["data"],
);
const DataStateProvider = DataStateContextC.Provider;

export function My(props: Props) {
  const { HeaderComponentFn } = props;
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
        type: ActionType.on_sync,
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

  useEffect(() => {
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
          type: ActionType.close_all_options_menu,
        });

        dispatch({
          type: ActionType.clear_search,
        });
      });
    }

    document.documentElement.addEventListener("click", onDocClicked);

    return () => {
      document.documentElement.removeEventListener("click", onDocClicked);
    };
  }, []);

  const dispatchContextVal: DispatchContextValue = useMemo(() => {
    return {
      dispatch,
      onUpsertExperienceActivated(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.activate_upsert_experience,
        });
      },
      onCloseDeleteExperienceNotification() {
        dispatch({
          type: ActionType.close_delete_experience_notification,
        });
      },
      deactivateUpsertExperienceUiCb(e) {
        e.preventDefault();

        dispatch({
          type: ActionType.cancel_upsert_experience,
        });
      },
      onExperienceUpsertSuccess(experience, onlineStatus) {
        dispatch({
          type: ActionType.on_update_experience_success,
          experience,
          onlineStatus,
        });
      },
      fetchMoreExperiences() {
        dispatch({
          type: ActionType.fetch_next_experiences_page,
        });
      },
      onUpdateExperienceError() {
        dispatch({
          type: ActionType.cancel_upsert_experience,
        });
      },
    };
  }, []);

  return (
    <>
      <HeaderComponentFn />

      <div
        id={domPrefix}
        className={cn(
          "flex-1 my-0 mx-auto relative w-auto pt-16",
          "pb-[calc(var(--floatingCircularBottom)*1.5)]",
        )}
      >
        <DispatchProvider value={dispatchContextVal}>
          {(function renderMy() {
            switch (states.value) {
              case StateValue.loading:
                return <Loading />;

              case StateValue.errors:
                return (
                  <Card
                    className={cn("my-0 mx-auto pt-3 mt-10 !max-w-xs")}
                    id={fetchExperiencesErrorsDomId}
                  >
                    <Card.Image
                      size="64x64"
                      figureProps={{
                        className: "my-0 mx-auto",
                      }}
                    >
                      <img src={errorImage} alt="error loading experiences" />
                    </Card.Image>

                    <Card.Content wrapOnly>
                      <Notification type={ComponentColorType.is_light_danger}>
                        <p>{states.error}</p>

                        <Button
                          isRounded
                          className="mt-4 font-bold"
                          type="button"
                          id={fetchErrorRetryDomId}
                          onClick={() => {
                            dispatch({
                              type: ActionType.data_re_fetch_request,
                            });
                          }}
                        >
                          Retry
                        </Button>
                      </Notification>
                    </Card.Content>
                  </Card>
                );

              case StateValue.data: {
                const {
                  states: { upsertExperienceActivated },
                  context: { experiences },
                } = states.data;

                const noExperiences = experiences.length === 0;
                const {
                  onUpsertExperienceActivated,
                  deactivateUpsertExperienceUiCb,
                  onExperienceUpsertSuccess,
                  onUpdateExperienceError,
                } = dispatchContextVal;

                return (
                  <>
                    <DataStateProvider value={states.data}>
                      {upsertExperienceActivated.value ===
                        StateValue.active && (
                        <Suspense fallback={<Loading />}>
                          <UpsertExperience
                            experience={
                              upsertExperienceActivated.active.context
                                .experience
                            }
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
                            "flex justify-center items-center !mt-3",
                          )}
                        >
                          <Notification
                            type={ComponentColorType.is_light_success}
                            style={{
                              width: "min(95vw, 500px)",
                            }}
                          >
                            <div className="no-experiences__title">
                              No experiences!
                            </div>

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
                    </DataStateProvider>

                    <a
                      id={activateInsertExperienceDomId}
                      className="floating-circular cursor-pointer"
                      onClick={onUpsertExperienceActivated}
                    >
                      <span>+</span>
                    </a>
                  </>
                );
              }
            }
          })()}
        </DispatchProvider>
      </div>
    </>
  );
}

export default (props: CallerProps) => {
  return (
    <My
      {...props}
      getExperienceConnectionListView={getExperienceConnectionListView}
      componentTimeoutsMs={componentTimeoutsMs}
      getCachedExperiencesConnectionListViewFn={
        getCachedExperiencesConnectionListView
      }
      HeaderComponentFn={HeaderComponent}
    />
  );
};

function ExperiencesComponent() {
  const {
    states: { experiences: experiencesStates },
    context: { experiences },
  } = useContext(DataStateContextC);

  return useMemo(() => {
    return (
      <div className="experiences-container max-w-lg" id={experiencesDomId}>
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
    <div
      id={id}
      className={cn(
        "experience shadow-lg border-2 mb-5 p-6 flex relative rounded-md",
        experienceContainerSelector,
        onlineStatus === StateValue.offline ? isOfflineClassName : "",
        onlineStatus === StateValue.partOffline ? isPartOfflineClassName : "",
      )}
    >
      <div className="flex-1 w-full mt-4">
        <div
          id={makeScrollToDomId(id)}
          className="visually-hidden relative -top-40"
        />

        {showingUpdateSuccess && (
          <Notification
            type={ComponentColorType.is_success}
            className={cn("my-3", noTriggerDocumentEventClassName)}
            close={{
              onClose: (e) => {
                e.preventDefault();

                dispatch({
                  type: ActionType.on_update_experience_success,
                  experience,
                });
              },
              className: updateExperienceSuccessNotificationSelector,
            }}
          >
            Updated successfully
          </Notification>
        )}

        <Link className="px-px pt-0 pb-6 block font-bold" to={detailPath}>
          {title}
        </Link>

        {description && (
          <div className={descriptionContainerSelector}>
            <a
              className={cn(
                "cursor-pointer inline-flex items-baseline",
                descriptionShowHideSelector,
              )}
              onClick={(e) => {
                e.preventDefault();

                dispatch({
                  type: ActionType.toggle_show_description,
                  id,
                });
              }}
            >
              <strong className="mr-2">Description</strong>

              {showingDescription ? (
                <Button
                  style={{
                    fontWeight: 600,
                  }}
                  wide
                  className={descriptionHideSelector}
                >
                  Hide
                </Button>
              ) : (
                <Button
                  style={{
                    fontWeight: 600,
                  }}
                  wide
                  className={descriptionShowSelector}
                >
                  Show
                </Button>
              )}
            </a>

            {showingDescription && (
              <Textarea
                className={cn("mt-4 bg-gray-50", descriptionTextSelector)}
                rows={5}
                value={description}
                disabled
              />
            )}
          </div>
        )}
      </div>

      <DropdownMenu className="flex-shrink-0">
        <DropdownMenu.Menu
          active={showingOptionsMenu}
          className={dropdownMenuMenuSelector}
        >
          <DropdownMenu.Item
            className={cn({
              "neutral-link edit-experience-menu-item": true,
              [updateExperienceMenuItemSelector]: true,
            })}
            onClick={(e) => {
              e.preventDefault();

              dispatch({
                type: ActionType.activate_upsert_experience,
                experience,
              });
            }}
          >
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="neutral-link delete-experience-menu-item"
            onClick={(e) => {
              e.preventDefault();

              dispatch({
                type: ActionType.delete_experience_request,
                id,
              });
            }}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Menu>

        <DropdownMenu.Trigger
          className={cn(
            dropdownTriggerSelector,
            noTriggerDocumentEventClassName,
          )}
          onClick={() => {
            dispatch({
              type: ActionType.toggle_show_options_menu,
              id,
            });
          }}
        />
      </DropdownMenu>
    </div>
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
    <div className="text-center">
      <Button
        className={cn("font-extrabold", fetchNextSelector)}
        onClick={fetchMoreExperiences}
      >
        Next
      </Button>
    </div>
  );
}

function SearchComponent() {
  const { dispatch } = useContext(DispatchContext);

  const {
    states: { search: state },
  } = useContext(DataStateContextC);

  const stateValue = state.value;

  const active = (state as SearchActive).active || makeDefaultSearchActive();

  const { value, results } = active.context;
  const hasResults = results.length > 0;

  return (
    <div
      className="max-w-sm fixed z-10"
      style={{
        width: "85%",
        top: "var(--body-padding-top)",
      }}
    >
      <Input
        iconRight
        isRounded
        id={searchInputDomId}
        type="text"
        placeholder="Search your experiences"
        onChange={(e) => {
          dispatch({
            type: ActionType.search,
            text: e.target.value,
          });
        }}
        value={value}
      >
        <SearchIconSvg
          style={{
            width: "20px",
            height: "20px",
          }}
        />
      </Input>

      <div className="eb-tiny-scroll mt-3 overflow-y-auto max-h-72 max-w-full">
        <table className="w-full">
          <tbody className="bg-transparent">
            {stateValue === StateValue.active ? (
              hasResults ? (
                results.map(({ id, title }, index) => {
                  return (
                    <tr
                      key={id}
                      className={cn(index % 2 == 1 ? "bg-gray-50" : "bg-white")}
                    >
                      <td className="p-0 border align-top">
                        <Link
                          className={cn(
                            "neutral-link w-full block py-2 px-3",
                            searchLinkSelector,
                          )}
                          to={makeDetailedExperienceRoute(id)}
                        >
                          {title}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="bg-white">
                  <td className={cn("border", noSearchResultSelector)}>
                    No results
                  </td>
                </tr>
              )
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    <Notification
      className="mb-6 !max-w-lg"
      type={ComponentColorType.is_warning}
      close={{
        onClose: onCloseDeleteExperienceNotification,
        id: domId,
      }}
    >
      Delete of experience
      <strong> {title} </strong> {message}
    </Notification>
  );
}

interface ExperienceProps {
  experienceState: ExperienceState;
  experienceData: ExperienceData;
}

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
