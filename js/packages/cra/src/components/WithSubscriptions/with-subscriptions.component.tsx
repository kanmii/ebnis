import { cleanCachedMutations } from "@eb/shared/src/apollo/clean-cached-mutations";
import { ChangeUrlType } from "@eb/shared/src/global-window";
import { deleteObjectKey } from "@eb/shared/src/utils";
import {
  BroadcastMessageType,
  EmitAction,
  EmitActionConnectionChangedPayload,
  EmitActionType,
  OnSyncedData,
  StateValue,
} from "@eb/shared/src/utils/types";
import React, { useEffect, useReducer } from "react";
import { MY_URL } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  cleanupWithSubscriptions,
  WithSubscriptionProvider,
  WithSubscriptionsDispatchProvider,
} from "./with-subscriptions.injectables";
import {
  ActionType,
  cleanUpSyncedOfflineEntries,
  effectFunctions,
  initState,
  Props,
  reducer,
} from "./with-subscriptions.utils";

export function WithSubscriptions(props: Props) {
  const { children, bcBroadcaster, observable } = props;
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);
  const {
    effects: { general: generalEffects },
    context: { connected: connectionStatus, onSyncData },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, {
    dispatch,
  });

  useEffect(() => {
    const subscription = observable.subscribe({
      next(data) {
        onBcMessage(data);
      },
    });

    bcBroadcaster.addEventListener(StateValue.bcMessageKey, onBcMessage);

    return () => {
      cleanupWithSubscriptions(() => {
        bcBroadcaster.removeEventListener(StateValue.bcMessageKey, onBcMessage);
        subscription.unsubscribe();
        deleteObjectKey(
          window.____ebnis,
          "withSubscriptionsComponentInjections",
        );
      });
    };
    /* eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(() => {
    cleanCachedMutations();
  });

  function onBcMessage(message: EmitAction) {
    const { windowChangeUrlInject, getLocationInject } =
      window.____ebnis.withSubscriptionsComponentInjections;

    const { type, ...payload } = message;

    switch (type) {
      case EmitActionType.connectionChanged:
        {
          const { connected } = payload as EmitActionConnectionChangedPayload;

          dispatch({
            type: ActionType.CONNECTION_CHANGED,
            connected,
          });
        }
        break;

      case BroadcastMessageType.experienceDeleted:
        // istanbul ignore else:
        if (getLocationInject().pathname.includes(MY_URL)) {
          windowChangeUrlInject(MY_URL, ChangeUrlType.replace);
        }
        break;

      case BroadcastMessageType.syncDone:
        {
          const data = payload as OnSyncedData;
          const { pathname } = getLocationInject();

          // istanbul ignore else:
          if (
            data.onlineExperienceIdToOfflineEntriesMap &&
            pathname === MY_URL
          ) {
            // in MY_URL view, we are not showing entries.
            // TODO: what if we decide to show entries on MY_URL view?
            // what if we add additional routes where sync could have occurred
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
