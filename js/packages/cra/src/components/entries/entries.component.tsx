import Loading from "../Loading/loading.component";
import { UpsertEntry } from "./entries.lazy";
import { trimClass } from "@eb/cm/src/utils";
import { componentTimeoutsMs } from "@eb/cm/src/utils/timers";
import { StateValue } from "@eb/cm/src/utils/types";
import Modal from "@eb/jsx/src/components/Modal/modal.component";
import Notification from "@eb/jsx/src/components/Notification/notification.component";
import { useReducer, useEffect, Suspense } from "react";
import { useWithSubscriptionContext } from "../../apollo/injectables";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { useRunEffects } from "../../utils/use-run-effects";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import Entry from "../Entry/entry.component";
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
import {
  CallerProps,
  effectFunctions,
  initState,
  Props,
  reducer,
  ActionType,
  DispatchType,
  OldEntryData,
} from "./entries.utils";

export function Entries(props: Props) {
  const { postActions, experience, syncErrors } = props;
  const [states, dispatch] = useReducer(reducer, props, initState);
  const general = states.effects.general;

  const effectArgs = {
    dispatch,
  };

  useRunEffects(general, effectFunctions, props, effectArgs);

  useEffect(() => {
    if (postActions.length) {
      dispatch({
        type: ActionType.from_parent_post_actions,
        actions: postActions,
      });
    }
  }, [postActions]);

  const { entries: state, menu, notification, upsertUi } = states.states;

  // fail / success / fetchEntriesError
  if (state.value === StateValue.fail) {
    return (
      <div className={noTriggerDocumentEventClassName}>
        {state.error}

        <button
          id={refetchEntriesId}
          className="button is-link"
          onClick={() => {
            dispatch({
              type: ActionType.re_fetch_entries,
            });
          }}
        >
          Retry
        </button>
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
                type: ActionType.on_upsert_entry_success,
                newData: {
                  entry,
                  onlineStatus,
                },
                oldData,
                syncErrors,
              });
            }}
            onClose={() => {
              dispatch({
                type: ActionType.toggle_upsert_entry_active,
              });
            }}
          />
        </Suspense>
      )}

      {notification.value === StateValue.active && (
        <Notification
          id={closeUpsertEntryNotificationId}
          onClose={() => {
            dispatch({
              type: ActionType.on_close_new_entry_created_notification,
            });
          }}
          type="is-success"
        >
          {notification.active.context.message}
        </Notification>
      )}

      {menu.value === StateValue.requested && (
        <DeleteEntryConfirmationComponent dispatch={dispatch} />
      )}

      {menu.value === StateValue.deleteSuccess && (
        <Notification
          id={entryDeleteSuccessNotificationId}
          onClose={(e) => {
            e.preventDefault();
            dispatch({
              type: ActionType.delete_entry,
              key: StateValue.cancelled,
            });
          }}
          type="is-success"
        >
          Entry deleted successfully
        </Notification>
      )}

      {menu.value === StateValue.errors && (
        <Notification
          id={entryDeleteFailNotificationId}
          onClose={(e) => {
            e.preventDefault();
            dispatch({
              type: ActionType.delete_entry,
              key: StateValue.cancelled,
            });
          }}
          type="is-danger"
        >
          <div>
            Entry delete failed with error:
            <p>{menu.errors.error}</p>
          </div>
        </Notification>
      )}

      {entries.length === 0 ? (
        <div
          id={noEntryTriggerId}
          className={trimClass(
            `
              ${noTriggerDocumentEventClassName}
              cursor-pointer
              font-semibold
              text-blue-400
              hover:text-blue-500
              pt-3
            `,
          )}
          onClick={() => {
            dispatch({
              type: ActionType.toggle_upsert_entry_active,
            });
          }}
        >
          Click here to create your first entry
        </div>
      ) : (
        <>
          <div id={entriesContainerId}>
            <p
              className={trimClass(
                `
                    font-black
                    text-2xl
                    mb-2
                    mt-10
                    shadow
                    pl-3
                  `,
              )}
            >
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
                      type: ActionType.toggle_upsert_entry_active,
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
                      type: ActionType.delete_entry,
                      key: StateValue.requested,
                      entry,
                    });
                  }}
                />
              );
            })}
          </div>
          {connected && hasNextPage && (
            <div className="detailed-experience__next-entries">
              {error && error.value === "pagingError" && (
                <div className="detailed-experience__paginierung-error">
                  Unable to fetch more entries
                  {error.error}
                </div>
              )}

              <button
                id={fetchNextEntriesId}
                className="button is-primary"
                onClick={() => {
                  dispatch({
                    type: ActionType.re_fetch_entries,
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
      className={trimClass(
        `
          delete-entry-modal
          ${noTriggerDocumentEventClassName}
        `,
      )}
      onClose={() => {
        dispatch({
          type: ActionType.delete_entry,
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
                type: ActionType.delete_entry,
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
                type: ActionType.delete_entry,
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
