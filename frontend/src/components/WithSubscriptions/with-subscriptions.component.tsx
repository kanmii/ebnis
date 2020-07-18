import React, { useState, PropsWithChildren, useEffect } from "react";
import { Observable } from "zen-observable-ts";
import { EmitActionType } from "../../utils/observable-manager";
import {
  cleanupObservableSubscription,
  WithEmitterProvider,
} from "./with-subscriptions.injectables";
import {
  EmitActionConnectionChangedPayload,
  EmitPayload,
  BChannel,
  BroadcastMessage,
} from "../../utils/types";
import { manageCachedMutations } from "../../apollo/managed-cached-mutations";
import { useOnExperiencesDeletedSubscription } from "../../utils/experience.gql.types";

export function WithSubscriptions(props: PropsWithChildren<CallerProps>) {
  const { observable, children, bc } = props;
  const [state, setState] = useState(false);
  const { data } = useOnExperiencesDeletedSubscription();

  useEffect(() => {
    function onStorageChanged(event: StorageEvent) {}

    window.addEventListener("storage", onStorageChanged);

    function onMessage({ type, payload }: BroadcastMessage) {
      //
    }

    bc.addEventListener("message", onMessage);

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
      window.removeEventListener("storage", onStorageChanged);
    };
    /* eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(() => {
    manageCachedMutations();
  });

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
export default WithSubscriptions;

interface CallerProps {
  observable: Observable<EmitPayload>;
  bc: BChannel;
}
