import { Reducer, Dispatch } from "react";
import immer, { Draft } from "immer";
import {
  CreateExperienceInput,
  CreateDataDefinition,
  DataTypes,
  UpdateExperienceInput,
  UpdateDefinitionInput,
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
  CreateExperiencesOnlineComponentProps,
  CreateExperiencesMutationFn,
  UpdateExperiencesOnlineComponentProps,
  manuallyFetchExperience,
  updateExperiencesOnlineEffectHelperFunc,
  manuallyGetDataObjects,
} from "../../utils/experience.gql.types";
import { getIsConnected } from "../../utils/connections";
import {
  CreateExperiences_createExperiences_CreateExperienceErrors_errors,
  CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions,
} from "../../graphql/apollo-types/CreateExperiences";
import { createExperiencesManualUpdate } from "../../apollo/create-experiences-manual-update";
import { scrollIntoViewDomId } from "./upsert-experience.dom";
import {
  createOfflineExperience,
  updateExperienceOfflineFn,
} from "./upsert-experience.resolvers";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { windowChangeUrl, ChangeUrlType } from "../../utils/global-window";
import { v4 } from "uuid";
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
  UpdateVal,
  InsertVal,
  ReactMouseAnchorEvent,
  OnlineStatus,
} from "../../utils/types";
import {
  CreateExperienceErrorsFragment,
  CreateExperienceErrorsFragment_errors,
} from "../../graphql/apollo-types/CreateExperienceErrorsFragment";
import { CreateExperienceSuccessFragment } from "../../graphql/apollo-types/CreateExperienceSuccessFragment";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import {
  getExperienceQuery,
  getEntriesQuerySuccess,
} from "../../apollo/get-detailed-experience-query";
import { EntryConnectionFragment_edges } from "../../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { isOfflineId } from "../../utils/offlines";

export const fieldTypeKeys = Object.values(DataTypes);

export enum ActionType {
  SUBMISSION = "@upsert-experience/submission",
  FORM_ERRORS = "@upsert-experience/form-errors",
  ON_COMMON_ERROR = "@upsert-experience/on-common-error",
  CLOSE_SUBMIT_NOTIFICATION = "@definition/close-submit-notification",
  FORM_CHANGED = "@upsert-experience/form-changed",
  RESET_FORM_FIELDS = "@upsert-experience/reset-form-fields",
  ON_SERVER_ERRORS = "@upsert-experience/on-server-errors",
  ADD_DEFINITION = "@upsert-experience/add-definition",
  REMOVE_DEFINITION = "@upsert-experience/remove-definition",
  DOWN_DEFINITION = "@upsert-experience/down-definition",
  UP_DEFINITION = "@upsert-experience/up-definition",
  TOGGLE_DESCRIPTION = "@upsert-experience/toggle-description",
  ON_EXPERIENCE_FETCHED_SUCCESS = "@upsert-experience/on-experience-fetched-success",
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

          case ActionType.ON_EXPERIENCE_FETCHED_SUCCESS:
            handleOnExperienceFetchedSuccessAction(
              proxy,
              payload as ExperienceFragment,
            );
            break;
        }
      });
    },
    // true,
  );

////////////////////////// EFFECTS SECTION /////////////////////////

const insertExperienceEffect: DefInsertExperienceEffect["func"] = (
  args,
  props,
  effectArgs,
) => {
  const { input } = args;

  if (getIsConnected()) {
    const { createExperiences } = props;
    const { dispatch } = effectArgs;

    createExperienceOnlineEffect(input, createExperiences, async (data) => {
      switch (data.key) {
        case "ExperienceSuccess":
          await window.____ebnis.persistor.persist();

          windowChangeUrl(
            makeDetailedExperienceRoute(data.data.experience.id),
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
  };
}

async function createExperienceOfflineEffect(
  input: CreateExperienceInput,
  props: Props,
  effectArgs: EffectArgs,
) {
  const { dispatch } = effectArgs;
  const variables = ceateExperienceInputMutationFunctionVariable(input);

  const result = await createOfflineExperience(variables);

  if (!result) {
    dispatch({
      type: ActionType.ON_COMMON_ERROR,
      error: GENERIC_SERVER_ERROR,
    });
  } else {
    if ("string" === typeof result) {
      dispatch({
        type: ActionType.ON_SERVER_ERRORS,
        errors: {
          title: result,
        } as CreateExperiences_createExperiences_CreateExperienceErrors_errors,
      });
    } else {
      const experienceId = result.id;
      await window.____ebnis.persistor.persist();
      windowChangeUrl(
        makeDetailedExperienceRoute(experienceId),
        ChangeUrlType.goTo,
      );
    }
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
      data: CreateExperienceSuccessFragment;
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
      onEvent({
        key: "ExperienceSuccess",
        data: response,
      });
    }
  } catch (error) {
    onEvent({
      key: "exception",
      error,
    });
  }
}

type DefInsertExperienceEffect = EffectDefinition<
  "insertExperienceEffect",
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

const fetchExperienceEffect: DefFetchExperienceEffect["func"] = async (
  { experienceId },
  { onError },
  effectArgs,
) => {
  const { dispatch } = effectArgs;

  try {
    const x = await manuallyFetchExperience({
      id: experienceId,
    });

    const y = x && x.data && x.data.getExperience;

    if (!y) {
      onError(GENERIC_SERVER_ERROR);
      return;
    }

    dispatch({
      type: ActionType.ON_EXPERIENCE_FETCHED_SUCCESS,
      ...y,
    });
  } catch (error) {
    onError(parseStringError(error));
  }
};

type DefFetchExperienceEffect = EffectDefinition<
  "fetchExperienceEffect",
  {
    experienceId: string;
  }
>;

const updateExperienceEffect: DefUpdateExperienceEffect["func"] = (
  { input, experience },
  props,
  effectArgs,
) => {
  const { updateExperiencesOnline, onSuccess } = props;
  if (getIsConnected()) {
    const { dispatch } = effectArgs;

    updateExperiencesOnlineEffectHelperFunc({
      input: [input],
      updateExperiencesOnline,
      onUpdateSuccess: async (successArgs) => {
        const { experienceId } = successArgs.experience;

        const updatedExperience = getExperienceQuery(
          experienceId,
        ) as ExperienceFragment;

        const inputChanged =
          input.updateDefinitions &&
          input.updateDefinitions.find((d) => !!d.type);

        // istanbul ignore else:
        if (inputChanged) {
          const entries = getEntriesQuerySuccess(experienceId)
            .edges as EntryConnectionFragment_edges[];

          // istanbul ignore else:
          if (entries.length) {
            const dataObjectsIds = entries.flatMap((e) => {
              const ds = (e.node as EntryFragment)
                .dataObjects as DataObjectFragment[];

              return ds.map((d) => d.id);
            });

            await manuallyGetDataObjects({
              ids: dataObjectsIds,
            });
          }
        }

        onSuccess(updatedExperience, StateValue.online);
      },
      onError: (errors) => {
        // istanbul ignore else:
        if (errors) {
          dispatch({
            type: ActionType.ON_COMMON_ERROR,
            error: errors,
          });
        }
      },
    });
  } else {
    const updatedExperience = updateExperienceOfflineFn(
      input,
    ) as ExperienceFragment;

    const onlineStatus = isOfflineId(updatedExperience.id)
      ? StateValue.offline
      : StateValue.partOffline;

    onSuccess(updatedExperience as ExperienceFragment, onlineStatus);
  }
};

type DefUpdateExperienceEffect = EffectDefinition<
  "updateExperienceEffect",
  {
    input: UpdateExperienceInput;
    experience: ExperienceFragment;
  }
>;

export const effectFunctions = {
  insertExperienceEffect,
  scrollToViewEffect,
  fetchExperienceEffect,
  updateExperienceEffect,
};

////////////////////////// END EFFECTS SECTION /////////////////////////

////////////////////////// STATE UPDATE SECTION /////////////////

export function initState(props: Props): StateMachine {
  const { title, id: experienceId } = (props.experience ||
    {}) as ExperienceFragment;

  const emptyDefinition = makeDataDefinitionFormField(0);

  const fields = {
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
      [emptyDefinition.id]: emptyDefinition,
    },
  };

  const effects = experienceId
    ? {
        value: StateValue.hasEffects,
        hasEffects: {
          context: {
            effects: [
              {
                key: "fetchExperienceEffect" as "fetchExperienceEffect",
                ownArgs: {
                  experienceId,
                },
              },
            ],
          },
        },
      }
    : {
        value: StateValue.noEffect,
      };

  return {
    effects: {
      general: effects,
    },
    context: {
      title,
      header: title ? "Update Experience" : "Create New Experience",
    },
    states: {
      submission: {
        value: StateValue.inactive,
      },
      form: {
        validity: {
          value: StateValue.initial,
        },
        fields,
      },
      mode: {
        value: StateValue.insert,
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
    context: {
      formValue: value,
    },
    states: {
      value: StateValue.initial,
    },
  };

  state.changed.context.formValue = value;
}

function handleSubmissionAction(proxy: DraftState) {
  const {
    states: { submission, mode },
  } = proxy;

  const effects = getGeneralEffects<EffectType, DraftState>(proxy);
  submission.value = StateValue.inactive;

  const [insertInput, updateInput] = validateForm(proxy);
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

  if (mode.value === StateValue.update) {
    effects.push({
      key: "updateExperienceEffect",
      ownArgs: {
        input: updateInput,
        experience: mode.update.context.experience,
      },
    });
  } else {
    effects.push({
      key: "insertExperienceEffect",
      ownArgs: {
        input: insertInput,
      },
    });
  }
}

const EMPTY_ERROR_TEXT = "is a required field";

const definition_type_to_changes_map = {
  [DataTypes.DATE]: DataTypes.DATETIME,
  [DataTypes.DATETIME]: DataTypes.DATE,
  [DataTypes.DECIMAL]: DataTypes.INTEGER,
  [DataTypes.INTEGER]: DataTypes.DECIMAL,
};

function validateForm(
  proxy: DraftState,
): [CreateExperienceInput, UpdateExperienceInput] {
  const {
    states: {
      submission,
      form: { fields },
      mode,
    },
  } = proxy;

  const submissionWarningState = submission as Draft<SubmissionWarning>;

  const insertInput = {} as CreateExperienceInput;
  const isUpdating = mode.value === StateValue.update;

  const {
    title,
    description,
    dataDefinitions,
    id: experienceId,
  } = (mode.value === StateValue.update
    ? mode.update.context.experience
    : {}) as ExperienceFragment;

  const updateInput = {
    experienceId,
  } as UpdateExperienceInput;

  const unchangedDefinitions = mapDefinitionIdToDefinitionHelper(
    dataDefinitions,
  );

  let formUpdated = false;
  let hasErrors = false;

  Object.entries(fields).forEach(([fieldName, fieldState]) => {
    switch (fieldName) {
      case "title":
        {
          const state = (fieldState as FormField).states;

          const [formValue, withErrors] = validateFormStringValuesHelper(
            proxy,
            "title",
            state,
          );

          hasErrors = hasErrors || withErrors;

          if (isUpdating) {
            if (title !== formValue) {
              formUpdated = true;

              updateInput.ownFields = {
                title: formValue,
              };
            }
          } else if (formValue) {
            formUpdated = true;
            insertInput.title = formValue;
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

            if (isUpdating) {
              if ((description || "") !== value) {
                formUpdated = true;
                validityState.value = StateValue.valid;
                const ownFields =
                  updateInput.ownFields ||
                  // istanbul ignore next:
                  {};
                ownFields.description =
                  value ||
                  // istanbul ignore next:
                  null;
                updateInput.ownFields = ownFields;
              }
            }

            // Istanbul does not like else if
            if (!isUpdating && value) {
              formUpdated = true;
              insertInput.description = value;
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

          const [
            insertDefinitionInputs,
            updateDefinitionInputs,
          ] = defsList.reduce(
            (
              [insertDataDefinitionInputs, updateDataDefinitionInputs],
              { name: nameState, type: typeState, id },
            ) => {
              const [nameValue, hasNameErrors] = validateFormStringValuesHelper(
                proxy,
                "field name",
                nameState.states,
              );

              const insertDefinitionInput = {} as CreateDataDefinition;
              const updateDefinitionInput = {} as UpdateDefinitionInput;
              const unchangedDefinition = unchangedDefinitions[id];

              hasErrors = hasErrors || hasNameErrors;

              if (namesValuesMap[nameValue]) {
                putFormFieldErrorHelper(nameState.states, [
                  ["field name", "has already been taken"],
                ]);

                hasErrors = true;
              } else {
                namesValuesMap[nameValue] = true;

                if (unchangedDefinition) {
                  if (unchangedDefinition.name !== nameValue) {
                    formUpdated = true;
                    updateDefinitionInput.name = nameValue;
                  }
                } else if (nameValue) {
                  formUpdated = true;
                  insertDefinitionInput.name = nameValue;
                }
              }

              const typeFieldName = "data type";

              const [typeValue, hasTypeErrors] = validateFormStringValuesHelper(
                proxy,
                typeFieldName,
                typeState.states,
                `${EMPTY_ERROR_TEXT}, please select one from dropdown`,
              );

              hasErrors = hasErrors || hasTypeErrors;

              if (unchangedDefinition) {
                const oldType = unchangedDefinition.type;

                if (oldType !== typeValue) {
                  formUpdated = true;

                  const isValid = validateDefinitionType(oldType, typeValue);

                  if (isValid === true) {
                    updateDefinitionInput.type = typeValue as DataTypes;
                  } else {
                    hasErrors = true;
                    putFormFieldErrorHelper(typeState.states, [["", isValid]]);
                  }
                }
              } else if (typeValue) {
                insertDefinitionInput.type = typeValue as DataTypes;
                formUpdated = true;
              }

              if (Object.keys(insertDefinitionInput).length) {
                insertDataDefinitionInputs.push(insertDefinitionInput);
              }

              if (Object.keys(updateDefinitionInput).length) {
                updateDefinitionInput.id = id;
                updateDataDefinitionInputs.push(updateDefinitionInput);
              }

              return [insertDataDefinitionInputs, updateDataDefinitionInputs];
            },
            [[], []] as [CreateDataDefinition[], UpdateDefinitionInput[]],
          );

          if (insertDefinitionInputs.length) {
            insertInput.dataDefinitions = insertDefinitionInputs;
          }

          if (updateDefinitionInputs.length) {
            updateInput.updateDefinitions = updateDefinitionInputs;
          }
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

  return [insertInput, updateInput];
}

function validateDefinitionType(old: string, newType: string) {
  if (
    newType === DataTypes.SINGLE_LINE_TEXT ||
    newType === DataTypes.MULTI_LINE_TEXT
  ) {
    return true;
  }

  const validChangeType = definition_type_to_changes_map[old];

  if (validChangeType === newType) {
    return true;
  }

  return `${old} can only be changed to ${validChangeType}, ${DataTypes.SINGLE_LINE_TEXT} and ${DataTypes.MULTI_LINE_TEXT}`;
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
): [string, boolean] {
  let returnValue = "";
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

  return [returnValue, hasErrors];
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
      mode,
    },
  } = proxy;

  submission.value = StateValue.inactive;

  const effects = getGeneralEffects(proxy);

  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: scrollIntoViewDomId,
    },
  });

  if (mode.value === StateValue.update) {
    handleOnExperienceFetchedSuccessAction(
      proxy,
      mode.update.context.experience,
    );
    return;
  }

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

function handleOnExperienceFetchedSuccessAction(
  proxy: DraftState,
  payload: ExperienceFragment,
) {
  const {
    states: {
      form: { fields },
    },
  } = proxy;

  const { title, description, dataDefinitions } = payload;

  proxy.states.mode = {
    value: StateValue.update,
    update: {
      context: {
        experience: payload,
      },
    },
  };

  handleFormChangedAction(proxy, {
    key: "non-def",
    fieldName: "title",
    value: title,
  });

  handleFormChangedAction(proxy, {
    key: "non-def",
    fieldName: "description",
    value: description || "",
  });

  const dataDefinitionMap = {} as DataDefinitionFieldsMap;

  dataDefinitions.forEach((d, index) => {
    const { name, type, id } = d as DataDefinitionFragment;

    dataDefinitionMap[index] = {
      index,
      id,
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

    fields.dataDefinitions = dataDefinitionMap;

    handleFormChangedAction(proxy, {
      key: "def",
      fieldName: "name",
      value: name,
      index,
    });

    handleFormChangedAction(proxy, {
      key: "def",
      fieldName: "type",
      value: type,
      index,
    });
  });
}

function makeDataDefinitionFormField(index: number): DataDefinitionFormField {
  return {
    index,
    id: v4(),
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

function mapDefinitionIdToDefinitionHelper(
  dataDefinitions?: DataDefinitionFragment[],
) {
  return (dataDefinitions || ([] as DataDefinitionFragment[])).reduce(
    (acc, d) => {
      acc[d.id] = d;
      return acc;
    },
    {} as { [definitionId: string]: DataDefinitionFragment },
  );
}

////////////////////////// END STATE UPDATE SECTION ////////////

////////////////////////// TYPES SECTION ////////////////////////////

export type CallerProps = {
  onSuccess: (
    experience: ExperienceFragment,
    onlineStatus: OnlineStatus,
  ) => void;
  onClose: (e: ReactMouseAnchorEvent) => void;
  experience?: {
    id: string;
    title: string;
  };
  onError: (error: string) => void;
};

export type Props = CreateExperiencesOnlineComponentProps &
  UpdateExperiencesOnlineComponentProps &
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
    }
  | ({
      type: ActionType.ON_EXPERIENCE_FETCHED_SUCCESS;
    } & ExperienceFragment);

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
    context: Readonly<{
      header: string;
      title?: string;
    }>;
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
      mode:
        | Readonly<{
            value: InsertVal;
          }>
        | UpdateState;
    }>;
  }>;

type UpdateState = Readonly<{
  value: UpdateVal;
  update: Readonly<{
    context: {
      experience: ExperienceFragment;
    };
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

type EffectType =
  | DefScrollToViewEffect
  | DefInsertExperienceEffect
  | DefFetchExperienceEffect
  | DefUpdateExperienceEffect;

export type EffectState = GenericHasEffect<EffectType>;
type EffectList = EffectType[];

export type DispatchType = Dispatch<Action>;
