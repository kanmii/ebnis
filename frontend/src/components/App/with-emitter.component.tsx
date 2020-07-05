import React, { useState, PropsWithChildren, useEffect } from "react";
import { Observable } from "zen-observable-ts";
import { EmitActionType } from "../../utils/observable-manager";
import {
  cleanupObservableSubscription,
  WithEmitterProvider,
} from "./app.injectables";
import {
  EmitActionConnectionChangedPayload,
  EmitPayload,
} from "../../utils/types";
import { manageCachedMutations } from "../../apollo/managed-cached-mutations";

export function WithEmitter(
  props: PropsWithChildren<{ observable: Observable<EmitPayload> }>,
) {
  const { observable, children } = props;
  const [state, setState] = useState(false);

  useEffect(() => {
    manageCachedMutations();
  });

  useEffect(() => {
    const subscription = observable.subscribe({
      next({ type, ...payload }) {
        switch (type) {
          case EmitActionType.connectionChanged:
            {
              const {
                connected,
              } = payload as EmitActionConnectionChangedPayload;
              setState(connected);
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

  return (
    <WithEmitterProvider
      value={{
        connected: state,
      }}
    >
      {children}
    </WithEmitterProvider>
  );
}

// istanbul ignore next:
export default WithEmitter;
