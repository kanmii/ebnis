import { Button } from "@eb/jsx/src/Button";
import Input from "@eb/jsx/src/Input";
import { Notification } from "@eb/jsx/src/Notification";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { useContext, useReducer } from "react";
import { EbnisAppContext } from "../../utils/app-context";
import { FieldError } from "../../utils/common-errors";
import { InputChangeEvent } from "../../utils/types";
import { LOGIN_URL } from "../../utils/urls";
import { useRunEffects } from "../../utils/use-run-effects";
import { registerUserMutation } from "../../utils/user.gql.types";
import {
  errorClassName,
  formFieldErrorClass,
  outerFieldSelector,
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

      <span className="scroll-into-view" id={scrollIntoViewDomId} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({
            type: ActionType.SUBMISSION,
          });
        }}
        className="form"
      >
        <div className="form__caption">Sign up with email</div>

        {(warningText || errorText) && (
          <Notification
            id={notificationId}
            className={cn(
              "!mb-6",
              errorText ? errorClassName : warningClassName,
            )}
            close={{
              onClose: () => {
                dispatch({
                  type: ActionType.CLOSE_SUBMIT_NOTIFICATION,
                });
              },
            }}
            type={
              errorText
                ? ComponentColorType.is_danger
                : ComponentColorType.is_warning
            }
          >
            {warningText || errorText}
          </Notification>
        )}

        <Name
          state={nameState}
          onFieldChanged={(e) => {
            const node = e.currentTarget;
            dispatch({
              type: ActionType.FORM_CHANGED,
              value: node.value,
              fieldName: "name",
            });
          }}
        />
        <Email
          state={emailState}
          onFieldChanged={(e) => {
            const node = e.currentTarget;
            dispatch({
              type: ActionType.FORM_CHANGED,
              value: node.value,
              fieldName: "email",
            });
          }}
        />
        <Password
          state={passwordState}
          onFieldChanged={(e) => {
            const node = e.currentTarget;
            dispatch({
              type: ActionType.FORM_CHANGED,
              value: node.value,
              fieldName: "password",
            });
          }}
        />
        <PasswordConfirmation
          state={passwordConfirmationState}
          onFieldChanged={(e) => {
            const node = e.currentTarget;
            dispatch({
              type: ActionType.FORM_CHANGED,
              value: node.value,
              fieldName: "passwordConfirmation",
            });
          }}
        />

        <div className="form__submit">
          <Button
            type="submit"
            id={submitId}
            isRounded
            btnType={ComponentColorType.is_primary}
          >
            Sign up
          </Button>
        </div>

        <div className="form__submit">
          <Button
            isRounded
            btnType={ComponentColorType.is_warning}
            type="button"
            id={resetId}
            onClick={() => {
              dispatch({
                type: ActionType.RESET_FORM_FIELDS,
              });
            }}
          >
            Reset
          </Button>
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
      className={cn("outer_field", outerFieldSelector, nameFieldId, {
        [formFieldErrorClass]: !!nameErrors,
      })}
    >
      <label htmlFor={nameInputId} className="form__label">
        Your name
      </label>

      <div
        className={cn({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <Input
            isRounded
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
      className={cn("outer_field", outerFieldSelector, emailFieldId, {
        [formFieldErrorClass]: !!emailErrors,
      })}
    >
      <label htmlFor={emailInputId} className="form__label">
        Email
      </label>

      <div
        className={cn({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <Input
            isRounded
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
      className={cn("outer_field", outerFieldSelector, passwordFieldId, {
        [formFieldErrorClass]: !!passwordErrors,
      })}
    >
      <label htmlFor={passwordInputId} className="form__label">
        Password
      </label>

      <div
        className={cn({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <Input
            isRounded
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
      className={cn(
        "outer_field",
        outerFieldSelector,
        passwordConfirmationFieldId,
        {
          [formFieldErrorClass]: !!passwordConfirmationErrors,
        },
      )}
    >
      <label htmlFor={passwordConfirmationInputId} className="form__label">
        Password Confirmation
      </label>

      <div
        className={cn({
          "field form__field has-addons": true,
        })}
      >
        <div className="control form__control-wrapper">
          <Input
            isRounded
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
