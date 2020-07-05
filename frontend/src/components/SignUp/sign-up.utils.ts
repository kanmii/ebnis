import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import {
  parseStringError,
  StringyErrorPayload,
  NOTHING_TO_SAVE_WARNING_MESSAGE,
  FORM_CONTAINS_ERRORS_MESSAGE,
  GENERIC_SERVER_ERROR,
  FieldError,
  CommonErrorsState,
} from "../../utils/common-errors";
import { scrollIntoView } from "../../utils/scroll-into-view";
import {
  StateValue,
  InActiveVal,
  WarningVal,
  ValidVal,
  InvalidVal,
  InitialVal,
  UnChangedVal,
  ChangedVal,
  SubmissionVal,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
  GenericHasEffect,
} from "../../utils/effects";
import { RegisterUserInput } from "../../graphql/apollo-types/globalTypes";
import { RegisterUserErrorFragment } from "../../graphql/apollo-types/RegisterUserErrorFragment";
import { RegisterUserMutationComponentProps } from "../../utils/user.gql.types";
import { manageUserAuthentication } from "../../utils/manage-user-auth";
import { EbnisContextProps } from "../../utils/app-context";
import { windowChangeUrl, ChangeUrlType } from "../../utils/global-window";
import { MY_URL } from "../../utils/urls";

export enum ActionType {
  SUBMISSION = "@sign-up/submission",
  SERVER_ERRORS = "@sign-up/server-errors",
  COMMON_ERROR = "@sign-up/on-common-error",
  CLOSE_SUBMIT_NOTIFICATION = "@sign-up/close-submit-notification",
  FORM_CHANGED = "@sign-up/form-changed",
  RESET_FORM_FIELDS = "@sign-up/reset-form-fields",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        delete proxy.effects.general[StateValue.hasEffects];

        switch (type) {
          case ActionType.FORM_CHANGED:
            handleFormChangedAction(proxy, payload as FormChangedPayload);
            break;

          case ActionType.SUBMISSION:
            handleSubmissionAction(proxy);
            break;

          case ActionType.COMMON_ERROR:
            handleCommonErrorAction(proxy, payload as StringyErrorPayload);
            break;

          case ActionType.CLOSE_SUBMIT_NOTIFICATION:
            proxy.states.submission.value = StateValue.inactive;
            break;

          case ActionType.SERVER_ERRORS:
            handleServerErrorsAction(proxy, payload as ServerErrorPayload);
            break;

          case ActionType.RESET_FORM_FIELDS:
            handleResetFormFieldsAction(proxy);
            break;
        }
      });
    },

    // true
  );

////////////////////////// STATE UPDATE SECTION /////////////////

export function initState(): StateMachine {
  return {
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    states: {
      submission: { value: StateValue.inactive },
      form: {
        fields: {
          name: {
            states: {
              value: StateValue.unchanged,
            },
          },
          email: {
            states: {
              value: StateValue.unchanged,
            },
          },
          password: {
            states: {
              value: StateValue.unchanged,
            },
          },
          passwordConfirmation: {
            states: {
              value: StateValue.unchanged,
            },
          },
          source: {
            states: {
              value: StateValue.changed,
              changed: {
                context: {
                  formValue: "password",
                },
                states: {
                  value: StateValue.valid,
                },
              },
            },
          },
        },
        validity: {
          value: "initial",
        },
      },
    },
  };
}

function handleFormChangedAction(
  proxy: DraftState,
  payload: FormChangedPayload,
) {
  const { value: text, fieldName } = payload;
  const {
    states: {
      form: { fields },
    },
  } = proxy;

  const field = fields[fieldName] as FormField;
  const state = field.states as Draft<ChangedState>;
  state.value = StateValue.changed;
  state.changed = state.changed || {
    context: { formValue: text },
    states: {
      value: StateValue.initial,
    },
  };

  state.changed.context.formValue = text;
}

function handleSubmissionAction(proxy: DraftState) {
  const {
    states: { submission },
  } = proxy;

  const effects = getGeneralEffects<EffectType, DraftState>(proxy);
  submission.value = StateValue.inactive;

  const input = validateForm(proxy);
  const submissionErrorsState = submission as CommonErrorsState;
  const submissionWarningState = submission as SubmissionWarning;

  if (
    submissionErrorsState.value === StateValue.commonErrors ||
    submissionWarningState.value === StateValue.warning
  ) {
    effects.push({
      key: "scrollIntoViewEffect",
      ownArgs: {},
    });
    return;
  }

  submission.value = StateValue.submitting;

  effects.push({
    key: "registerUserEffect",
    ownArgs: { input },
  });
}

function validateForm(proxy: DraftState): RegisterUserInput {
  const {
    states: {
      submission,
      form: { fields },
    },
  } = proxy;

  const {
    name: { states: nameState },
    email: { states: emailState },
    password: { states: passwordState },
    passwordConfirmation: { states: passwordConfirmationState },
    source: { states: sourceState },
  } = fields;

  const submissionErrorState = submission as CommonErrorsState;
  const submissionWarningState = submission as Draft<SubmissionWarning>;

  const input = {} as RegisterUserInput;
  let formUpdated = false;

  if (nameState.value === StateValue.changed) {
    const {
      changed: {
        context: { formValue },
        states: validityState0,
      },
    } = nameState;

    const value = formValue.trim();
    formUpdated = true;

    if (value.length < 2) {
      validateFormPutFieldErrorHelper(submissionErrorState, validityState0, [
        ["", "must be at least two chars"],
      ]);
    } else {
      input.name = value;
      validityState0.value = StateValue.valid;
    }
  }

  if (emailState.value === StateValue.changed) {
    const {
      changed: {
        context: { formValue },
        states: validityState0,
      },
    } = emailState;

    const value = formValue.trim();
    formUpdated = true;

    /* eslint-disable-next-line no-useless-escape*/
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!regex.test(value)) {
      validateFormPutFieldErrorHelper(submissionErrorState, validityState0, [
        ["", "ust be a valid email address"],
      ]);
    } else {
      input.email = value;
      validityState0.value = StateValue.valid;
    }
  }

  if (passwordState.value === StateValue.changed) {
    const {
      changed: {
        context: { formValue },
        states: validityState0,
      },
    } = passwordState;

    const value = formValue.trim();
    formUpdated = true;

    if (value.length < 4) {
      validateFormPutFieldErrorHelper(submissionErrorState, validityState0, [
        ["", "must be at least four chars"],
      ]);
    } else {
      input.password = value;
      validityState0.value = StateValue.valid;
    }
  }

  if (passwordConfirmationState.value === StateValue.changed) {
    const {
      changed: {
        context: { formValue },
        states: validityState0,
      },
    } = passwordConfirmationState;

    const value = formValue.trim();
    formUpdated = true;

    if (value !== input.password) {
      validateFormPutFieldErrorHelper(submissionErrorState, validityState0, [
        ["", "passwords do not match"],
      ]);
    } else {
      input.passwordConfirmation = value;
      validityState0.value = StateValue.valid;
    }
  }

  if (!formUpdated) {
    submissionWarningState.value = StateValue.warning;
    submissionWarningState.warning = {
      context: {
        warning: NOTHING_TO_SAVE_WARNING_MESSAGE,
      },
    };
  } else {
    const source = sourceState as Draft<ChangedState>;
    input.source = source.changed.context.formValue;
  }

  return input;
}

function validateFormPutFieldErrorHelper(
  submissionErrorState: Draft<CommonErrorsState>,
  fieldState: ChangedState["changed"]["states"],
  errors: FieldError,
) {
  submissionErrorState.value = StateValue.commonErrors;

  submissionErrorState.commonErrors = {
    context: {
      errors: FORM_CONTAINS_ERRORS_MESSAGE,
    },
  };

  const validityState = fieldState as Draft<FieldInValid>;
  validityState.value = StateValue.invalid;
  validityState.invalid = {
    context: {
      errors,
    },
  };
}

function handleCommonErrorAction(
  proxy: DraftState,
  payload: StringyErrorPayload,
) {
  const errors = parseStringError(payload.error);

  const commonErrorsState = {
    value: StateValue.commonErrors,
    commonErrors: {
      context: {
        errors,
      },
    },
  } as Submission;

  proxy.states.submission = {
    ...proxy.states.submission,
    ...commonErrorsState,
  };

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "scrollIntoViewEffect",
    ownArgs: {},
  });
}

function handleResetFormFieldsAction(proxy: DraftState) {
  const {
    states: {
      submission,
      form: { fields },
    },
  } = proxy;

  submission.value = StateValue.inactive;

  Object.values(fields).forEach(({ states }) => {
    states.value = StateValue.unchanged;
    delete states[StateValue.changed];
  });
}

function handleServerErrorsAction(
  proxy: DraftState,
  payload: ServerErrorPayload,
) {
  const {
    states: {
      form: {
        fields: {
          email: emailState,
          password: passwordState,
          passwordConfirmation: passwordConfirmationState,
        },
      },
      submission,
    },
  } = proxy;

  const {
    errors: {
      email: emailErrors,
      password: passwordErrors,
      passwordConfirmation: passwordConfirmationErrors,
    },
  } = payload;

  const submissionErrorState = submission as CommonErrorsState;
  let hasErrors = false;

  // istanbul ignore else:
  if (emailErrors) {
    const {
      changed: { states },
    } = emailState.states as Draft<ChangedState>;

    validateFormPutFieldErrorHelper(submissionErrorState, states, [
      ["", emailErrors],
    ]);
    hasErrors = true;
  }

  // istanbul ignore else:
  if (passwordErrors) {
    const {
      changed: { states },
    } = passwordState.states as Draft<ChangedState>;

    validateFormPutFieldErrorHelper(submissionErrorState, states, [
      ["", passwordErrors],
    ]);
    hasErrors = true;
  }

  // istanbul ignore else:
  if (passwordConfirmationErrors) {
    const {
      changed: { states },
    } = passwordConfirmationState.states as Draft<ChangedState>;

    validateFormPutFieldErrorHelper(submissionErrorState, states, [
      ["", passwordConfirmationErrors],
    ]);
    hasErrors = true;
  }

  // istanbul ignore else:
  if (hasErrors) {
    const effects = getGeneralEffects(proxy);

    effects.push({
      key: "scrollIntoViewEffect",
      ownArgs: {},
    });
  }
}

////////////////////////// END STATE UPDATE SECTION ////////////

////////////////////////// EFFECTS SECTION /////////////////////////

const scrollIntoViewEffect: DefScrollToTopEffect["func"] = () => {
  scrollIntoView("");
};

type DefScrollToTopEffect = EffectDefinition<"scrollIntoViewEffect", {}>;

const registerUserEffect: DefRegisterUserEffect["func"] = async (
  ownArgs,
  props,
  effectArgs,
) => {
  const { registerUser, persistor } = props;
  const { input } = ownArgs;
  const { dispatch } = effectArgs;

  try {
    const response = await registerUser({
      variables: { input },
    });

    const validResponse =
      response && response.data && response.data && response.data.registerUser;

    if (!validResponse) {
      dispatch({
        type: ActionType.COMMON_ERROR,
        error: GENERIC_SERVER_ERROR,
      });

      return;
    }

    if (validResponse.__typename === "RegisterUserErrors") {
      dispatch({
        type: ActionType.SERVER_ERRORS,
        errors: validResponse.errors,
      });

      return;
    } else {
      const { user } = validResponse;

      manageUserAuthentication(user);
      await persistor.persist();
      windowChangeUrl(MY_URL, ChangeUrlType.replace);
    }
  } catch (error) {
    dispatch({
      type: ActionType.COMMON_ERROR,
      error,
    });
  }
};

type DefRegisterUserEffect = EffectDefinition<
  "registerUserEffect",
  {
    input: RegisterUserInput;
  }
>;

export const effectFunctions = {
  scrollIntoViewEffect,
  registerUserEffect,
};

////////////////////////// END EFFECTS SECTION /////////////////////////

////////////////////////// TYPES SECTION ////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = Readonly<GenericGeneralEffect<EffectType>> &
  Readonly<{
    states: Readonly<{
      submission: Submission;
      form: Readonly<{
        validity: FormValidity;
        fields: Readonly<
          {
            [k in keyof RegisterUserInput]: FormField;
          }
        >;
      }>;
    }>;
  }>;

export type FormValidity = { value: InitialVal } | FormInValid;

interface FormInValid {
  value: InvalidVal;
  invalid: {
    context: {
      errors: FieldError;
    };
  };
}

type Submission =
  | Readonly<{
      value: InActiveVal;
    }>
  | Submitting
  | CommonErrorsState
  | SubmissionWarning;

type Submitting = Readonly<{
  value: SubmissionVal;
}>;

type SubmissionWarning = Readonly<{
  value: WarningVal;
  warning: Readonly<{
    context: Readonly<{
      warning: string;
    }>;
  }>;
}>;

export type FormField<FormValue = string> = Readonly<{
  states:
    | Readonly<{
        value: UnChangedVal;
      }>
    | ChangedState<FormValue>;
}>;

type ChangedState<FormValue = string> = Readonly<{
  value: ChangedVal;
  changed: Readonly<{
    context: Readonly<{
      formValue: FormValue;
    }>;
    states:
      | Readonly<{
          value: InitialVal;
        }>
      | Readonly<{
          value: ValidVal;
        }>
      | FieldInValid;
  }>;
}>;

type FieldInValid = Readonly<{
  value: InvalidVal;
  invalid: Readonly<{
    context: {
      errors: FieldError;
    };
  }>;
}>;

interface FormChangedPayload {
  value: string;
  fieldName: keyof StateMachine["states"]["form"]["fields"];
}

interface ServerErrorPayload {
  errors: RegisterUserErrorFragment;
}

export type Action =
  | {
      type: ActionType.CLOSE_SUBMIT_NOTIFICATION;
    }
  | ({
      type: ActionType.COMMON_ERROR;
    } & StringyErrorPayload)
  | {
      type: ActionType.SUBMISSION;
    }
  | ({
      type: ActionType.FORM_CHANGED;
    } & FormChangedPayload)
  | ({
      type: ActionType.SERVER_ERRORS;
    } & ServerErrorPayload)
  | {
      type: ActionType.RESET_FORM_FIELDS;
    };

export type CallerProps = {
  callerProp: boolean;
};

export type Props = CallerProps &
  RegisterUserMutationComponentProps &
  Pick<EbnisContextProps, "persistor">;

export interface EffectArgs {
  dispatch: Dispatch<Action>;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type EffectType = DefRegisterUserEffect | DefScrollToTopEffect;
export type EffectState = GenericHasEffect<EffectType>;
type EffectList = EffectType[];
