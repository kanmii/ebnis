import { Button } from "@eb/jsx/src/Button";
import Input from "@eb/jsx/src/Input";
import { Notification } from "@eb/jsx/src/Notification";
import { setUpRoutePage } from "@eb/shared/src/global-window";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { useContext, useEffect, useReducer } from "react";
import { FieldError } from "../../utils/common-errors";
import { EbnisAppContext } from "../../utils/react-app-context";
import { SIGN_UP_URL } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import { useLoginMutation } from "../../utils/user.gql.types";
import { errorClassName, warningClassName } from "../../utils/utils.dom";
import FormCtrlError from "../FormCtrlError/form-ctrl-error.component";
import Header from "../Header/header.component";
import {
  emailErrorId,
  emailInputId,
  LOGIN_PAGE_TITLE,
  notificationId,
  passwordErrorId,
  passwordInputId,
  resetId,
  submitId,
} from "./login.dom";
import {
  ActionType,
  CallerProps,
  effectFunctions,
  initState,
  Props,
  reducer,
  StateValue,
} from "./login.utils";

export function Login(props: Props) {
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);

  const {
    states: {
      submission: submissionState,
      form: {
        fields: { email: emailState, password: passwordState },
      },
    },
    effects: { general: generalEffects },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  useEffect(() => {
    setUpRoutePage({
      title: LOGIN_PAGE_TITLE,
      // rootClassName: "login-component",
    });
  }, []);

  let emailValue = "";
  let emailErrors: null | FieldError = null;

  if (emailState.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = emailState.states.changed;

    emailValue = formValue;

    if (states.value === StateValue.invalid) {
      emailErrors = states.invalid.context.errors;
    }
  }

  let passwordValue = "";
  let passwordErrors: null | FieldError = null;

  if (passwordState.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = passwordState.states.changed;

    passwordValue = formValue;

    if (states.value === StateValue.invalid) {
      passwordErrors = states.invalid.context.errors;
    }
  }

  let warningText = "";

  if (submissionState.value === StateValue.warning) {
    warningText = submissionState.warning.context.warning;
  }

  let errorText = "";
  if (submissionState.value === StateValue.commonErrors) {
    errorText = submissionState.commonErrors.context.errors;
  }

  return (
    <div className="eb-auth-form">
      <Header />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({
            type: ActionType.SUBMISSION,
          });
        }}
        className="form"
        style={{
          maxWidth: "400px",
        }}
      >
        <div className="form__caption">Login with email</div>

        {(warningText || errorText) && (
          <Notification
            type={
              warningText
                ? ComponentColorType.is_warning
                : ComponentColorType.is_danger
            }
            id={notificationId}
            className={cn(
              warningText ? warningClassName : errorClassName,
              "!mb-4",
            )}
            close={{
              onClose: () => {
                dispatch({
                  type: ActionType.CLOSE_SUBMIT_NOTIFICATION,
                });
              },
            }}
          >
            {warningText || errorText}
          </Notification>
        )}

        <div className="field outer_field">
          <label htmlFor={emailInputId} className="form__label">
            Email
          </label>

          <div className="control">
            <Input
              isRounded
              type="text"
              id={emailInputId}
              value={emailValue}
              autoComplete="off"
              onChange={(e) => {
                const node = e.currentTarget;
                dispatch({
                  type: ActionType.FORM_CHANGED,
                  value: node.value,
                  fieldName: "email",
                });
              }}
            />
          </div>

          {emailErrors && (
            <FormCtrlError id={emailErrorId}>
              {emailErrors.map(([errorLabel, errorText], index) => {
                return (
                  <div key={index}>
                    <span>{errorLabel} </span>
                    <span>{errorText}</span>
                  </div>
                );
              })}
            </FormCtrlError>
          )}
        </div>

        <div className="field outer_field">
          <label htmlFor={passwordInputId} className="form__label">
            Password
          </label>

          <div className="control">
            <Input
              isRounded
              type="password"
              id={passwordInputId}
              value={passwordValue}
              onChange={(e) => {
                const node = e.currentTarget;
                dispatch({
                  type: ActionType.FORM_CHANGED,
                  value: node.value,
                  fieldName: "password",
                });
              }}
            />
          </div>

          {passwordErrors && (
            <FormCtrlError id={passwordErrorId}>
              {passwordErrors.map(([errorLabel, errorText], index) => {
                return (
                  <div key={index}>
                    <span>{errorLabel} </span>
                    <span>{errorText}</span>
                  </div>
                );
              })}
            </FormCtrlError>
          )}
        </div>

        <div className="form__submit">
          <Button
            type="submit"
            id={submitId}
            isRounded
            btnType={ComponentColorType.is_primary}
          >
            Login
          </Button>
        </div>

        <div className="form__submit">
          <Button
            isRounded
            btnType={ComponentColorType.is_warning}
            id={resetId}
            type="button"
            onClick={() => {
              dispatch({
                type: ActionType.RESET_FORM_FIELDS,
              });
            }}
          >
            Reset
          </Button>
        </div>

        <div
          className="other-auth"
          style={{
            marginTop: "80px",
          }}
        >
          <div>Don&apos;t have an account?</div>
          <a href={SIGN_UP_URL} className="other-auth__other-link">
            Sign Up!
          </a>
        </div>
      </form>
    </div>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  const [login] = useLoginMutation();
  const {
    persistor, //
    cache,
  } = useContext(EbnisAppContext);

  return <Login {...props} login={login} persistor={persistor} cache={cache} />;
};
