import {
  CreateExperienceErrorsFragment,
  CreateExperienceErrorsFragment_errors,
} from "@eb/cm/src/graphql/apollo-types/CreateExperienceErrorsFragment";
import {
  CreateExperiences_createExperiences_CreateExperienceErrors_errors,
  CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions,
} from "@eb/cm/src/graphql/apollo-types/CreateExperiences";
import { CreateExperienceSuccessFragment } from "@eb/cm/src/graphql/apollo-types/CreateExperienceSuccessFragment";
import { DataDefinitionFragment } from "@eb/cm/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment_edges } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import {
  CreateDataDefinition,
  CreateExperienceInput,
  DataTypes,
  UpdateDefinitionInput,
  UpdateExperienceInput,
} from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  ActiveVal,
  Any,
  ChangedVal,
  CommonErrorsVal,
  InActiveVal,
  InitialVal,
  InsertVal,
  InvalidVal,
  OnlineStatus,
  StateValue,
  SubmissionVal,
  UnChangedVal,
  UpdateVal,
  ValidVal,
  WarningVal,
} from "@eb/cm/src/utils/types";
import { ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import immer from "immer";
import { Dispatch, Reducer } from "react";
import { v4 } from "uuid";
import { createExperiencesManualUpdate } from "../../apollo/create-experiences-manual-update";
import { getCachedEntriesDetailViewSuccess } from "../../apollo/get-detailed-experience-query";
import { wrapReducer } from "@eb/cm/src/logger";
import { deleteObjectKey } from "../../utils";
import {
  FieldError,
  FORM_CONTAINS_ERRORS_MESSAGE,
  GENERIC_SERVER_ERROR,
  NOTHING_TO_SAVE_WARNING_MESSAGE,
  parseStringError,
  StringyErrorPayload,
} from "../../utils/common-errors";
import { getIsConnected } from "../../utils/connections";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  GenericHasEffect,
  getGeneralEffects,
} from "../../utils/effects";
import {
  CreateExperiencesMutationFn,
  CreateExperiencesOnlineComponentProps,
  getExperienceDetailView,
  getGetDataObjects,
} from "../../utils/experience.gql.types";
import { ChangeUrlType, windowChangeUrl } from "../../utils/global-window";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { makeDetailedExperienceRoute } from "../../utils/urls";
import { scrollIntoViewDomId } from "./upsert-experience.dom";
import {
  createOfflineExperience,
  updateExperienceOfflineFn,
} from "./upsert-experience.resolvers";

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
  ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS = "@upsert-experience/on-experience-fetched-success",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

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

          case ActionType.ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS:
            handleOnExperienceFetchedSuccessAction(
              proxy,
              payload as OnExperienceDetailedViewFetchedSuccessPayload,
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
  _: Props,
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
    const x = await getExperienceDetailView({
      id: experienceId,
    });

    const experience = x && x.data && x.data.getExperience;

    if (!experience) {
      onError(GENERIC_SERVER_ERROR);
      return;
    }

    dispatch({
      type: ActionType.ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS,
      experience,
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
  { input },
  props,
  effectArgs,
) => {
  const { onSuccess } = props;
  if (getIsConnected()) {
    const { dispatch } = effectArgs;

    updateExperiencesMutation({
      input: [input],
      onUpdateSuccess: async (successArgs, updatedExperience) => {
        const { experienceId } = successArgs.experience;

        const inputChanged =
          input.updateDefinitions &&
          input.updateDefinitions.find((d) => !!d.type);

        // istanbul ignore else:
        if (inputChanged) {
          const entries = getCachedEntriesDetailViewSuccess(experienceId)
            .edges as EntryConnectionFragment_edges[];

          // istanbul ignore else:
          if (entries.length) {
            const dataObjectsIds = entries.flatMap((e) => {
              const ds = (e.node as EntryFragment)
                .dataObjects as DataObjectFragment[];

              return ds.map((d) => d.id);
            });

            await getGetDataObjects({
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
    ) as ExperienceDetailViewFragment;

    const onlineStatus = isOfflineId(updatedExperience.id)
      ? StateValue.offline
      : StateValue.partOffline;

    onSuccess(updatedExperience as ExperienceDetailViewFragment, onlineStatus);
  }
};

type DefUpdateExperienceEffect = EffectDefinition<
  "updateExperienceEffect",
  {
    input: UpdateExperienceInput;
    experience: ExperienceDetailViewFragment;
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
    {}) as ExperienceDetailViewFragment;

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
    comment: {
      states: {
        value: StateValue.unchanged,
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
    id: "@upsert-experience",
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

  if (payload.key === "non-def") {
    const field = fields[fieldName as KeyOfFormFields];

    switch (fieldName) {
      case "title":
      case "comment":
        state = (field as FormField).states as ChangedState;
        break;

      case "description":
        state = (field as DescriptionFormFieldActive).active
          .states as ChangedState;
        break;
    }
  } else {
    const { index } = payload;

    const defAttrs = definitionFieldsMapToList(fields.dataDefinitions).find(
      (def) => {
        return def.index === index;
      },
    ) as DataDefinitionFormField;

    const field = defAttrs[fieldName as DataDefinitionFieldKey];
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

function handleSubmissionAction(proxy: StateMachine) {
  const {
    states: { submission, mode },
  } = proxy;

  const effects = getGeneralEffects<EffectType, StateMachine>(proxy);
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
} as {
  [key: string]: DataTypes;
};

function validateForm(
  proxy: StateMachine,
): [CreateExperienceInput, UpdateExperienceInput] {
  const {
    states: {
      submission,
      form: { fields },
      mode,
    },
  } = proxy;

  const submissionWarningState = submission as SubmissionWarning;

  const insertInput = {} as CreateExperienceInput;
  const isUpdating = mode.value === StateValue.update;

  const {
    title,
    description,
    dataDefinitions,
    id: experienceId,
  } = (mode.value === StateValue.update
    ? mode.update.context.experience
    : {}) as ExperienceDetailViewFragment;

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

          const state = (fieldState as DescriptionFormFieldActive).active
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

      case "comment":
        {
          const state = (fieldState as FormField).states;

          if (state.value === StateValue.changed) {
            const {
              changed: {
                context: { formValue },
                states: validityState,
              },
            } = state;

            const value = formValue.trim();

            if (value) {
              formUpdated = true;
              insertInput.commentText = value;
              validityState.value = StateValue.valid;
            }
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
  const fieldStateChanged = fieldState as ChangedState;
  fieldStateChanged.value = StateValue.changed;

  const changed =
    fieldStateChanged.changed ||
    ({
      states: {},
      context: { formValue: "" },
    } as ChangedState["changed"]);

  fieldStateChanged.changed = changed;

  const invalidState = changed.states as FieldInValid;
  invalidState.value = StateValue.invalid;
  invalidState.invalid = {
    context: {
      errors,
    },
  };
}

function validateFormStringValuesHelper(
  _: StateMachine,
  fieldName: string,
  state: FormField["states"],
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
  proxy: StateMachine,
  payload: StringyErrorPayload,
  scroll: "scroll" | "no-scroll" = "scroll",
) {
  const errors = parseStringError(payload.error);

  const submissionErrorState = proxy.states
    .submission as SubmissionCommonErrors;

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

function handleResetFormFieldsAction(proxy: StateMachine) {
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
    handleOnExperienceFetchedSuccessAction(proxy, {
      experience: mode.update.context.experience,
    });
    return;
  }

  Object.entries(fields).forEach(([fieldName, fieldState]) => {
    switch (fieldName) {
      case "title":
        clearFieldInvalidState(fieldState as FormField);
        break;

      case "description":
        {
          const inactiveState = fieldState as DescriptionFormField;
          inactiveState.value = StateValue.active;

          const state = (fieldState as DescriptionFormFieldActive).active
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

function clearFieldInvalidState(formField: FormField) {
  const state = formField.states;
  state.value = StateValue.unchanged;

  /* istanbul ignore else*/
  if ((state as ChangedState).changed) {
    (state as ChangedState).changed.states.value = StateValue.initial;
  }
}

function definitionFieldsMapToList(defs: DataDefinitionFieldsMap) {
  return Object.values(defs);
}

function definitionFieldsListToMap(
  defs: DataDefinitionFormField[],
): DataDefinitionFieldsMap {
  return defs.reduce((acc, def, index) => {
    def.index = index;
    acc[def.id] = def;
    return acc;
  }, {} as DataDefinitionFieldsMap);
}

function handleAddDefinitionAction(
  proxy: StateMachine,
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
  proxy: StateMachine,
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
  proxy: StateMachine,
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
  proxy: StateMachine,
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

function handleToggleDescriptionAction(proxy: StateMachine) {
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
  proxy: StateMachine,
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
      const defErrors = d as CreateExperiences_createExperiences_CreateExperienceErrors_errors_dataDefinitions;

      const index = defErrors.index;
      const nameError = defErrors.name;
      const typeError = defErrors.type;

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
    const formInvalidState = validity as FormInValid;
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

function handleCloseSubmitNotificationAction(proxy: StateMachine) {
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
  proxy: StateMachine,
  payload: OnExperienceDetailedViewFetchedSuccessPayload,
) {
  const {
    states: {
      form: { fields },
    },
  } = proxy;

  const { experience } = payload;
  const { title, description, dataDefinitions } = experience;

  proxy.states.mode = {
    value: StateValue.update,
    update: {
      context: {
        experience,
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
    experience: ExperienceDetailViewFragment,
    onlineStatus: OnlineStatus,
  ) => void;
  onClose: (e: ReactMouseEvent) => void;
  experience?: {
    id: string;
    title: string;
  };
  onError: (error: string) => void;
  className?: string;
};

export type Props = CreateExperiencesOnlineComponentProps & CallerProps;

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
      type: ActionType.ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS;
    } & OnExperienceDetailedViewFetchedSuccessPayload);

interface OnExperienceDetailedViewFetchedSuccessPayload {
  experience: ExperienceDetailViewFragment;
}

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
  fieldName: KeyOfFormFields;
}

interface DefinitionChangedPayload {
  key: "def";
  index: number;
  value: DataTypes | string;
  fieldName: DataDefinitionFieldKey;
}

type DataDefinitionFieldKey = "name" | "type";

////////////////////////// TYPES SECTION ////////////////////

export type StateMachine = GenericGeneralEffect<EffectType> & {
  context: {
    header: string;
    title?: string;
  };
  states: {
    submission: Submission;
    form: FormFields;
    mode:
      | {
          value: InsertVal;
        }
      | UpdateState;
  };
};

type FormFields = {
  validity: FormValidity;
  fields: {
    title: FormField;
    comment: FormField;
    description: DescriptionFormField;
    dataDefinitions: DataDefinitionFieldsMap;
  };
};

type KeyOfFormFields = keyof FormFields["fields"];

type UpdateState = {
  value: UpdateVal;
  update: {
    context: {
      experience: ExperienceDetailViewFragment;
    };
  };
};

export type FormValidity =
  | {
      value: InitialVal;
    }
  | FormInValid;

export type Submission =
  | {
      value: InActiveVal;
    }
  | Submitting
  | SubmissionCommonErrors
  | SubmissionWarning;

type Submitting = {
  value: SubmissionVal;
};

export type SubmissionCommonErrors = {
  value: CommonErrorsVal;
  commonErrors: {
    context: {
      errors: string;
    };
  };
};

type SubmissionWarning = {
  value: WarningVal;
  warning: {
    context: {
      warning: string;
    };
  };
};

export type DescriptionFormField =
  | {
      value: InActiveVal;
    }
  | DescriptionFormFieldActive;

type DescriptionFormFieldActive = {
  value: ActiveVal;
  active: FormField;
};

export interface DataDefinitionFieldsMap {
  [dataDefinitionDomId: string]: DataDefinitionFormField;
}

type DataDefinitionFormField = {
  index: number;
  id: string;
  name: FormField;
  type: FormField<DataTypes>;
};

export type FormField<Value = string> = {
  states:
    | {
        value: UnChangedVal;
      }
    | ChangedState<Value>;
};

export type ChangedState<Value = string> = {
  value: ChangedVal;
  changed: {
    context: {
      formValue: Value;
    };
    states:
      | {
          value: InitialVal;
        }
      | {
          value: ValidVal;
        }
      | FieldInValid;
  };
};

export type FieldInValid = {
  value: InvalidVal;
  invalid: {
    context: {
      errors: FieldError;
    };
  };
};

export type FormInValid = {
  value: InvalidVal;
  invalid: {
    context: {
      errors: FieldError;
    };
  };
};

export interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Any
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;

type EffectType =
  | DefScrollToViewEffect
  | DefInsertExperienceEffect
  | DefFetchExperienceEffect
  | DefUpdateExperienceEffect;

export type EffectState = GenericHasEffect<EffectType>;

export type DispatchType = Dispatch<Action>;
