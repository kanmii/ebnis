import { Button } from "@eb/jsx/src/Button";
import Modal from "@eb/jsx/src/Modal";
import { Notification } from "@eb/jsx/src/Notification";
import { getEntriesDetailView } from "@eb/shared/src/apollo/entries-connection.gql";
import { useWithSubscriptionContext } from "@eb/shared/src/apollo/injectables";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import { Suspense, useEffect, useReducer } from "react";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { useRunEffects } from "../../utils/use-run-effects";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import Entry from "../Entry/entry.component";
import Loading from "../Loading/loading.component";
import {
  closeDeleteEntryConfirmationId,
  closeUpsertEntryNotificationId,
  entriesContainerId,
  entryDeleteFailNotificationId,
  entryDeleteSuccessNotificationId,
  fetchNextEntriesId,
  noEntryTriggerId,
  okDeleteEntryId,
  refetchEntriesId,
} from "./entries.dom";
import { UpsertEntry } from "./entries.lazy";
import {
  ActionType,
  CallerProps,
  DispatchType,
  effectFunctions,
  initState,
  OldEntryData,
  Props,
  reducer,
} from "./entries.utils";

export function Entries(props: Props) {
  const { postActions, experience } = props;
  const [states, dispatch] = useReducer(reducer, props, initState);
  const general = states.effects.general;

  const effectArgs = {
    dispatch,
  };

  useRunEffects(general, effectFunctions, props, effectArgs);

  useEffect(() => {
    if (postActions.length) {
      dispatch({
        type: ActionType.from_parent_actions,
        actions: postActions,
      });
    }
  }, [postActions]);

  const { entries: state, menu, notification, upsertUi } = states.states;

  // fail / success / fetchEntriesError
  if (state.value === StateValue.fail) {
    return (
      <div className={noTriggerDocumentEventClassName}>
        <div>{state.error}!</div>

        <Button
          id={refetchEntriesId}
          btnType={ComponentColorType.is_success}
          className="mt-2"
          onClick={() => {
            dispatch({
              type: ActionType.re_fetch,
            });
          }}
        >
          Please try again
        </Button>
      </div>
    );
  }

  // will react complain?
  const { connected } = useWithSubscriptionContext();
  const {
    context: {
      entries,
      pageInfo: { hasNextPage },
      error,
    },
  } = state.success;

  const oldEditedEntryProps =
    upsertUi.value === StateValue.active
      ? upsertUi.active.context.updatingEntry
      : undefined;

  return (
    <>
      {(oldEditedEntryProps ||
        /* !syncErrors && */
        upsertUi.value === StateValue.active) && (
        <Suspense fallback={<Loading />}>
          <UpsertEntry
            experience={experience}
            updatingEntry={oldEditedEntryProps}
            onSuccess={(entry, onlineStatus) => {
              let oldData: undefined | OldEntryData = undefined;

              if (oldEditedEntryProps) {
                const { entry, index } = oldEditedEntryProps;

                oldData = {
                  entry,
                  index,
                };
              }

              dispatch({
                type: ActionType.on_upsert_success,
                newData: {
                  entry,
                  onlineStatus,
                },
                oldData,
              });
            }}
            onClose={() => {
              dispatch({
                type: ActionType.toggle_upsert_ui,
              });
            }}
          />
        </Suspense>
      )}

      {notification.value === StateValue.active && (
        <Notification
          close={{
            onClose: () => {
              dispatch({
                type: ActionType.close_notification,
              });
            },
            id: closeUpsertEntryNotificationId,
          }}
          type={ComponentColorType.is_success}
        >
          {notification.active.context.message}
        </Notification>
      )}

      {menu.value === StateValue.requested && (
        <DeleteEntryConfirmationComponent dispatch={dispatch} />
      )}

      {menu.value === StateValue.deleteSuccess && (
        <Notification
          close={{
            onClose: (e) => {
              e.preventDefault();
              dispatch({
                type: ActionType.delete,
                key: StateValue.cancelled,
              });
            },
            id: entryDeleteSuccessNotificationId,
          }}
          type={ComponentColorType.is_success}
        >
          Entry deleted successfully
        </Notification>
      )}

      {menu.value === StateValue.errors && (
        <Notification
          close={{
            onClose: (e) => {
              e.preventDefault();
              dispatch({
                type: ActionType.delete,
                key: StateValue.cancelled,
              });
            },
            id: entryDeleteFailNotificationId,
          }}
          type={ComponentColorType.is_danger}
        >
          <div>
            Entry delete failed with error:
            <p>{menu.errors.error}</p>
          </div>
        </Notification>
      )}

      {entries.length === 0 ? (
        <a
          id={noEntryTriggerId}
          className={cn(
            "cursor-pointer font-semibold text-blue-400 hover:text-blue-500 pt-3",
            noTriggerDocumentEventClassName,
          )}
          onClick={() => {
            dispatch({
              type: ActionType.toggle_upsert_ui,
            });
          }}
        >
          Click here to create your first entry
        </a>
      ) : (
        <>
          <div id={entriesContainerId}>
            <p className={cn("font-black text-2xl mb-2 mt-10 shadow pl-3")}>
              Entries
            </p>
            {entries.map((daten, index) => {
              const { entryData } = daten;
              const { id } = entryData;

              return (
                <Entry
                  key={id}
                  state={daten}
                  index={index}
                  activateUpdateEntryCb={(data) => {
                    dispatch({
                      type: ActionType.toggle_upsert_ui,
                      updatingEntry: data,
                    });
                  }}
                  entriesOptionsCb={(entry) => {
                    dispatch({
                      type: ActionType.menus,
                      entry,
                    });
                  }}
                  menuActive={
                    menu.value === StateValue.active && menu.active.id === id
                  }
                  deleteEntryRequest={(entry) => {
                    dispatch({
                      type: ActionType.delete,
                      key: StateValue.requested,
                      entry,
                    });
                  }}
                />
              );
            })}
          </div>
          {connected && hasNextPage && (
            <div className={cn("mt-6 text-center")}>
              {error && error.value === "pagingError" && (
                <div>
                  Unable to fetch more entries
                  {error.error}
                </div>
              )}

              <button
                id={fetchNextEntriesId}
                className="button is-primary"
                onClick={() => {
                  dispatch({
                    // TODO: shouldn't this be fetch_next????
                    type: ActionType.re_fetch,
                  });
                }}
              >
                More
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default (props: CallerProps) => {
  return (
    <Entries
      {...props}
      componentTimeoutsMs={componentTimeoutsMs}
      updateExperiencesMutation={updateExperiencesMutation}
      getEntriesDetailView={getEntriesDetailView}
    />
  );
};

function DeleteEntryConfirmationComponent({
  dispatch,
}: {
  dispatch: DispatchType;
}) {
  return (
    <Modal
      className={cn("delete-entry-modal", noTriggerDocumentEventClassName)}
      onClose={() => {
        dispatch({
          type: ActionType.delete,
          key: StateValue.cancelled,
        });
      }}
    >
      <Modal.Card>
        <Modal.Header>
          <strong>Delete Entry</strong>
        </Modal.Header>
        <Modal.Footer>
          <button
            className="button is-success"
            id={okDeleteEntryId}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              dispatch({
                type: ActionType.delete,
                key: StateValue.deleted,
              });
            }}
          >
            Ok
          </button>

          <button
            className="button is-danger delete-experience__cancel-button"
            id={closeDeleteEntryConfirmationId}
            type="button"
            onClick={() => {
              dispatch({
                type: ActionType.delete,
                key: StateValue.cancelled,
              });
            }}
          >
            Cancel
          </button>
        </Modal.Footer>
      </Modal.Card>
    </Modal>
  );
}
