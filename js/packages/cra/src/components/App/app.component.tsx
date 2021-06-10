import {
  makeApolloClient,
  restoreCacheOrPurgeStorage,
} from "@eb/shared/src/client";
import React, { useEffect, useState } from "react";
import Loading from "../Loading/loading.component";
import AppInner from "./app-inner.component";

export function App() {
  const obj = makeApolloClient({});

  const [state, setState] = useState<State>({
    renderChildren: false,
  });

  useEffect(() => {
    const { cache } = obj;

    (async function () {
      // istanbul ignore next:
      if (cache) {
        try {
          await restoreCacheOrPurgeStorage();
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
}
