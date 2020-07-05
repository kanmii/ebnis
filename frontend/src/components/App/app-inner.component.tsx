/* istanbul ignore file */
import React, { lazy, Suspense } from "react";
import { ApolloProvider } from "@apollo/react-hooks";
import { EbnisAppProvider } from "./app.injectables";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { E2EWindowObject } from "../../utils/types";
import { restoreCacheOrPurgeStorage } from "../../apollo/setup";
import Loading from "../Loading/loading.component";
import WithEmitter from "./with-emitter.component";
import {
  ROOT_URL,
  LOGIN_URL,
  MY_URL,
  EXPERIENCE_DETAIL_URL,
  SIGN_UP_URL,
} from "../../utils/urls";
import AuthenticationRequired from "../AuthenticationRequired/authentication-required.component";

const Login = lazy(() => import("../Login/login.component"));
const My = lazy(() => import("../My/my.index"));
const DetailExperience = lazy(() =>
  import("../DetailExperience/detail-experience.index"),
);
const SignUp = lazy(() => import("../SignUp/sign-up.component"));

export function AppInner({ obj }: { obj: E2EWindowObject }) {
  const { client, cache, persistor, observable } = obj;

  return (
    <Router>
      <ApolloProvider client={client}>
        <EbnisAppProvider
          value={{
            client,
            cache,
            restoreCacheOrPurgeStorage,
            persistor,
            ...window.____ebnis,
          }}
        >
          <Suspense fallback={<Loading />}>
            <WithEmitter observable={observable}>
              <Switch>
                <AuthenticationRequired
                  exact={true}
                  path={MY_URL}
                  component={My}
                />

                <AuthenticationRequired
                  exact={true}
                  path={EXPERIENCE_DETAIL_URL}
                  component={DetailExperience}
                />

                <Route exact={true} path={ROOT_URL} component={Login} />

                <Route exact={true} path={LOGIN_URL} component={Login} />

                <Route exact={true} path={SIGN_UP_URL} component={SignUp} />

                <Route component={Login} />
              </Switch>
            </WithEmitter>
          </Suspense>
        </EbnisAppProvider>
      </ApolloProvider>
    </Router>
  );
}

// istanbul ignore next:
export default AppInner;
