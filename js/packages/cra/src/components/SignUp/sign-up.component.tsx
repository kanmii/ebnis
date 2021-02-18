import { StateValue } from "@eb/cm/src/utils/types";
import makeClassNames from "classnames";
import React, { MouseEvent, useCallback, useContext, useReducer } from "react";
import { EbnisAppContext } from "../../utils/app-context";
import { FieldError } from "../../utils/common-errors";
import { InputChangeEvent } from "../../utils/types";
import { LOGIN_URL } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import { registerUserMutation } from "../../utils/user.gql.types";
import {
  errorClassName,
  formFieldErrorClass,
  outerFieldClassName,
  warningClassName,
} from "../../utils/utils.dom";
import FormCtrlError from "../FormCtrlError/form-ctrl-error.component";
import Header from "../Header/header.component";
import {
  emailFieldId,
  emailInputId,
  nameFieldId,
  nameInputId,
  notificationId,
  passwordConfirmationFieldId,
  passwordConfirmationInputId,
  passwordFieldId,
  passwordInputId,
  resetId,
  scrollIntoViewDomId,
  submitId,
} from "./sign-up.dom";
import {
  ActionType,
  CallerProps,
  effectFunctions,
  FormField,
  initState,
  Props,
  reducer,
} from "./sign-up.utils";
import "./styles.scss";

export function SignUp(props: Props) {
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);

  const {
    states: {
      submission: submissionState,
      form: {
        fields: {
          name: nameState,
          email: emailState,
          password: passwordState,
          passwordConfirmation: passwordConfirmationState,
        },
      },
    },
    effects: { general: generalEffects },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

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

  const onNameChanged = useCallback((e: InputChangeEvent) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      value: node.value,
      fieldName: "name",
    });
  }, []);

  const onEmailChanged = useCallback((e: InputChangeEvent) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      value: node.value,
      fieldName: "email",
    });
  }, []);

  const onPasswordChanged = useCallback((e: InputChangeEvent) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      value: node.value,
      fieldName: "password",
    });
  }, []);

  const onPasswordConfirmationChanged = useCallback((e: InputChangeEvent) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      value: node.value,
      fieldName: "passwordConfirmation",
    });
  }, []);

  let warningText = "";

  if (submissionState.value === StateValue.warning) {
    warningText = submissionState.warning.context.warning;
  }

  let errorText = "";
  if (submissionState.value === StateValue.commonErrors) {
    errorText = submissionState.commonErrors.context.errors;
  }

  return (
    <div className="sign-up-component ">
      <Header />

      <span className="scroll-into-view" id={scrollIntoViewDomId} />

      <form onSubmit={onSubmit} className="form">
        <div className="form__caption">Sign up with email</div>

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

        <Name state={nameState} onFieldChanged={onNameChanged} />
        <Email state={emailState} onFieldChanged={onEmailChanged} />
        <Password state={passwordState} onFieldChanged={onPasswordChanged} />
        <PasswordConfirmation
          state={passwordConfirmationState}
          onFieldChanged={onPasswordConfirmationChanged}
        />

        <div className="form__submit">
          <button
            type="submit"
            id={submitId}
            className="button is-rounded is-primary"
          >
            Sign up
          </button>
        </div>

        <div className="form__submit">
          <button
            type="button"
            id={resetId}
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
          <div>Already have an account?</div>
          <a href={LOGIN_URL} className="other-auth__other-link">
            Login!
          </a>
        </div>
      </form>
    </div>
  );
}

function Name(props: FieldComponentProps) {
  const { state, onFieldChanged } = props;

  let nameValue = "";
  let nameErrors: null | FieldError = null;

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = state.states.changed;
    nameValue = formValue;

    if (states.value === StateValue.invalid) {
      nameErrors = states.invalid.context.errors;
    }
  }

  return (
    <div
      className={makeClassNames({
        [outerFieldClassName]: true,
        [nameFieldId]: true,
        [formFieldErrorClass]: !!nameErrors,
      })}
    >
      <label htmlFor={nameInputId} className="label form__label">
        Your name
      </label>

      <div
        className={makeClassNames({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <input
            className="input is-rounded"
            type="text"
            id={nameInputId}
            value={nameValue}
            onChange={onFieldChanged}
            autoComplete="off"
          />
        </div>
      </div>

      {nameErrors && (
        <FormCtrlError>
          {nameErrors.map((errorText, index) => {
            return (
              <div key={index}>
                <span>{errorText}</span>
              </div>
            );
          })}
        </FormCtrlError>
      )}
    </div>
  );
}

function Email(props: FieldComponentProps) {
  const { state, onFieldChanged } = props;

  let emailValue = "";
  let emailErrors: null | FieldError = null;

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = state.states.changed;
    emailValue = formValue;

    if (states.value === StateValue.invalid) {
      emailErrors = states.invalid.context.errors;
    }
  }

  return (
    <div
      className={makeClassNames({
        [outerFieldClassName]: true,
        [emailFieldId]: true,
        [formFieldErrorClass]: !!emailErrors,
      })}
    >
      <label htmlFor={emailInputId} className="label form__label">
        Email
      </label>

      <div
        className={makeClassNames({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <input
            className="input is-rounded"
            type="text"
            id={emailInputId}
            value={emailValue}
            onChange={onFieldChanged}
            autoComplete="off"
          />
        </div>
      </div>

      {emailErrors && (
        <FormCtrlError>
          {emailErrors.map((errorText, index) => {
            return (
              <div key={index}>
                <span>{errorText}</span>
              </div>
            );
          })}
        </FormCtrlError>
      )}
    </div>
  );
}

function Password(props: FieldComponentProps) {
  const { state, onFieldChanged } = props;

  let passwordValue = "";
  let passwordErrors: null | FieldError = null;

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = state.states.changed;
    passwordValue = formValue;

    if (states.value === StateValue.invalid) {
      passwordErrors = states.invalid.context.errors;
    }
  }

  return (
    <div
      className={makeClassNames({
        [outerFieldClassName]: true,
        [passwordFieldId]: true,
        [formFieldErrorClass]: !!passwordErrors,
      })}
    >
      <label htmlFor={passwordInputId} className="label form__label">
        Password
      </label>

      <div
        className={makeClassNames({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <input
            className="input is-rounded"
            type="password"
            id={passwordInputId}
            value={passwordValue}
            onChange={onFieldChanged}
            autoComplete="off"
          />
        </div>
      </div>

      {passwordErrors && (
        <FormCtrlError>
          {passwordErrors.map((errorText, index) => {
            return (
              <div key={index}>
                <span>{errorText}</span>
              </div>
            );
          })}
        </FormCtrlError>
      )}
    </div>
  );
}

function PasswordConfirmation(props: FieldComponentProps) {
  const { state, onFieldChanged } = props;

  let passwordConfirmationValue = "";
  let passwordConfirmationErrors: null | FieldError = null;

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = state.states.changed;
    passwordConfirmationValue = formValue;

    if (states.value === StateValue.invalid) {
      passwordConfirmationErrors = states.invalid.context.errors;
    }
  }

  return (
    <div
      className={makeClassNames({
        [outerFieldClassName]: true,
        [passwordConfirmationFieldId]: true,
        [formFieldErrorClass]: !!passwordConfirmationErrors,
      })}
    >
      <label
        htmlFor={passwordConfirmationInputId}
        className="label form__label"
      >
        Password Confirmation
      </label>

      <div
        className={makeClassNames({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <input
            className="input is-rounded"
            type="password"
            id={passwordConfirmationInputId}
            value={passwordConfirmationValue}
            onChange={onFieldChanged}
            autoComplete="off"
          />
        </div>
      </div>

      {passwordConfirmationErrors && (
        <FormCtrlError>
          {passwordConfirmationErrors.map((errorText, index) => {
            return (
              <div key={index}>
                <span>{errorText}</span>
              </div>
            );
          })}
        </FormCtrlError>
      )}
    </div>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  const [registerUser] = registerUserMutation();
  const {
    persistor, //
  } = useContext(EbnisAppContext);

  return (
    <SignUp {...props} registerUser={registerUser} persistor={persistor} />
  );
};

interface FieldComponentProps {
  state: FormField;
  onFieldChanged: (e: InputChangeEvent) => void;
}
