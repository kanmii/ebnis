import React, { useEffect, useReducer } from "react";
import { EmitActionType, onBcMessage } from "../../utils/observable-manager";
import {
  cleanupWithSubscriptions,
  WithSubscriptionProvider,
  useOnExperiencesDeletedSubscription,
} from "./with-subscriptions.injectables";
import {
  EmitActionConnectionChangedPayload,
  StateValue,
} from "../../utils/types";
import { cleanCachedMutations } from "../../apollo/clean-cached-mutations";
import {
  CallerProps,
  ActionType,
  reducer,
  initState,
  effectFunctions,
  Props,
} from "./with-subscriptions.utils";
import { useRunEffects } from "../../utils/use-run-effects";

export function WithSubscriptions(props: Props) {
  const { observable, children, bc } = props;
  const { data } = useOnExperiencesDeletedSubscription();
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);
  const {
    effects: { general: generalEffects },
    states: { connected: connectionStatus },
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
    bc.addEventListener("message", onBcMessage);
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
        bc.removeEventListener("message", onBcMessage);
        document.removeEventListener(StateValue.selfBcMessageKey, onBcMessage);
        subscription.unsubscribe();
      });
    };
    /* eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(() => {
    cleanCachedMutations();
  });

  return (
    <WithSubscriptionProvider
      value={{
        connected: connectionStatus,
      }}
    >
      {children}
    </WithSubscriptionProvider>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return <WithSubscriptions {...props} />;
};
