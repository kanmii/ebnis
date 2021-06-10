/* eslint-disable @typescript-eslint/no-explicit-any */
import { notificationCloseSelector } from "@eb/jsx/src/Notification";
import { LoginMutationVariables } from "@eb/shared/src/graphql/apollo-types/LoginMutation";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { manageUserAuthentication } from "@eb/shared/src/utils/manage-user-auth";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { Login } from "../components/Login/login.component";
import {
  emailErrorId,
  emailInputId,
  notificationId,
  passwordErrorId,
  passwordInputId,
  resetId,
  submitId,
} from "../components/Login/login.dom";
import {
  Action,
  ActionType,
  EffectArgs,
  effectFunctions,
  EffectState,
  initState,
  Props,
  reducer,
  StateMachine,
  SubmissionCommonErrors,
} from "../components/Login/login.utils";
import { fillField } from "../tests.utils";
import { AppPersistor } from "../utils/app-context";
import { windowChangeUrl } from "../utils/global-window";
import { scrollIntoView } from "../utils/scroll-into-view";
import { LoginMutationResult } from "../utils/user.gql.types";
import { errorClassName, warningClassName } from "../utils/utils.dom";

jest.mock("../components/Header/header.component", () => () => null);

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

jest.mock("@eb/shared/src/utils/connections");
const mockIsConnected = getIsConnected as jest.Mock;

jest.mock("../utils/global-window");
const mockWindowReplaceUrl = windowChangeUrl as jest.Mock;

jest.mock("@eb/shared/src/utils/manage-user-auth");
const mockManageUserAuth = manageUserAuthentication as jest.Mock;

const mockLoginFn = jest.fn();
const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

let stateMachineOnDispatch = null as unknown as StateMachine;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
  (stateMachineOnDispatch as any) = null;
});

describe("components", () => {
  it("reset/form errors/login success", async () => {
    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    expect(1).toBe(1);
    render(ui);

    // submit without completing any form input
    const submitEl = getSubmit();
    expect(mockScrollIntoView).not.toHaveBeenCalled();
    submitEl.click();

    let notificationEl = await waitFor(getNotification);
    // we get warning
    expect(notificationEl.classList).toContain(warningClassName);
    expect(mockScrollIntoView).toHaveBeenCalled();

    closeNotification(notificationEl);
    expect(getNotification()).toBeNull();

    const emailInput = getEmailInput();
    const invalidEmailVal = "a@b.";
    fillField(emailInput, invalidEmailVal);

    const passwordInput = getPasswordInput();
    const invalidPasswordVal = "pa";
    fillField(passwordInput, invalidPasswordVal);

    expect(getEmailErrorEl()).toBeNull();
    expect(getPasswordErrorEl()).toBeNull();

    submitEl.click();

    notificationEl = await waitFor(getNotification);
    // we get error
    expect(notificationEl.classList).toContain(errorClassName);
    expect(getEmailErrorEl()).not.toBeNull();
    expect(getPasswordErrorEl()).not.toBeNull();

    // clicking reset clears errors and warnings
    getReset().click();
    expect(getNotification()).toBeNull();
    expect(getEmailErrorEl()).toBeNull();
    expect(getPasswordErrorEl()).toBeNull();

    const validEmailVal = "a@b.com";
    const validPasswordVal = "123456";
    fillField(emailInput, validEmailVal);
    fillField(passwordInput, validPasswordVal);

    mockLoginFn.mockResolvedValueOnce({
      data: {
        login: {
          __typename: "UserSuccess",
          user: {
            email: "",
          },
        },
      },
    } as LoginMutationResult);

    submitEl.click();

    await waitFor(() => true);

    const calls = mockLoginFn.mock.calls[0][0]
      .variables as LoginMutationVariables;

    expect(calls.input).toEqual({
      email: validEmailVal,
      password: validPasswordVal,
    });

    expect(mockPersistFn).toHaveBeenCalled();
    expect(mockWindowReplaceUrl).toHaveBeenCalled();
    expect(mockManageUserAuth).toHaveBeenCalled();
  });
});

function completeFormInStateMachine(state?: StateMachine) {
  if (!state) {
    state = initState();
  }

  state = reducer(state, {
    type: ActionType.FORM_CHANGED,
    value: "a@b.com",
    fieldName: "email",
  });

  return reducer(state, {
    type: ActionType.FORM_CHANGED,
    value: "a@b.com",
    fieldName: "password",
  });
}

async function reducerSubmissionHelper() {
  const state = completeFormInStateMachine();
  stateMachineOnDispatch = reducer(state, {
    type: ActionType.SUBMISSION,
  });

  expect(
    (stateMachineOnDispatch.states.submission as SubmissionCommonErrors)
      .commonErrors,
  ).toBeUndefined();

  const { key, ownArgs } = getEffects(stateMachineOnDispatch)[0];
  const func = effectFunctions[key];
  const props = { login: mockLoginFn } as unknown as Props;
  const effectArgs = {
    dispatch: mockDispatch as any,
  } as EffectArgs;

  await func(ownArgs as any, props, effectArgs);
}

describe("reducer", () => {
  test("submission/not connected", async () => {
    mockIsConnected.mockReturnValue(null);

    await reducerSubmissionHelper();

    expect(
      (stateMachineOnDispatch.states.submission as SubmissionCommonErrors)
        .commonErrors.context.errors,
    ).toBeDefined();

    //
  });

  test("submission/invalid server response", async () => {
    mockIsConnected.mockReturnValue(true);
    mockLoginFn.mockResolvedValue({});
    await reducerSubmissionHelper();

    expect(
      (stateMachineOnDispatch.states.submission as SubmissionCommonErrors)
        .commonErrors.context.errors,
    ).toBeDefined();

    //
  });

  test("submission/server login error", async () => {
    mockIsConnected.mockReturnValue(true);
    mockLoginFn.mockResolvedValue({
      data: {
        login: {
          __typename: "LoginError",
          error: "a",
        },
      },
    } as LoginMutationResult);

    await reducerSubmissionHelper();

    expect(
      (stateMachineOnDispatch.states.submission as SubmissionCommonErrors)
        .commonErrors.context.errors,
    ).toBeDefined();

    //
  });

  test("submission/exception", async () => {
    mockIsConnected.mockReturnValue(true);
    mockLoginFn.mockRejectedValue(new Error("a"));
    await reducerSubmissionHelper();

    expect(
      (stateMachineOnDispatch.states.submission as SubmissionCommonErrors)
        .commonErrors.context.errors,
    ).toBeDefined();
  });
});

function mockDispatch(action: Action) {
  stateMachineOnDispatch = reducer(stateMachineOnDispatch, action);
}

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const LoginP = Login as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  return {
    ui: <LoginP {...props} login={mockLoginFn} persistor={persistor} />,
  };
}

function getEmailInput() {
  return document.getElementById(emailInputId) as HTMLInputElement;
}

function getPasswordInput() {
  return document.getElementById(passwordInputId) as HTMLInputElement;
}

function getSubmit() {
  return document.getElementById(submitId) as HTMLElement;
}

function getNotification() {
  return document.getElementById(notificationId) as HTMLElement;
}

function closeNotification(notificationEl: HTMLElement) {
  (
    notificationEl
      .getElementsByClassName(notificationCloseSelector)
      .item(0) as HTMLElement
  ).click();
}

function getReset() {
  return document.getElementById(resetId) as HTMLElement;
}

function getPasswordErrorEl() {
  return document.getElementById(passwordErrorId) as HTMLElement;
}

function getEmailErrorEl() {
  return document.getElementById(emailErrorId) as HTMLElement;
}

function getEffects(state: StateMachine) {
  return (state.effects.general as EffectState).hasEffects.context.effects;
}
