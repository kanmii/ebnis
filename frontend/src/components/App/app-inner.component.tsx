/* istanbul ignore file */
import React, { lazy, Suspense } from "react";
import { ApolloProvider } from "@apollo/client";
import { EbnisAppProvider } from "./app.injectables";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { E2EWindowObject } from "../../utils/types";
import { restoreCacheOrPurgeStorage } from "../../apollo/setup";
import Loading from "../Loading/loading.component";
import WithSubscriptions from "../WithSubscriptions/with-subscriptions.component";
import {
  ROOT_URL,
  LOGIN_URL,
  MY_URL,
  EXPERIENCE_DETAIL_URL,
  SIGN_UP_URL,
} from "../../utils/urls";
import AuthenticationRequired from "../AuthenticationRequired/authentication-required.component";

const Login = lazy(() => import("../Login/login.component"));
const My = lazy(() => import("../My/my.component"));
const DetailExperience = lazy(
  () => import("../DetailExperience/detail-experience.component"),
);
const SignUp = lazy(() => import("../SignUp/sign-up.component"));

export function AppInner({ obj }: Props) {
  const { client, bc } = obj;

  return (
    <Router>
      <ApolloProvider client={client}>
        <EbnisAppProvider
          value={{
            restoreCacheOrPurgeStorage,
            ...window.____ebnis,
          }}
        >
          <Suspense fallback={<Loading />}>
            <WithSubscriptions bc={bc}>
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
            </WithSubscriptions>
          </Suspense>
        </EbnisAppProvider>
      </ApolloProvider>
    </Router>
  );
}

// istanbul ignore next:
export default AppInner;

interface Props {
  obj: E2EWindowObject;
}
