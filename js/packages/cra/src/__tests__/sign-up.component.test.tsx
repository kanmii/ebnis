/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { SignUp } from "../components/SignUp/sign-up.component";
import {
  emailInputId,
  nameInputId,
  notificationId,
  passwordConfirmationInputId,
  passwordInputId,
  resetId,
  submitId,
} from "../components/SignUp/sign-up.dom";
import { Props } from "../components/SignUp/sign-up.utils";
import { fillField } from "../tests.utils";
import { AppPersistor } from "../utils/app-context";
import { windowChangeUrl } from "../utils/global-window";
import { manageUserAuthentication } from "../utils/manage-user-auth";
import { scrollIntoView } from "../utils/scroll-into-view";
import { RegisterUserMutationResult } from "../utils/user.gql.types";
import {
  errorClassName,
  formCtrlErrorClassName,
  formFieldErrorClass,
  outerFieldClassName,
  warningClassName,
} from "../utils/utils.dom";

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;

jest.mock("../utils/manage-user-auth");
const mockManageUserAuthentication = manageUserAuthentication as jest.Mock;

jest.mock("../components/Header/header.component", () => {
  return () => null;
});

const mockPersistFn = jest.fn();
const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const mockRegisterUser = jest.fn();

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

it("reset/form errors", async () => {
  const { ui } = makeComp();
  render(ui);

  const nameInputEl = getNameInputEl();
  expect(nameInputEl.value).toEqual("");

  const passwordInputEl = getPasswordInputEl();
  expect(passwordInputEl.value).toEqual("");

  const passwordConfirmationInputEl = getPasswordConfirmationInputEl();
  expect(passwordConfirmationInputEl.value).toEqual("");

  const emailInputEl = getEmailInputEl();
  expect(emailInputEl.value).toEqual("");

  expect(getNotificationEl()).toBeNull();

  expect(mockScrollIntoView).not.toBeCalled();

  const submitEl = getSubmitEl();
  submitEl.click();

  let notificationEl = await waitFor(getNotificationEl);
  expect(notificationEl.classList).toContain(warningClassName);
  expect(mockScrollIntoView).toHaveBeenCalled();
  mockScrollIntoView.mockReset();

  (document.getElementById(resetId) as HTMLElement).click();
  expect(getNotificationEl()).toBeNull();

  const invalidNameVal = "a";
  const invalidEmailVal = "aa";
  const invalidPasswordVal = "aa";
  const invalidPasswordConfirmationVal = "ab";

  fillField(nameInputEl, invalidNameVal);
  fillField(emailInputEl, invalidEmailVal);
  fillField(passwordInputEl, invalidPasswordVal);
  fillField(passwordConfirmationInputEl, invalidPasswordConfirmationVal);

  const nameFieldEl = getInputElParentField(nameInputEl);
  const emailFieldEl = getInputElParentField(emailInputEl);
  const passwordFieldEl = getInputElParentField(passwordInputEl);
  const passwordConfirmationFieldEl = getInputElParentField(
    passwordConfirmationInputEl,
  );

  expect(nameFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(nameFieldEl)).toBeNull();
  expect(emailFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(emailFieldEl)).toBeNull();
  expect(passwordFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(passwordFieldEl)).toBeNull();
  expect(passwordConfirmationFieldEl.classList).not.toContain(
    formFieldErrorClass,
  );
  expect(getErrorEl(passwordConfirmationFieldEl)).toBeNull();

  expect(mockScrollIntoView).not.toBeCalled();

  submitEl.click();
  notificationEl = await waitFor(getNotificationEl);
  expect(notificationEl.classList).toContain(errorClassName);
  expect(mockScrollIntoView).toBeCalled();

  expect(nameFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(nameFieldEl)).not.toBeNull();

  expect(emailFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(emailFieldEl)).not.toBeNull();

  expect(passwordFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(passwordFieldEl)).not.toBeNull();

  expect(passwordConfirmationFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(passwordConfirmationFieldEl)).not.toBeNull();

  closeNotification(notificationEl);
  expect(getNotificationEl()).toBeNull();

  // input control errors should not go away if error notification is closed
  expect(getErrorEl(nameFieldEl)).not.toBeNull();
  expect(getErrorEl(emailFieldEl)).not.toBeNull();
  expect(getErrorEl(passwordFieldEl)).not.toBeNull();
  expect(getErrorEl(passwordConfirmationFieldEl)).not.toBeNull();

  const validNameVal = "abcde";
  const validEmailVal = "a@b.com";
  const validPassword = "abcde123";

  fillField(nameInputEl, validNameVal);
  fillField(emailInputEl, validEmailVal);
  fillField(passwordInputEl, validPassword);
  fillField(passwordConfirmationInputEl, validPassword);

  const mockRegisterUser1 = {} as RegisterUserMutationResult;
  mockRegisterUser.mockResolvedValue(mockRegisterUser1);

  submitEl.click();
  await waitFor(() => true);
  notificationEl = getNotificationEl();
  closeNotification(notificationEl);
  expect(getNotificationEl()).toBeNull();

  const mockRegisterUser2 = new Error("a");
  mockRegisterUser.mockRejectedValue(mockRegisterUser2);

  submitEl.click();
  await waitFor(() => true);
  notificationEl = getNotificationEl();
  closeNotification(notificationEl);
  expect(getNotificationEl()).toBeNull();

  expect(nameFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(nameFieldEl)).toBeNull();
  expect(emailFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(emailFieldEl)).toBeNull();
  expect(passwordFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(passwordFieldEl)).toBeNull();
  expect(passwordConfirmationFieldEl.classList).not.toContain(
    formFieldErrorClass,
  );
  expect(getErrorEl(passwordConfirmationFieldEl)).toBeNull();

  const mockRegisterUser3 = {
    data: {
      registerUser: {
        __typename: "RegisterUserErrors",
        errors: {
          email: "a",
          password: "b",
          passwordConfirmation: "c",
        },
      },
    },
  } as RegisterUserMutationResult;
  mockRegisterUser.mockResolvedValue(mockRegisterUser3);

  submitEl.click();
  await waitFor(() => true);
  notificationEl = getNotificationEl();

  expect(nameFieldEl.classList).not.toContain(formFieldErrorClass);
  expect(getErrorEl(nameFieldEl)).toBeNull();
  expect(emailFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(emailFieldEl)).not.toBeNull();
  expect(passwordFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(passwordFieldEl)).not.toBeNull();
  expect(passwordConfirmationFieldEl.classList).toContain(formFieldErrorClass);
  expect(getErrorEl(passwordConfirmationFieldEl)).not.toBeNull();

  closeNotification(notificationEl);
  expect(getNotificationEl()).toBeNull();

  const user = {};
  const mockRegisterUser4 = {
    data: {
      registerUser: {
        __typename: "UserSuccess",
        user,
      },
    },
  } as RegisterUserMutationResult;
  mockRegisterUser.mockResolvedValue(mockRegisterUser4);

  expect(mockManageUserAuthentication).not.toHaveBeenCalled();
  expect(mockPersistFn).not.toHaveBeenCalled();
  expect(mockWindowChangeUrl).not.toHaveBeenCalled();

  submitEl.click();
  await waitFor(() => true);

  expect(mockManageUserAuthentication).toHaveBeenCalledWith(user);
  expect(mockPersistFn).toHaveBeenCalled();
  expect(mockWindowChangeUrl).toHaveBeenCalled();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const SignUpP = SignUp as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  return {
    ui: (
      <SignUpP
        {...props}
        persistor={persistor}
        registerUser={mockRegisterUser}
      />
    ),
  };
}

function getNameInputEl() {
  return document.getElementById(nameInputId) as HTMLInputElement;
}

function getPasswordInputEl() {
  return document.getElementById(passwordInputId) as HTMLInputElement;
}

function getPasswordConfirmationInputEl() {
  return document.getElementById(
    passwordConfirmationInputId,
  ) as HTMLInputElement;
}

function getEmailInputEl() {
  return document.getElementById(emailInputId) as HTMLInputElement;
}

function getSubmitEl() {
  return document.getElementById(submitId) as HTMLElement;
}

function closeNotification(notificationEl: HTMLElement) {
  (notificationEl
    .getElementsByClassName("delete")
    .item(0) as HTMLElement).click();
}

function getNotificationEl() {
  return document.getElementById(notificationId) as HTMLElement;
}

function getInputElParentField(el: HTMLElement) {
  return el.closest(`.${outerFieldClassName}`) as HTMLElement;
}

function getErrorEl(fieldEl: HTMLElement) {
  return fieldEl
    .getElementsByClassName(formCtrlErrorClassName)
    .item(0) as HTMLElement;
}
