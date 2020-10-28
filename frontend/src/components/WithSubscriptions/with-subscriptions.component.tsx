import React, { useEffect, useReducer } from "react";
import { EmitActionType } from "../../utils/observable-manager";
import {
  cleanupWithSubscriptions,
  WithSubscriptionProvider,
  useOnExperiencesDeletedSubscription,
  WithSubscriptionsDispatchProvider,
} from "./with-subscriptions.injectables";
import {
  EmitActionConnectionChangedPayload,
  StateValue,
  BroadcastMessageType,
  BroadcastMessage,
  BroadcastMessageSelf,
} from "../../utils/types";
import { cleanCachedMutations } from "../../apollo/clean-cached-mutations";
import {
  CallerProps,
  ActionType,
  reducer,
  initState,
  effectFunctions,
  Props,
  cleanUpSyncedOfflineEntries,
} from "./with-subscriptions.utils";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  windowChangeUrl,
  ChangeUrlType,
  getLocation,
} from "../../utils/global-window";
import { MY_URL } from "../../utils/urls";
import { OnSyncedData } from "../../utils/sync-to-server.types";

export function WithSubscriptions(props: Props) {
  const { observable, children, bc } = props;
  const { data } = useOnExperiencesDeletedSubscription();
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);
  const {
    effects: { general: generalEffects },
    context: { connected: connectionStatus, onSyncData },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
  });

  useEffect(() => {
    dispatch({
      type: ActionType.EXPERIENCE_DELETED,
      data,
    });
  }, [data]);

  useEffect(() => {
    bc.addEventListener(StateValue.bcMessageKey, onBcMessage);
    document.addEventListener(StateValue.selfBcMessageKey, onBcMessage);

    const subscription = observable.subscribe({
      next({ type, ...payload }) {
        switch (type) {
          case EmitActionType.connectionChanged:
            {
              const {
                connected,
              } = payload as EmitActionConnectionChangedPayload;

              dispatch({
                type: ActionType.CONNECTION_CHANGED,
                connected,
              });
            }
            break;
        }
      },
    });

    return () => {
      cleanupWithSubscriptions(() => {
        bc.removeEventListener(StateValue.bcMessageKey, onBcMessage);
        document.removeEventListener(StateValue.selfBcMessageKey, onBcMessage);
        subscription.unsubscribe();
      });
    };
    /* eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(() => {
    cleanCachedMutations();
  });

  function onBcMessage(message: BroadcastMessage | BroadcastMessageSelf) {
    const selfMessage = message as BroadcastMessageSelf;

    // istanbul ignore else:
    if (selfMessage.detail) {
      message = selfMessage.detail;
    }

    const { type, payload } = message as BroadcastMessage;
    switch (type) {
      case BroadcastMessageType.experienceDeleted:
        // istanbul ignore else:
        if (getLocation().pathname.includes(MY_URL)) {
          windowChangeUrl(MY_URL, ChangeUrlType.replace);
        }
        break;

      case BroadcastMessageType.syncDone:
        const data = payload as OnSyncedData;
        const { pathname } = getLocation();

        // istanbul ignore else:
        if (data.onlineExperienceIdToOfflineEntriesMap && pathname === MY_URL) {
          cleanUpSyncedOfflineEntries(
            data.onlineExperienceIdToOfflineEntriesMap,
          );
        }

        dispatch({
          type: ActionType.ON_SYNC,
          data,
        });
        break;
    }
  }

  return (
    <WithSubscriptionsDispatchProvider value={{ withSubDispatch: dispatch }}>
      <WithSubscriptionProvider
        value={{
          connected: connectionStatus,
          onSyncData,
        }}
      >
        {children}
      </WithSubscriptionProvider>
    </WithSubscriptionsDispatchProvider>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return <WithSubscriptions {...props} />;
};
