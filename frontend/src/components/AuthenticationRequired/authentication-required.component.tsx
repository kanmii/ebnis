import React, { PropsWithChildren } from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";
import { getUser } from "../../utils/manage-user-auth";
import {
  LOGIN_URL, //
} from "../../utils/urls";

export function AuthenticationRequired(props: Props) {
  const {
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars*/
    component,
    ...rest
  } = props;
  const user = getUser();

  if (user) {
    return <Route {...props} />;
  }

  const {
    location, //
  } = rest;

  return (
    <Route {...rest}>
      <Redirect
        to={{
          pathname: LOGIN_URL,
          state: { from: location },
        }}
      />
    </Route>
  );
}

export default AuthenticationRequired;

export type Props = PropsWithChildren<RouteProps>;
