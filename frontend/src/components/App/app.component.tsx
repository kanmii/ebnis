import React, { useState, useEffect } from "react";
import {
  buildClientCache,
  restoreCacheOrPurgeStorage,
} from "../../apollo/setup";
import { E2EWindowObject } from "../../utils/types";
import AppInner from "./app-inner.component";
import Loading from "../Loading/loading.component";

export function App() {
  const obj = buildClientCache({
    appHydrated: true,
  }) as E2EWindowObject;

  const [state, setState] = useState<State>({
    renderChildren: false,
    connected: false,
  });

  useEffect(() => {
    const { cache, persistor } = obj;

    (async function () {
      // istanbul ignore next:
      if (cache && restoreCacheOrPurgeStorage) {
        try {
          await restoreCacheOrPurgeStorage(persistor);
          setState((oldState) => {
            return { ...oldState, renderChildren: true };
          });
        } catch (error) {
          setState((oldState) => {
            return { ...oldState, renderChildren: true };
          });
        }
      }
    })();

    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, []);

  return state.renderChildren ? <AppInner obj={obj} /> : <Loading />;
}

// istanbul ignore next:
export default App;

interface State {
  readonly renderChildren: boolean;
  readonly connected: boolean;
}
