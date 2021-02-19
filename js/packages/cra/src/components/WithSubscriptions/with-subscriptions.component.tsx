import {
  BroadcastMessage,
  BroadcastMessageConnectionChangedPayload,
  BroadcastMessageSelf,
  BroadcastMessageType,
  OnSyncedData,
  StateValue,
} from "@eb/cm/src/utils/types";
import React, { useEffect, useReducer } from "react";
import { cleanCachedMutations } from "../../apollo/clean-cached-mutations";
import {
  ChangeUrlType,
  getLocation,
  windowChangeUrl,
} from "../../utils/global-window";
import { MY_URL } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  cleanupWithSubscriptions,
  WithSubscriptionProvider,
  WithSubscriptionsDispatchProvider,
} from "./with-subscriptions.injectables";
import {
  ActionType,
  CallerProps,
  cleanUpSyncedOfflineEntries,
  effectFunctions,
  initState,
  Props,
  reducer,
} from "./with-subscriptions.utils";

export function WithSubscriptions(props: Props) {
  const { children, bc } = props;
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);
  const {
    effects: { general: generalEffects },
    context: { connected: connectionStatus, onSyncData },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
  });

  useEffect(() => {
    bc.addEventListener(StateValue.bcMessageKey, onBcMessage);
    window.addEventListener(StateValue.selfBcMessageKey, onBcMessage);

    return () => {
      cleanupWithSubscriptions(() => {
        bc.removeEventListener(StateValue.bcMessageKey, onBcMessage);
        window.removeEventListener(StateValue.selfBcMessageKey, onBcMessage);
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

      case BroadcastMessageType.connectionChanged:
        {
          const {
            connected,
          } = payload as BroadcastMessageConnectionChangedPayload;

          dispatch({
            type: ActionType.CONNECTION_CHANGED,
            connected,
          });
        }
        break;

      case BroadcastMessageType.syncDone:
        {
          const data = payload as OnSyncedData;
          const { pathname } = getLocation();

          // istanbul ignore else:
          if (
            data.onlineExperienceIdToOfflineEntriesMap &&
            pathname === MY_URL
          ) {
            cleanUpSyncedOfflineEntries(
              data.onlineExperienceIdToOfflineEntriesMap,
            );
          }

          dispatch({
            type: ActionType.ON_SYNC,
            data,
          });
        }
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
