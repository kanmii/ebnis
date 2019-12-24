import React, { useContext, useEffect, useRef, useReducer } from "react";
import { EbnisAppContext } from "../../context";
import { Loading } from "../Loading/loading";
import {
  ILayoutContextHeaderValue,
  reducer,
  LayoutActionType,
  Props,
  initState,
} from "./layout.utils";
import {
  EmitActionType,
  ConnectionChangedPayload,
} from "../../state/observable-manager";
import { ZenObservable } from "zen-observable-ts";
import { getOfflineItemsCount } from "../../state/offline-resolvers";
import {
  LayoutProvider,
  LayoutUnchangingProvider,
  LayoutExperienceProvider,
  LocationProvider,
} from "./layout-providers";
import { preFetchExperiences } from "./pre-fetch-experiences";
import { useUser } from "../use-user";
import { isConnected } from "../../state/connections";
import { WindowLocation, NavigateFn } from "@reach/router";
import { SidebarSemantic } from "../Sidebar/sidebar-semantic.component";

export function Layout(props: Props) {
  const { children } = props;
  const location = props.location as WindowLocation;
  const navigate = props.navigate as NavigateFn;

  const {
    cache,
    restoreCacheOrPurgeStorage,
    client,
    persistor,
    connectionStatus,
    observable,
  } = useContext(EbnisAppContext);

  const subscriptionRef = useRef<ZenObservable.Subscription | null>(null);
  const user = useUser();

  const [stateMachine, dispatch] = useReducer(
    reducer,
    { connectionStatus, user },
    initState,
  );

  const {
    states: {
      prefetchExperiences,
      sidebar: { value: sidebarValue },
    },

    context: { unsavedCount, renderChildren, hasConnection: hasConnection },
  } = stateMachine;

  useEffect(() => {
    subscriptionRef.current = observable.subscribe({
      next({ type, ...payload }) {
        if (type === EmitActionType.connectionChanged) {
          const {
            hasConnection: isConnected,
          } = payload as ConnectionChangedPayload;

          getOfflineItemsCount(client).then(newUnsavedCount => {
            dispatch({
              type: LayoutActionType.CONNECTION_CHANGED,
              unsavedCount: newUnsavedCount,
              isConnected,
            });
          });
        }
      },
    });

    return () => {
      (subscriptionRef.current as ZenObservable.Subscription).unsubscribe();
    };
  }, [client, observable]);

  useEffect(
    function persistCacheEffect() {
      if (!(cache && restoreCacheOrPurgeStorage)) {
        return;
      }

      (async function doPersistCache() {
        try {
          await restoreCacheOrPurgeStorage(persistor);
        } catch (error) {}

        dispatch({
          type: LayoutActionType.CACHE_PERSISTED,
          unsavedCount: await getOfflineItemsCount(client),
          hasConnection: !!isConnected(),
        });
      })();
    },
    [restoreCacheOrPurgeStorage, dispatch, persistor, client, cache],
  );

  useEffect(() => {
    if (prefetchExperiences.value !== "fetch-now") {
      return;
    }

    const {
      context: { ids },
    } = prefetchExperiences;

    setTimeout(() => {
      preFetchExperiences({
        ids,
        client,
        cache,
        onDone: () => {
          dispatch({
            type: LayoutActionType.DONE_FETCHING_EXPERIENCES,
          });
        },
      });
    }, 500);
  }, [prefetchExperiences, cache, client]);

  // this will be true if we are server rendering in gatsby build
  if (!(cache && restoreCacheOrPurgeStorage && client)) {
    return (
      <LayoutProvider value={{ unsavedCount: 0 } as ILayoutContextHeaderValue}>
        {children}
      </LayoutProvider>
    );
  }

  return renderChildren ? (
    <LayoutUnchangingProvider value={{ layoutDispatch: dispatch }}>
      <LayoutExperienceProvider
        value={{
          fetchExperience: prefetchExperiences.value,
        }}
      >
        <LayoutProvider
          value={
            {
              unsavedCount,
              hasConnection: hasConnection,
              sidebarVisible: sidebarValue === "opened",
            } as ILayoutContextHeaderValue
          }
        >
          <LocationProvider value={{ ...location, navigate }}>
            <SidebarSemantic>{children}</SidebarSemantic>
          </LocationProvider>
        </LayoutProvider>
      </LayoutExperienceProvider>
    </LayoutUnchangingProvider>
  ) : (
    <Loading />
  );
}
