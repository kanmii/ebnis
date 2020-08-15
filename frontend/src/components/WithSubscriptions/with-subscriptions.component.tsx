import React, { useEffect, useReducer } from "react";
import { EmitActionType } from "../../utils/observable-manager";
import {
  cleanupObservableSubscription,
  WithEmitterProvider,
  useOnExperiencesDeletedSubscription,
} from "./with-subscriptions.injectables";
import { EmitActionConnectionChangedPayload } from "../../utils/types";
import { manageCachedMutations } from "../../apollo/managed-cached-mutations";
import {
  CallerProps,
  onMessage,
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
    bc.addEventListener("message", onMessage);

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
      cleanupObservableSubscription(subscription);
    };
    /* eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(() => {
    manageCachedMutations();
  });

  return (
    <WithEmitterProvider
      value={{
        connected: connectionStatus,
      }}
    >
      {children}
    </WithEmitterProvider>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return <WithSubscriptions {...props} />;
};
