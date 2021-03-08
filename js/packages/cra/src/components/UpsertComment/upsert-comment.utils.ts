import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { CommentInput } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  ChangedVal,
  ErrorsVal,
  InActiveVal,
  InsertVal,
  StateValue,
  SubmissionVal,
  UnChangedVal,
  UpdateVal,
} from "@eb/cm/src/utils/types";
import { ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import immer, { Draft } from "immer";
import { Dispatch, Reducer } from "react";
import { DeepReadonly } from "utility-types";
import { wrapReducer } from "../../logger";
import {
  GENERIC_SERVER_ERROR,
  parseStringError,
} from "../../utils/common-errors";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import { UpdateExperiencesMutation } from "../../utils/update-experiences.gql";

export enum ActionType {
  SUBMISSION = "@upsert-comment/submission",
  ERRORS = "@upsert-comment/errors",
  FORM_CHANGED = "@upsert-comment/form-changed",
  RESET = "@upsert-comment/reset",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, (proxy) => {
      proxy.effects.general.value = StateValue.noEffect;

      switch (type) {
        case ActionType.FORM_CHANGED:
          handleFormChangedAction(proxy, payload as FormChangedPayload);
          break;

        case ActionType.SUBMISSION:
          handleSubmissionAction(proxy);
          break;

        case ActionType.RESET:
          handleResetAction(proxy);
          break;

        case ActionType.ERRORS:
          handleErrorsAction(proxy, payload as ServerErrorsPayload);
          break;
      }
    });
  });

// ====================================================
// START STATE UPDATE SECTION
// ====================================================
export function initState(): StateMachine {
  const machine = {
    id: "@upsert-comment",
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    states: {
      submission: {
        value: StateValue.inactive,
      },
      form: {
        fields: {
          text: {
            states: {
              value: StateValue.unchanged,
            },
          },
        },
      },
      mode: {
        value: StateValue.insert,
      },
    },
  };

  return machine;
}

function handleFormChangedAction(
  proxy: StateMachine,
  payload: FormChangedPayload,
) {
  const {
    states: {
      form: { fields },
    },
  } = proxy;

  const { fieldName, value } = payload;
  let state = {} as ChangedState;
  const field = fields[fieldName as KeyOfFormFields];

  switch (fieldName) {
    case "text":
      state = (field as FormField).states as ChangedState;
      break;
  }

  state.value = StateValue.changed;

  state.changed = state.changed || {
    context: {
      formValue: value,
    },
  };

  state.changed.context.formValue = value;
}

function handleSubmissionAction(proxy: StateMachine) {
  const {
    states: {
      submission,
      form: { fields },
    },
  } = proxy;

  const state = submission as Submission;
  state.value = StateValue.submitting;

  const insertInput = {} as CommentInput;

  const { text: textField } = fields;

  if (textField.states.value === StateValue.changed) {
    insertInput.text = textField.states.changed.context.formValue;
  } else {
    const state = submission as SubmissionErrorState;
    state.value = StateValue.errors;

    state.errors = {
      context: {
        errors: [["1", "form is empty"]],
      },
    };
    return;
  }

  const effects = getGeneralEffects<EffectType, StateMachine>(proxy);

  effects.push({
    key: "upsertEffect",
    ownArgs: {
      input: insertInput,
    },
  });
}

function handleResetAction(proxy: Draft<StateMachine>) {
  const {
    states: {
      form: { fields },
      submission,
    },
  } = proxy;

  submission.value = StateValue.inactive;

  Object.entries(fields).forEach(([, fieldState]) => {
    const state = (fieldState as FormField).states;
    state.value = StateValue.unchanged;

    /* istanbul ignore else*/
    if ((state as ChangedState).changed) {
      const changes = (state as ChangedState).changed;
      changes.context.formValue = "";
    }
  });
}

function handleErrorsAction(proxy: StateMachine, payload: ServerErrorsPayload) {
  const {
    states: { submission },
  } = proxy;

  const { errors } = payload;

  const state = submission as SubmissionErrorState;
  state.value = StateValue.errors;
  state.errors = {
    context: {
      errors,
    },
  };
}
// ====================================================
// END STATE UPDATE SECTION
// ====================================================

// ====================================================
// START EFFECT FUNCTIONS SECTION
// ====================================================
const upsertEffect: DefInsertExperienceEffect["func"] = async (
  ownArgs,
  props,
  effectArgs,
) => {
  const { dispatch } = effectArgs;
  const { association, onSuccess, updateExperiencesMutation } = props;
  const { input } = ownArgs;

  updateExperiencesMutation({
    input: [
      {
        createComments: [input],
        experienceId: association.id,
      },
    ],
    onUpdateSuccess: async ({ comments: results }) => {
      const comments = results && results.inserts;

      if (comments && comments.length) {
        const comment = comments[0];

        switch (comment?.__typename) {
          case "CommentSuccess":
            {
              onSuccess(comment.comment);
            }
            break;

          case "CommentUnionErrors":
            {
              const {
                errors: { errors: mutationErrors },
              } = comment;

              const [errors] = Object.entries(mutationErrors).reduce(
                (acc, [k, v]) => {
                  const errors = acc[0];
                  let index = acc[1];

                  if (k !== "__typename" && v) {
                    errors.push(["" + index++, v]);
                  }

                  return [errors, index];
                },
                [[], 1] as [SubmissionError, number],
              );

              dispatch({
                type: ActionType.ERRORS,
                errors,
              });
            }
            break;
        }
      } else {
        dispatch({
          type: ActionType.ERRORS,
          errors: [
            ["1", "comment can not be created at this time, please try again"],
          ],
        });
      }
    },
    onError: (errors) => {
      const error = parseStringError(
        errors ||
          // istanbul ignore next:
          GENERIC_SERVER_ERROR,
      );

      dispatch({
        type: ActionType.ERRORS,
        errors: [["1", error]],
      });
    },
  });
};

type DefInsertExperienceEffect = EffectDefinition<
  "upsertEffect",
  {
    input: CommentInput;
  }
>;

export const effectFunctions = {
  upsertEffect,
};
// ====================================================
// END EFFECT FUNCTIONS SECTION
// ====================================================

// ====================================================
// START STATE_MACHINE SECTION
// ====================================================
export type StateMachine = GenericGeneralEffect<EffectType> &
  DeepReadonly<{
    states: {
      submission: Submission;
      form: FormFields;
      mode:
        | {
            value: InsertVal;
          }
        | {
            value: UpdateVal;
            update: {
              context: {
                comment: CommentFragment;
              };
            };
          };
    };
  }>;

type FormFields = {
  fields: {
    text: FormField;
  };
};

export type FormField = {
  states:
    | {
        value: UnChangedVal;
      }
    | ChangedState;
};

export type ChangedState = {
  value: ChangedVal;
  changed: {
    context: {
      formValue: string;
    };
  };
};

type Submission =
  | {
      value: InActiveVal;
    }
  | {
      value: SubmissionVal;
    }
  | SubmissionErrorState;

type SubmissionErrorState = {
  value: ErrorsVal;
  errors: {
    context: {
      errors: SubmissionError;
    };
  };
};

// [key/index, value]
export type SubmissionError = [string, string][];

// ====================================================
// END STATE_MACHINE SECTION
// ====================================================

export type CallerProps = {
  association: {
    id: string;
  };
  className?: string;
  onSuccess: (data: CommentFragment) => void;
  onClose: (e: ReactMouseEvent) => void;
};

export type Props = CallerProps & {
  updateExperiencesMutation: UpdateExperiencesMutation;
};

// ====================================================
// START ACTIONS SECTION
// ====================================================
type KeyOfFormFields = keyof FormFields["fields"];

type Action =
  | {
      type: ActionType.RESET;
    }
  | ({
      type: ActionType.FORM_CHANGED;
    } & FormChangedPayload)
  | ({
      type: ActionType.ERRORS;
    } & ServerErrorsPayload)
  | {
      type: ActionType.SUBMISSION;
    };

type ServerErrorsPayload = {
  errors: SubmissionError;
};

type FormChangedPayload = {
  value: string;
  fieldName: KeyOfFormFields;
};
// ====================================================
// END ACTIONS SECTION
// ====================================================

// ====================================================
// START EFFECT TYPES SECTION
// ====================================================

export type EffectType = DefInsertExperienceEffect;

export type DispatchType = Dispatch<Action>;

export type EffectArgs = {
  dispatch: DispatchType;
};

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Record<string, unknown>
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

// ====================================================
// END EFFECT TYPES SECTION
// ====================================================
