import React, {
  useEffect,
  useReducer,
  useCallback,
  MouseEvent,
  useContext,
  useLayoutEffect,
} from "react";
import Header from "../Header/header.component";
import "./login.styles.scss";
import {
  Props,
  effectFunctions,
  reducer,
  initState,
  StateValue,
  ActionType,
  CallerProps,
} from "./login.utils";
import { FieldError } from "../../utils/common-errors";
import FormCtrlError from "../FormCtrlError/form-ctrl-error.component";
import {
  emailInputId,
  passwordInputId,
  passwordErrorId,
  emailErrorId,
  submitId,
  resetId,
  notificationId,
  LOGIN_PAGE_TITLE,
} from "./login.dom";
import { useLoginMutation } from "../../utils/user.gql.types";
import makeClassNames from "classnames";
import { warningClassName, errorClassName } from "../../utils/utils.dom";
import { EbnisAppContext } from "../../utils/app-context";
import { setUpRoutePage } from "../../utils/global-window";
import { SIGN_UP_URL } from "../../utils/urls";

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

  useEffect(() => {
    if (generalEffects.value !== StateValue.hasEffects) {
      return;
    }

    for (const { key, ownArgs } of generalEffects.hasEffects.context.effects) {
      effectFunctions[key](
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        ownArgs as any,
        props,
        { dispatch },
      );
    }

    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [generalEffects]);

  useLayoutEffect(() => {
    setUpRoutePage({
      title: LOGIN_PAGE_TITLE,
      // rootClassName: "login-component",
    });
  }, []);

  const onSubmit = useCallback((e: MouseEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({
      type: ActionType.SUBMISSION,
    });
  }, []);

  const onCloseNotification = useCallback(() => {
    dispatch({
      type: ActionType.CLOSE_SUBMIT_NOTIFICATION,
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
    <div className="login-component">
      <Header />

      <form onSubmit={onSubmit} className="form">
        <div className="form__caption">Login with email</div>

        {(warningText || errorText) && (
          <div
            id={notificationId}
            className={makeClassNames({
              notification: true,
              [warningClassName]: !!warningText,
              [errorClassName]: !!errorText,
            })}
          >
            <button
              type="button"
              className="delete"
              onClick={onCloseNotification}
            />
            {warningText || errorText}
          </div>
        )}

        <div className="field">
          <label htmlFor={emailInputId} className="label form__label">
            Email
          </label>

          <div className="control">
            <input
              className="input is-rounded"
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

        <div className="field">
          <label htmlFor={passwordInputId} className="label form__label">
            Password
          </label>

          <div className="control">
            <input
              className="input is-rounded"
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
          <button
            type="submit"
            id={submitId}
            className="button is-rounded is-primary"
          >
            Login
          </button>
        </div>

        <div className="form__submit">
          <button
            id={resetId}
            type="button"
            className="button is-rounded is-warning"
            onClick={() => {
              dispatch({
                type: ActionType.RESET_FORM_FIELDS,
              });
            }}
          >
            Reset
          </button>
        </div>

        <div className="other-auth">
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
