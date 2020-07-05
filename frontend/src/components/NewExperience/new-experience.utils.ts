import { Reducer, Dispatch } from "react";
import immer, { Draft } from "immer";
import {
  CreateExperienceInput,
  CreateDataDefinition,
  DataTypes,
} from "../../graphql/apollo-types/globalTypes";
import { wrapReducer } from "../../logger";
import {
  StringyErrorPayload,
  parseStringError,
  FORM_CONTAINS_ERRORS_MESSAGE,
  NOTHING_TO_SAVE_WARNING_MESSAGE,
  GENERIC_SERVER_ERROR,
  FieldError,
} from "../../utils/common-errors";
import {
  GenericGeneralEffect,
  getGeneralEffects,
  GenericEffectDefinition,
  GenericHasEffect,
} from "../../utils/effects";
import { scrollIntoView } from "../../utils/scroll-into-view";
import {
  CreateExperiencesComponentProps,
  CreateExperiencesMutationFn,
} from "../../utils/experience.gql.types";
import { entriesPaginationVariables } from "../../graphql/entry.gql";
import { isConnected } from "../../utils/connections";
import {
  CreateExperiences_createExperiences_CreateExperienceErrors_errors,
  CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions,
} from "../../graphql/apollo-types/CreateExperiences";
import { createExperiencesManualUpdate } from "../../apollo/create-experiences-manual-update";
import { scrollIntoViewDomId } from "./new-experience.dom";
import { CreateExperienceOfflineMutationComponentProps } from "./new-experience.resolvers";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { windowChangeUrl, ChangeUrlType } from "../../utils/global-window";
import { uuid } from "uuidv4";
import { MyChildDispatchProps } from "../My/my.utils";
import {
  InActiveVal,
  UnChangedVal,
  CommonErrorsVal,
  WarningVal,
  InitialVal,
  SubmissionVal,
  ActiveVal,
  ChangedVal,
  ValidVal,
  InvalidVal,
  StateValue,
} from "../../utils/types";
import {
  CreateExperienceErrorsFragment,
  CreateExperienceErrorsFragment_errors,
} from "../../graphql/apollo-types/CreateExperienceErrorsFragment";
import { CreateExperienceSuccessFragment } from "../../graphql/apollo-types/CreateExperienceSuccessFragment";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { CreateEntryErrorFragment } from "../../graphql/apollo-types/CreateEntryErrorFragment";

export const fieldTypeKeys = Object.values(DataTypes);

export enum ActionType {
  SUBMISSION = "@experience-definition/submission",
  FORM_ERRORS = "@experience-definition/form-errors",
  ON_COMMON_ERROR = "@experience-definition/on-common-error",
  CLOSE_SUBMIT_NOTIFICATION = "@definition/close-submit-notification",
  FORM_CHANGED = "@experience-definition/form-changed",
  RESET_FORM_FIELDS = "@experience-definition/reset-form-fields",
  ON_SERVER_ERRORS = "@experience-definition/on-server-errors",
  ADD_DEFINITION = "@experience-definition/add-definition",
  REMOVE_DEFINITION = "@experience-definition/remove-definition",
  DOWN_DEFINITION = "@experience-definition/down-definition",
  UP_DEFINITION = "@experience-definition/up-definition",
  TOGGLE_DESCRIPTION = "@experience-definition/toggle-description",
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

          case ActionType.ON_COMMON_ERROR:
            handleOnCommonErrorAction(proxy, payload as StringyErrorPayload);
            break;

          case ActionType.CLOSE_SUBMIT_NOTIFICATION:
            handleCloseSubmitNotificationAction(proxy);
            break;

          case ActionType.RESET_FORM_FIELDS:
            handleResetFormFieldsAction(proxy);
            break;

          case ActionType.ADD_DEFINITION:
            handleAddDefinitionAction(
              proxy,
              payload as ChangeDefinitionFieldPayload,
            );
            break;

          case ActionType.REMOVE_DEFINITION:
            handleRemoveDefinitionAction(
              proxy,
              payload as ChangeDefinitionFieldPayload,
            );
            break;

          case ActionType.DOWN_DEFINITION:
            handleDownDefinitionAction(
              proxy,
              payload as ChangeDefinitionFieldPayload,
            );
            break;

          case ActionType.UP_DEFINITION:
            handleUpDefinitionAction(
              proxy,
              payload as ChangeDefinitionFieldPayload,
            );
            break;

          case ActionType.TOGGLE_DESCRIPTION:
            handleToggleDescriptionAction(proxy);
            break;

          case ActionType.ON_SERVER_ERRORS:
            handleOnServerErrorsAction(proxy, payload as ServerErrorsPayload);
            break;
        }
      });
    },
    // true,
  );

////////////////////////// EFFECTS SECTION /////////////////////////

const submissionEffect: DefSubmissionEffect["func"] = (
  { input },
  props,
  effectArgs,
) => {
  if (isConnected()) {
    const { createExperiences } = props;
    const { dispatch } = effectArgs;

    createExperienceOnlineEffect(input, createExperiences, async (data) => {
      switch (data.key) {
        case "ExperienceSuccess":
          await window.____ebnis.persistor.persist();

          windowChangeUrl(
            makeDetailedExperienceRoute(data.experience.id),
            ChangeUrlType.goTo,
          );
          break;

        case "exception":
          dispatch({
            type: ActionType.ON_COMMON_ERROR,
            error: data.error,
          });
          break;

        case "CreateExperienceErrors":
          dispatch({
            type: ActionType.ON_SERVER_ERRORS,
            errors: data.errors,
          });
          break;

        case "invalidResponse":
          dispatch({
            type: ActionType.ON_COMMON_ERROR,
            error: GENERIC_SERVER_ERROR,
          });
          break;
      }
    });
  } else {
    createExperienceOfflineEffect(input, props, effectArgs);
  }
};

function ceateExperienceInputMutationFunctionVariable(
  input: CreateExperienceInput,
) {
  return {
    input: [input],
    ...entriesPaginationVariables,
  };
}

async function createExperienceOfflineEffect(
  input: CreateExperienceInput,
  props: Props,
  effectArgs: EffectArgs,
) {
  const { createExperienceOffline } = props;
  const { dispatch } = effectArgs;
  const variables = ceateExperienceInputMutationFunctionVariable(input);

  try {
    const result = await createExperienceOffline({
      variables,
    });

    const validResponse =
      result && result.data && result.data.createOfflineExperience;

    if (!validResponse) {
      dispatch({
        type: ActionType.ON_COMMON_ERROR,
        error: GENERIC_SERVER_ERROR,
      });
    } else {
      if (validResponse.__typename === "CreateExperienceErrors") {
        dispatch({
          type: ActionType.ON_SERVER_ERRORS,
          errors: validResponse.errors,
        });
      } else {
        const experienceId = validResponse.experience.id;
        await window.____ebnis.persistor.persist();
        windowChangeUrl(
          makeDetailedExperienceRoute(experienceId),
          ChangeUrlType.goTo,
        );
      }
    }
  } catch (error) {
    dispatch({
      type: ActionType.ON_COMMON_ERROR,
      error,
    });
  }
}

type CreateExperienceOnlineEvents =
  | {
      key: "invalidResponse";
    }
  | {
      key: CreateExperienceErrorsFragment["__typename"];
      errors: CreateExperienceErrorsFragment_errors;
    }
  | {
      key: CreateExperienceSuccessFragment["__typename"];
      experience: ExperienceFragment;
      entriesErrors: CreateEntryErrorFragment[] | null;
    }
  | {
      key: "exception";
      error: Error;
    };

export async function createExperienceOnlineEffect(
  input: CreateExperienceInput,
  createExperiences: CreateExperiencesMutationFn,
  onEvent: (data: CreateExperienceOnlineEvents) => void,
) {
  const variables = ceateExperienceInputMutationFunctionVariable(input);

  try {
    const responses = await createExperiences({
      variables,
      update: createExperiencesManualUpdate,
    });

    const validResponses =
      responses && responses.data && responses.data.createExperiences;

    if (!validResponses) {
      onEvent({
        key: "invalidResponse",
      });

      return;
    }

    const response = validResponses[0];

    if (response.__typename === "CreateExperienceErrors") {
      const { errors } = response;

      onEvent({
        key: "CreateExperienceErrors",
        errors,
      });
    } else {
      const { experience, entriesErrors } = response;

      onEvent({
        key: "ExperienceSuccess",
        experience,
        entriesErrors,
      });
    }
  } catch (error) {
    onEvent({
      key: "exception",
      error,
    });
  }
}

type DefSubmissionEffect = EffectDefinition<
  "submissionEffect",
  {
    input: CreateExperienceInput;
  }
>;

const scrollToViewEffect: DefScrollToViewEffect["func"] = ({ id }) => {
  scrollIntoView(id, {
    behavior: "smooth",
  });
};

type DefScrollToViewEffect = EffectDefinition<
  "scrollToViewEffect",
  {
    id: string;
  }
>;

export const effectFunctions = {
  submissionEffect,
  scrollToViewEffect,
};

////////////////////////// END EFFECTS SECTION /////////////////////////

////////////////////////// STATE UPDATE SECTION /////////////////

function makeDataDefinitionFormField(index: number): DataDefinitionFormField {
  return {
    index,
    id: uuid(),
    name: {
      states: {
        value: StateValue.unchanged,
      },
    },
    type: {
      states: {
        value: StateValue.unchanged,
      },
    },
  };
}

export function initState(): StateMachine {
  const definitionElProperties = makeDataDefinitionFormField(0);

  return {
    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
    states: {
      submission: { value: StateValue.inactive },
      form: {
        validity: { value: StateValue.initial },
        fields: {
          title: {
            states: {
              value: StateValue.unchanged,
            },
          },
          description: {
            value: StateValue.active,
            active: {
              states: {
                value: StateValue.unchanged,
              },
            },
          },
          dataDefinitions: {
            [definitionElProperties.id]: definitionElProperties,
          },
        },
      },
    },
  };
}

function handleFormChangedAction(
  proxy: DraftState,
  payload: FormChangedPayload,
) {
  const {
    states: {
      form: { fields },
    },
  } = proxy;

  const { fieldName, value } = payload;
  let state = {} as Draft<ChangedState>;

  if (payload.key === "non-def") {
    const field = fields[fieldName];

    if (fieldName === "title") {
      state = (field as FormField).states as ChangedState;
    } else {
      state = (field as DescriptionFormFieldActive).active
        .states as ChangedState;
    }
  } else {
    const { index } = payload;

    const defAttrs = definitionFieldsMapToList(fields.dataDefinitions).find(
      (def) => {
        return def.index === index;
      },
    ) as DataDefinitionFormField;

    const field = defAttrs[fieldName];
    state = (field as FormField).states as ChangedState;
  }

  state.value = StateValue.changed;

  state.changed = state.changed || {
    context: { formValue: value },
    states: {
      value: StateValue.initial,
    },
  };

  state.changed.context.formValue = value;
}

function handleSubmissionAction(proxy: DraftState) {
  const {
    states: { submission },
  } = proxy;

  const effects = getGeneralEffects<EffectType, DraftState>(proxy);
  submission.value = StateValue.inactive;

  const input = validateForm(proxy);
  const submissionErrorsState = submission as SubmissionCommonErrors;
  const submissionWarningState = submission as SubmissionWarning;

  if (
    submissionErrorsState.value === StateValue.commonErrors ||
    submissionWarningState.value === StateValue.warning
  ) {
    effects.push({
      key: "scrollToViewEffect",
      ownArgs: {
        id: scrollIntoViewDomId,
      },
    });

    return;
  }

  submission.value = StateValue.submitting;

  effects.push({
    key: "submissionEffect",
    ownArgs: { input },
  });
}

const EMPTY_ERROR_TEXT = "is a required field";

function validateForm(proxy: DraftState): CreateExperienceInput {
  const {
    states: {
      submission,
      form: { fields },
    },
  } = proxy;

  const submissionWarningState = submission as Draft<SubmissionWarning>;

  const input = {} as CreateExperienceInput;
  let formUpdated = false;
  let hasErrors = false;

  Object.entries(fields).forEach(([fieldName, fieldState]) => {
    switch (fieldName) {
      case "title":
        {
          const state = (fieldState as FormField).states;

          const [
            formValue,
            updated,
            withErrors,
          ] = validateFormStringValuesHelper(proxy, "title", state);

          hasErrors = hasErrors || withErrors;

          if (updated) {
            formUpdated = true;
          }

          if (formValue) {
            formUpdated = true;
            input.title = formValue;
          }
        }
        break;

      case "description":
        {
          // description field does not have to be active to be valid
          // user can edit and hide the description field especially if
          // text is quite long.

          const state = (fieldState as Draft<DescriptionFormFieldActive>).active
            .states;

          if (state.value === StateValue.changed) {
            const {
              changed: {
                context: { formValue },
                states: validityState,
              },
            } = state;

            const value = formValue.trim();
            formUpdated = true;

            /* istanbul ignore else*/
            if (value) {
              input.description = value;
              validityState.value = StateValue.valid;
            }
          }
        }
        break;

      case "dataDefinitions":
        {
          const namesValuesMap: { [nameValue: string]: true } = {};
          const defsList = definitionFieldsMapToList(
            fieldState as DataDefinitionFieldsMap,
          );

          defsList.forEach(({ name: nameState, type: typeState }, index) => {
            let hasValidValue = false;
            const dataDefinitions = input.dataDefinitions || [];

            const dataDefinition =
              dataDefinitions[index] || ({} as CreateDataDefinition);

            const [nameValue, nameUpdated] = validateFormStringValuesHelper(
              proxy,
              "field name",
              nameState.states,
            );

            if (nameUpdated) {
              formUpdated = true;
            }

            if (nameValue) {
              formUpdated = true;

              if (namesValuesMap[nameValue]) {
                putFormFieldErrorHelper(nameState.states, [
                  ["field name", "has already been taken"],
                ]);

                hasErrors = true;
              } else {
                namesValuesMap[nameValue] = true;
                dataDefinition.name = nameValue;
                hasValidValue = true;
              }
            }

            const [typeValue, isTypeUpdated] = validateFormStringValuesHelper(
              proxy,
              "data type",
              typeState.states,
              `${EMPTY_ERROR_TEXT}, please select one from dropdown`,
            );

            if (typeValue) {
              dataDefinition.type = typeValue as DataTypes;
              formUpdated = true;
              hasValidValue = true;
            }

            if (isTypeUpdated) {
              formUpdated = true;
            }

            if (hasValidValue) {
              dataDefinitions[index] = dataDefinition;
              input.dataDefinitions = dataDefinitions;
            }
          });
        }
        break;
    }
  });

  if (hasErrors) {
    handleOnCommonErrorAction(proxy, {
      error: FORM_CONTAINS_ERRORS_MESSAGE,
    });
  }

  if (!formUpdated) {
    submissionWarningState.value = StateValue.warning;
    submissionWarningState.warning = {
      context: {
        warning: NOTHING_TO_SAVE_WARNING_MESSAGE,
      },
    };
  }

  return input;
}

function putFormFieldErrorHelper(
  fieldState: FormField["states"],
  errors: FieldError,
) {
  const fieldStateChanged = fieldState as Draft<ChangedState>;
  fieldStateChanged.value = StateValue.changed;

  const changed =
    fieldStateChanged.changed ||
    ({
      states: {},
      context: { formValue: "" },
    } as Draft<ChangedState["changed"]>);

  fieldStateChanged.changed = changed;

  const invalidState = changed.states as Draft<FieldInValid>;
  invalidState.value = StateValue.invalid;
  invalidState.invalid = {
    context: {
      errors,
    },
  };
}

function validateFormStringValuesHelper(
  proxy: DraftState,
  fieldName: string,
  state: Draft<FormField["states"]>,
  emptyErrorText = EMPTY_ERROR_TEXT,
): [string, boolean, boolean] {
  let returnValue = "";
  let updated = false;
  let hasErrors = false;

  if (state.value === StateValue.changed) {
    const {
      changed: {
        context: { formValue },
        states: validityState,
      },
    } = state;

    validityState.value = StateValue.initial;
    const value = formValue.trim();
    updated = true;

    if (value.length < 2) {
      hasErrors = true;

      putFormFieldErrorHelper(state, [
        [fieldName, "must be at least 2 characters long"],
      ]);
    } else {
      returnValue = value;
      validityState.value = StateValue.valid;
    }
  } else {
    putFormFieldErrorHelper(state, [[fieldName, emptyErrorText]]);
    hasErrors = true;
  }

  return [returnValue, updated, hasErrors];
}

function handleOnCommonErrorAction(
  proxy: DraftState,
  payload: StringyErrorPayload,
  scroll: "scroll" | "no-scroll" = "scroll",
) {
  const errors = parseStringError(payload.error);

  const submissionErrorState = proxy.states.submission as Draft<
    SubmissionCommonErrors
  >;

  submissionErrorState.value = StateValue.commonErrors;

  submissionErrorState.commonErrors = {
    context: {
      errors,
    },
  };

  if (scroll === "scroll") {
    const effects = getGeneralEffects(proxy);

    effects.push({
      key: "scrollToViewEffect",
      ownArgs: {
        id: scrollIntoViewDomId,
      },
    });
  }
}

function handleResetFormFieldsAction(proxy: DraftState) {
  const {
    states: {
      submission,
      form: { fields },
    },
  } = proxy;

  submission.value = StateValue.inactive;

  Object.entries(fields).forEach(([fieldName, fieldState]) => {
    switch (fieldName) {
      case "title":
        clearFieldInvalidState(fieldState as FormField);
        break;

      case "description":
        {
          const inactiveState = fieldState as Draft<DescriptionFormField>;
          inactiveState.value = StateValue.active;

          const state = (fieldState as Draft<DescriptionFormFieldActive>).active
            .states;

          state.value = StateValue.unchanged;
        }
        break;

      case "dataDefinitions":
        {
          const defsList = definitionFieldsMapToList(
            fieldState as DataDefinitionFieldsMap,
          );

          defsList.forEach(({ name, type }) => {
            clearFieldInvalidState(name);
            clearFieldInvalidState(type);
          });
        }
        break;
    }
  });

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: scrollIntoViewDomId,
    },
  });
}

function clearFieldInvalidState(formField: Draft<FormField>) {
  const state = formField.states;
  state.value = StateValue.unchanged;

  /* istanbul ignore else*/
  if ((state as ChangedState).changed) {
    (state as Draft<ChangedState>).changed.states.value = StateValue.initial;
  }
}

function definitionFieldsMapToList(defs: DataDefinitionFieldsMap) {
  return Object.values(defs);
}

function definitionFieldsListToMap(
  defs: Draft<DataDefinitionFormField[]>,
): DataDefinitionFieldsMap {
  return defs.reduce((acc, def, index) => {
    def.index = index;
    acc[def.id] = def;
    return acc;
  }, {} as DataDefinitionFieldsMap);
}

function handleAddDefinitionAction(
  proxy: DraftState,
  payload: ChangeDefinitionFieldPayload,
) {
  const fields = proxy.states.form.fields;
  const defsList = definitionFieldsMapToList(fields.dataDefinitions);
  const { index } = payload.data;
  const nextIndex = index + 1;
  const definitionElProperties = makeDataDefinitionFormField(nextIndex);

  defsList.splice(nextIndex, 0, definitionElProperties);

  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: definitionElProperties.id,
    },
  });
}

function handleRemoveDefinitionAction(
  proxy: DraftState,
  payload: ChangeDefinitionFieldPayload,
) {
  const fields = proxy.states.form.fields;
  const defsList = definitionFieldsMapToList(fields.dataDefinitions);
  const { index } = payload.data;
  defsList.splice(index, 1);
  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  const len = defsList.length;
  const lastIndex = len - 1;
  let defToScrollToId = defsList[lastIndex].id;

  if (len !== index) {
    defToScrollToId = defsList[index].id;
  }

  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: defToScrollToId,
    },
  });
}

function handleDownDefinitionAction(
  proxy: DraftState,
  payload: ChangeDefinitionFieldPayload,
) {
  const fields = proxy.states.form.fields;
  const defsList = definitionFieldsMapToList(fields.dataDefinitions);
  const { index } = payload.data;
  const nextIndex = index + 1;

  const downDefinition = defsList[index];
  defsList[index] = defsList[nextIndex];
  defsList[nextIndex] = downDefinition;

  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: downDefinition.id,
    },
  });
}

function handleUpDefinitionAction(
  proxy: DraftState,
  payload: ChangeDefinitionFieldPayload,
) {
  const fields = proxy.states.form.fields;
  const defsList = definitionFieldsMapToList(fields.dataDefinitions);
  const { index } = payload.data;
  const prevIndex = index - 1;

  const upDefinition = defsList[index];
  defsList[index] = defsList[prevIndex];
  defsList[prevIndex] = upDefinition;

  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  proxy.states.form.fields.dataDefinitions = definitionFieldsListToMap(
    defsList,
  );

  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: upDefinition.id,
    },
  });
}

function handleToggleDescriptionAction(proxy: DraftState) {
  const {
    states: {
      form: {
        fields: { description },
      },
    },
  } = proxy;

  description.value =
    description.value === StateValue.active
      ? StateValue.inactive
      : StateValue.active;
}

function handleOnServerErrorsAction(
  proxy: DraftState,
  payload: ServerErrorsPayload,
) {
  proxy.states.submission.value = StateValue.inactive;

  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    __typename,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    meta,
    dataDefinitions: dataDefinitionsErrors,
    title: titleError,
    ...errors
  } = payload.errors;

  const {
    states: {
      form: { fields, validity },
    },
  } = proxy;

  /* istanbul ignore else*/
  if (titleError) {
    const {
      title: { states },
    } = fields;

    putFormFieldErrorHelper(states, [["title", titleError]]);
  }

  if (dataDefinitionsErrors) {
    dataDefinitionsErrors.forEach((d) => {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        __typename,
        index,
        name: nameError,
        type: typeError,
      } = d as CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions;

      const state = definitionFieldsMapToList(fields.dataDefinitions).find(
        (def) => {
          return def.index === index;
        },
      ) as DataDefinitionFormField;

      /* istanbul ignore else*/
      if (nameError) {
        putFormFieldErrorHelper(state.name.states, [["name", nameError]]);
      }

      /* istanbul ignore else*/
      if (typeError) {
        putFormFieldErrorHelper(state.type.states, [["type", typeError]]);
      }
    });
  }

  if (
    Object.values(errors).reduce((acc, v) => {
      if (v) {
        ++acc;
      }
      return acc;
    }, 0)
  ) {
    const formInvalidState = validity as Draft<FormInValid>;
    formInvalidState.value = StateValue.invalid;
    const invalidErrors = [] as FieldError;
    formInvalidState.invalid = {
      context: {
        errors: invalidErrors,
      },
    };

    Object.entries(errors).forEach(([k, v]) => {
      if (v) {
        invalidErrors.push([k, v]);
      }
    });
  } else {
    handleOnCommonErrorAction(
      proxy,
      {
        error: FORM_CONTAINS_ERRORS_MESSAGE,
      },
      "no-scroll",
    );
  }

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: scrollIntoViewDomId,
    },
  });
}

function handleCloseSubmitNotificationAction(proxy: DraftState) {
  const {
    states: {
      submission,
      form: { validity },
    },
  } = proxy;
  submission.value = StateValue.inactive;
  validity.value = StateValue.initial;
}

////////////////////////// END STATE UPDATE SECTION ////////////

////////////////////////// TYPES SECTION ////////////////////////////

export type CallerProps = MyChildDispatchProps;

export type Props = CreateExperiencesComponentProps &
  CreateExperienceOfflineMutationComponentProps &
  CallerProps;

export type Action =
  | ({
      type: ActionType.ON_SERVER_ERRORS;
    } & ServerErrorsPayload)
  | {
      type: ActionType.TOGGLE_DESCRIPTION;
    }
  | ({
      type: ActionType.ADD_DEFINITION;
    } & ChangeDefinitionFieldPayload)
  | ({
      type: ActionType.DOWN_DEFINITION;
    } & ChangeDefinitionFieldPayload)
  | ({
      type: ActionType.UP_DEFINITION;
    } & ChangeDefinitionFieldPayload)
  | ({
      type: ActionType.REMOVE_DEFINITION;
    } & ChangeDefinitionFieldPayload)
  | {
      type: ActionType.CLOSE_SUBMIT_NOTIFICATION;
    }
  | ({
      type: ActionType.ON_COMMON_ERROR;
    } & StringyErrorPayload)
  | {
      type: ActionType.SUBMISSION;
    }
  | {
      type: ActionType.FORM_ERRORS;
    }
  | ({
      type: ActionType.FORM_CHANGED;
    } & FormChangedPayload)
  | {
      type: ActionType.RESET_FORM_FIELDS;
    };

interface ServerErrorsPayload {
  errors: CreateExperiences_createExperiences_CreateExperienceErrors_errors;
}

interface ChangeDefinitionFieldPayload {
  data: DataDefinitionFormField;
}

type FormChangedPayload =
  | NoneDefinitionChangedPayload
  | DefinitionChangedPayload;

interface NoneDefinitionChangedPayload {
  key: "non-def";
  value: string;
  fieldName: keyof StateMachine["states"]["form"]["fields"];
}

interface DefinitionChangedPayload {
  key: "def";
  index: number;
  value: DataTypes | string;
  fieldName: keyof DataDefinitionFieldsMap;
}

////////////////////////// TYPES SECTION ////////////////////

type DraftState = Draft<StateMachine>;

export type StateMachine = Readonly<GenericGeneralEffect<EffectType>> &
  Readonly<{
    states: Readonly<{
      submission: Submission;
      form: Readonly<{
        validity: FormValidity;
        fields: Readonly<{
          title: FormField;
          description: DescriptionFormField;
          dataDefinitions: DataDefinitionFieldsMap;
        }>;
      }>;
    }>;
  }>;

export type FormValidity = Readonly<
  | {
      value: InitialVal;
    }
  | FormInValid
>;

export type Submission = Readonly<
  | {
      value: InActiveVal;
    }
  | Submitting
  | SubmissionCommonErrors
  | SubmissionWarning
>;

type Submitting = Readonly<{
  value: SubmissionVal;
}>;

export type SubmissionCommonErrors = Readonly<{
  value: CommonErrorsVal;
  commonErrors: Readonly<{
    context: Readonly<{
      errors: string;
    }>;
  }>;
}>;

type SubmissionWarning = Readonly<{
  value: WarningVal;
  warning: Readonly<{
    context: Readonly<{
      warning: string;
    }>;
  }>;
}>;

export type DescriptionFormField = Readonly<
  | {
      value: InActiveVal;
    }
  | DescriptionFormFieldActive
>;

type DescriptionFormFieldActive = Readonly<{
  value: ActiveVal;
  active: FormField;
}>;

export interface DataDefinitionFieldsMap {
  [dataDefinitionDomId: string]: DataDefinitionFormField;
}

type DataDefinitionFormField = Readonly<{
  index: number;
  id: string;
  name: FormField;
  type: FormField<DataTypes>;
}>;

export type FormField<Value = string> = Readonly<{
  states:
    | {
        value: UnChangedVal;
      }
    | ChangedState<Value>;
}>;

export type ChangedState<Value = string> = Readonly<{
  value: ChangedVal;
  changed: Readonly<{
    context: {
      formValue: Value;
    };
    states: Readonly<
      | {
          value: InitialVal;
        }
      | {
          value: ValidVal;
        }
      | FieldInValid
    >;
  }>;
}>;

export type FieldInValid = Readonly<{
  value: InvalidVal;
  invalid: Readonly<{
    context: {
      errors: FieldError;
    };
  }>;
}>;

export type FormInValid = Readonly<{
  value: InvalidVal;
  invalid: Readonly<{
    context: Readonly<{
      errors: FieldError;
    }>;
  }>;
}>;

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type EffectType = DefScrollToViewEffect | DefSubmissionEffect;
export type EffectState = GenericHasEffect<EffectType>;
type EffectList = EffectType[];

export type DispatchType = Dispatch<Action>;
