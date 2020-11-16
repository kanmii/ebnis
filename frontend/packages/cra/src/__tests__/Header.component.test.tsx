/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { Header } from "../components/Header/header.component";
import { useLocation } from "react-router-dom";
import { MY_URL } from "../utils/urls";
import { domPrefix } from "../components/Header/header.dom";

jest.mock("react-router-dom", () => ({
  Link: ({ className = "", to, children }: any) => {
    to = typeof to === "string" ? to : JSON.stringify(to);

    return (
      <a className={className} href={to}>
        {" "}
        {children}{" "}
      </a>
    );
  },
  useLocation: jest.fn(),
}));

const mockUseLocation = useLocation as jest.Mock;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

const logoLinkClassName = "js-logo-link";
const logoTextClassName = "js-logo-text";
const connectedClassName = "app-header--connected";
const unConnectedClassName = "app-header--unconnected";

it("renders in non-My route/connected", () => {
  mockUseLocation.mockReturnValue({
    pathname: "",
  });

  const { ui } = makeComp({
    props: {
      connected: true,
    },
  });
  render(ui);
  const headerEl = document.getElementById(domPrefix) as HTMLElement;
  expect(headerEl.getElementsByClassName(logoLinkClassName).length).toBe(1);
  expect(headerEl.getElementsByClassName(logoTextClassName).length).toBe(0);
  expect(headerEl.classList).toContain(connectedClassName);
  expect(headerEl.classList).not.toContain(unConnectedClassName);
});

it("renders in My route", () => {
  mockUseLocation.mockReturnValue({
    pathname: MY_URL,
  });

  const { ui } = makeComp();
  render(ui);
  const headerEl = document.getElementById(domPrefix) as HTMLElement;
  expect(headerEl.getElementsByClassName(logoLinkClassName).length).toBe(0);
  expect(headerEl.getElementsByClassName(logoTextClassName).length).toBe(1);
  expect(headerEl.classList).not.toContain(connectedClassName);
  expect(headerEl.classList).toContain(unConnectedClassName);
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const HeaderP = Header as ComponentType<Partial<{}>>;

function makeComp({ props = {} }: { props?: Partial<{}> } = {}) {
  return {
    ui: <HeaderP {...props} />,
  };
}
