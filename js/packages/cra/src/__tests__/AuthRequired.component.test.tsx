/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, render } from "@testing-library/react";
import React, { ComponentType } from "react";
import {
  AuthenticationRequired,
  Props,
} from "../components/AuthenticationRequired/authentication-required.component";
import { getUser } from "../utils/manage-user-auth";
import { LOGIN_URL } from "../utils/urls";

jest.mock("../utils/manage-user-auth");
const mockGetUser = getUser as jest.Mock;

const mockRedirectComponentId = "rr";
jest.mock("react-router-dom", () => ({
  Route: ({ children, component: Component }: any) => {
    return Component ? <Component /> : children;
  },
  Redirect: (props: any) => {
    return (
      <div id={mockRedirectComponentId} data-data={JSON.stringify(props)} />
    );
  },
}));

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

const componentId = "zz";
const location = "ll";

it("renders authenticated route", () => {
  // user is logged in
  mockGetUser.mockReturnValue({});

  const { ui } = makeComp();
  render(ui);
  expect(document.getElementById(componentId)).not.toBeNull();
  expect(document.getElementById(mockRedirectComponentId)).toBeNull();
});

it("redirects unauthenticated user", () => {
  // user is not logged in
  mockGetUser.mockReturnValue(null);

  const { ui } = makeComp();
  render(ui);
  expect(document.getElementById(componentId)).toBeNull();
  const el = document.getElementById(mockRedirectComponentId) as HTMLElement;
  expect(el).not.toBeNull();
  const data = JSON.parse(el.dataset.data as any);
  expect(data).toEqual({
    to: {
      pathname: LOGIN_URL,
      state: {
        from: location,
      },
    },
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const AuthenticationRequiredP = AuthenticationRequired as ComponentType<
  Partial<Props>
>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  return {
    ui: (
      <AuthenticationRequiredP
        {...props}
        component={Component}
        location={location as any}
      />
    ),
  };
}

function Component() {
  return <div id={componentId} />;
}
