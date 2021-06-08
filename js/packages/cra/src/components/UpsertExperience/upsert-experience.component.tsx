import { ChevronDown, ChevronUp } from "@eb/jsx/src/components";
import Button from "@eb/jsx/src/components/Button/button.component";
import Modal from "@eb/jsx/src/components/Modal/modal.component";
import Notification from "@eb/jsx/src/components/Notification/notification.component";
import { Input, Label, Select, Textarea } from "@eb/jsx/src/Input";
import { useCreateExperiencesMutation } from "@eb/shared/src/apollo/experience.gql.types";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { ChangeEvent, FormEvent, useCallback, useReducer } from "react";
import { FieldError } from "../../utils/common-errors";
import { InputChangeEvent } from "../../utils/types";
import { useRunEffects } from "../../utils/use-run-effects";
import { errorClassName, warningClassName } from "../../utils/utils.dom";
import { FormCtrlError } from "../FormCtrlError/form-ctrl-error.component";
import Loading from "../Loading/loading.component";
import {
  addDefinitionSelector,
  commentInputDomId,
  definitionContainerDomSelector,
  definitionNameFormControlSelector,
  definitionNameInputDomId,
  definitionTypeFormControlSelector,
  definitionTypeInputDomId,
  descriptionHideSelector,
  descriptionInputDomId,
  descriptionShowSelector,
  descriptionToggleSelector,
  disposeComponentDomId,
  domPrefix,
  fieldErrorIndicatorSelector,
  fieldErrorSelector,
  fieldSelector,
  hiddenSelector,
  makeDefinitionTypeOptionDomId,
  moveDownDefinitionSelector,
  moveUpDefinitionSelector,
  notificationCloseId,
  notificationElementSelector,
  removeDefinitionSelector,
  resetDomId,
  scrollIntoViewDomId,
  submitDomId,
  titleInputDomId,
} from "./upsert-experience.dom";
import {
  ActionType,
  CallerProps,
  DataDefinitionFieldsMap,
  DescriptionFormField,
  DispatchType,
  effectFunctions,
  fieldTypeKeys,
  FormField,
  FormValidity,
  initState,
  Props,
  reducer,
  Submission,
} from "./upsert-experience.utils";

export function UpsertExperience(props: Props) {
  const { onClose, className = "" } = props;
  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states: {
      submission: submissionState,
      form: {
        validity: formValidity,
        fields: {
          title: titleState,
          comment: commentState,
          description: descriptionState,
          dataDefinitions: dataDefinitionsStates,
        },
      },
      mode,
    },
    effects: { general: generalEffects },
    context: { header, title },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const onSubmit = useCallback((e: FormEvent) => {
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

  const onToggleDescription = useCallback(() => {
    dispatch({
      type: ActionType.TOGGLE_DESCRIPTION,
    });
  }, []);

  const onDescriptionChanged = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const node = e.currentTarget;
      dispatch({
        type: ActionType.FORM_CHANGED,
        key: "non-def",
        value: node.value,
        fieldName: "description",
      });
    },
    [],
  );

  const onTitleChanged = useCallback((e: InputChangeEvent) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      key: "non-def",
      value: node.value,
      fieldName: "title",
    });
  }, []);

  const onCommentChanged = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const node = e.currentTarget;
      dispatch({
        type: ActionType.FORM_CHANGED,
        key: "non-def",
        value: node.value,
        fieldName: "comment",
      });
    },
    [],
  );

  return (
    <Modal top onClose={onClose}>
      <form
        className={cn("component-upsert-experience", className || "")}
        onSubmit={onSubmit}
        id={domPrefix}
      >
        <Modal.Card>
          <Modal.Header id={disposeComponentDomId}>
            <div>
              <p className={cn("font-bold text-xl")}>{header}</p>
              {title && <p className={cn("mt-3 text-xs italic")}>{title}</p>}
            </div>
          </Modal.Header>

          <Modal.Body>
            <span className="modal-scroll-into-view" id={scrollIntoViewDomId} />

            <ErrorOrWarning
              formValidity={formValidity}
              submissionState={submissionState}
              onCloseNotification={onCloseNotification}
            />

            <TitleComponent
              state={titleState}
              onTitleChanged={onTitleChanged}
            />

            <DescriptionComponent
              state={descriptionState}
              onToggleDescription={onToggleDescription}
              onDescriptionChanged={onDescriptionChanged}
            />

            <DataDefinitionsComponent
              states={dataDefinitionsStates}
              dispatch={dispatch}
            />

            {mode.value === StateValue.insert && (
              <CommentComponent
                state={commentState}
                onCommentChanged={onCommentChanged}
              />
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="submit"
              id={submitDomId}
              isRounded
              btnType={ComponentColorType.is_primary}
              className={cn("mr-5")}
            >
              Save changes
            </Button>

            <Button
              isRounded
              btnType={ComponentColorType.is_warning}
              id={resetDomId}
              type="button"
              onClick={() => {
                dispatch({
                  type: ActionType.RESET_FORM_FIELDS,
                });
              }}
            >
              Reset
            </Button>
          </Modal.Footer>
        </Modal.Card>
      </form>
    </Modal>
  );
}

function ErrorOrWarning({
  submissionState,
  onCloseNotification,
  formValidity,
}: {
  submissionState: Submission;
  onCloseNotification: () => void;
  formValidity: FormValidity;
}) {
  if (submissionState.value === StateValue.submitting) {
    return <Loading />;
  }

  let warningText = "";
  let errorText = "" as React.ReactNode;

  if (formValidity.value === StateValue.invalid) {
    const errors = formValidity.invalid.context.errors;

    errorText = errors.map(([name, errorString]) => {
      return (
        <div key={name}>
          <span>Errors while creating experience</span>

          <div>
            {name}: {errorString}
          </div>
        </div>
      );
    });
  } else if (submissionState.value === StateValue.commonErrors) {
    errorText = submissionState.commonErrors.context.errors;
  } else if (submissionState.value === StateValue.warning) {
    warningText = submissionState.warning.context.warning;
  }

  return warningText || errorText ? (
    <Notification
      className={cn(
        notificationElementSelector,
        warningText ? warningClassName : errorClassName,
      )}
      id={notificationCloseId}
      onClose={onCloseNotification}
      type={
        warningClassName
          ? ComponentColorType.is_warning
          : ComponentColorType.is_danger
      }
    >
      {warningText || errorText}
    </Notification>
  ) : null;
}

function TitleComponent(props: TitleProps) {
  const { state, onTitleChanged } = props;

  let titleValue = "";
  let titleErrors: null | FieldError = null;

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
      states,
    } = state.states.changed;
    titleValue = formValue;

    if (states.value === StateValue.invalid) {
      titleErrors = states.invalid.context.errors;
    }
  }

  return (
    <div
      className={cn(
        fieldSelector,
        titleErrors ? fieldErrorIndicatorSelector : "",
      )}
    >
      <Label htmlFor={titleInputDomId} className="form__label">
        Title
      </Label>

      <div className="control">
        <Input
          isRounded
          type="text"
          id={titleInputDomId}
          value={titleValue}
          onChange={onTitleChanged}
        />
      </div>

      {titleErrors && (
        <FormCtrlError className={fieldErrorSelector}>
          {titleErrors.map(([errorLabel, errorText], index) => {
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
  );
}

function CommentComponent(props: CommentProps) {
  const { state, onCommentChanged } = props;

  let commentValue = "";

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
    } = state.states.changed;
    commentValue = formValue;
  }

  return (
    <div>
      <Label htmlFor={commentInputDomId} className="form__label">
        Comment
      </Label>

      <div className="control">
        <Textarea
          rows={7}
          className={cn("w-full")}
          id={commentInputDomId}
          value={commentValue}
          onChange={onCommentChanged}
        />
      </div>
    </div>
  );
}

function DescriptionComponent(props: DescriptionProps) {
  const { state, onToggleDescription, onDescriptionChanged } = props;
  let descriptionValue = "";
  let descriptionActive = false;
  if (state.value === StateValue.active) {
    const activeState = state.active;
    descriptionActive = true;

    if (activeState.states.value === StateValue.changed) {
      const changedState = activeState.states.changed;
      descriptionValue = changedState.context.formValue;
    }
  }

  return (
    <div className="mb-4">
      <Label htmlFor={descriptionInputDomId}>
        <span>Description</span>

        <div
          className={cn(descriptionToggleSelector, "py-3 pl-3 inline-block")}
          onClick={onToggleDescription}
        >
          {descriptionActive ? (
            <ChevronDown className={descriptionHideSelector} />
          ) : (
            <ChevronUp className={descriptionShowSelector} />
          )}
        </div>
      </Label>

      <div className="control">
        <Textarea
          rows={7}
          className={cn({
            [`${hiddenSelector} hidden`]: !descriptionActive,
          })}
          id={descriptionInputDomId}
          value={descriptionValue}
          onChange={onDescriptionChanged}
        />
      </div>
    </div>
  );
}

function DataDefinitionsComponent(props: DataDefinitionsProps) {
  const { states, dispatch } = props;
  const dataDefinitionsAttributesList = Object.entries(states);
  const definitionsLen = dataDefinitionsAttributesList.length;

  return (
    <div className="data-definitions">
      {dataDefinitionsAttributesList.map(([id, definitionProperties]) => {
        const {
          index,
          name: nameState,
          type: typeState,
        } = definitionProperties;

        let nameValue = "";
        let nameErrors: null | FieldError = null;
        if (nameState.states.value === StateValue.changed) {
          const {
            states,
            context: { formValue },
          } = nameState.states.changed;
          nameValue = formValue;

          if (states.value === StateValue.invalid) {
            nameErrors = states.invalid.context.errors;
          }
        }

        let typeValue = "" as DataTypes;
        let typeErrors: null | FieldError = null;
        if (typeState.states.value === StateValue.changed) {
          const {
            states,
            context: { formValue },
          } = typeState.states.changed;
          typeValue = formValue;

          if (states.value === StateValue.invalid) {
            typeErrors = states.invalid.context.errors;
          }
        }

        return (
          <div
            key={id}
            className={cn(
              "data-definition mb-4 border-2 rounded-sm p-3",
              definitionContainerDomSelector,
            )}
            id={id}
            data-id={id}
          >
            <div
              className={cn(
                "mb-4",
                fieldSelector,
                nameErrors ? fieldErrorIndicatorSelector : "",
              )}
            >
              <Label
                htmlFor={definitionNameInputDomId + id}
                className="form__label"
              >
                Field name
              </Label>

              <div className="control">
                <Input
                  isRounded
                  type="text"
                  className={cn({
                    "input form__control is-rounded": true,
                    [definitionNameFormControlSelector]: true,
                  })}
                  id={definitionNameInputDomId + id}
                  value={nameValue}
                  onChange={(e) => {
                    const node = e.currentTarget;
                    dispatch({
                      type: ActionType.FORM_CHANGED,
                      key: "def",
                      index,
                      value: node.value,
                      fieldName: "name",
                    });
                  }}
                />
              </div>

              {nameErrors && (
                <FormCtrlError className={fieldErrorSelector}>
                  {nameErrors.map(([errorLabel, errorText], index) => {
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

            <div
              className={cn(
                "mb-4",
                fieldSelector,
                typeErrors ? fieldErrorIndicatorSelector : "",
              )}
            >
              <Label
                htmlFor={definitionTypeInputDomId + id}
                className={cn("form__label")}
              >
                Data type
              </Label>

              <div className="control">
                <Select
                  parentProps={{ className: cn("w-full") }}
                  isRounded
                  className={cn({
                    [definitionTypeFormControlSelector]: true,
                  })}
                  id={definitionTypeInputDomId + id}
                  value={typeValue}
                  onChange={(e) => {
                    const node = e.currentTarget;
                    dispatch({
                      type: ActionType.FORM_CHANGED,
                      key: "def",
                      index,
                      value: node.value,
                      fieldName: "type",
                    });
                  }}
                >
                  <option value="">Click to select</option>

                  {fieldTypeKeys.map((fieldType) => {
                    return (
                      <option
                        key={fieldType}
                        value={fieldType}
                        id={makeDefinitionTypeOptionDomId(fieldType)}
                      >
                        {fieldType}
                      </option>
                    );
                  })}
                </Select>
              </div>

              {typeErrors && (
                <FormCtrlError className={fieldErrorSelector}>
                  {typeErrors.map(([errorLabel, errorText], index) => {
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

            <div className={cn("data-definition-controls", "flex justify-end")}>
              <DefinitionCrudComponent
                direction="add"
                className={addDefinitionSelector}
                onClick={() => {
                  dispatch({
                    type: ActionType.ADD_DEFINITION,
                    data: definitionProperties,
                  });
                }}
              />

              {definitionsLen !== 1 && (
                <DefinitionCrudComponent
                  className={removeDefinitionSelector}
                  onClick={() => {
                    dispatch({
                      type: ActionType.REMOVE_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                  direction="remove"
                />
              )}

              {index !== 0 && (
                <DefinitionCrudComponent
                  onClick={() => {
                    dispatch({
                      type: ActionType.UP_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                  direction="up"
                  className={moveUpDefinitionSelector}
                />
              )}

              {definitionsLen > 1 && index + 1 !== definitionsLen && (
                <DefinitionCrudComponent
                  className={moveDownDefinitionSelector}
                  onClick={() => {
                    dispatch({
                      type: ActionType.DOWN_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                  direction="down"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DefinitionCrudComponent(props: {
  direction: "up" | "down" | "add" | "remove";
  onClick: () => void;
  className: string;
}) {
  const { onClick, direction, className } = props;

  let directionEl: React.ReactNode = "";
  let hasIconClass = false;

  switch (direction) {
    case "add":
      directionEl = "+";
      hasIconClass = true;
      break;
    case "remove":
      hasIconClass = true;
      directionEl = "-";
      break;

    case "up":
      directionEl = <i className="fas fa-chevron-up"></i>;
      break;

    case "down":
      directionEl = <i className="fas fa-chevron-down"></i>;
      break;
  }

  return (
    <Button
      isRounded
      type="button"
      className={cn("mr-3 !p-0 w-11 h-11", className)}
      onClick={onClick}
      style={{
        color: "var(--app-color)",
      }}
    >
      <span className={cn(hasIconClass ? "font-bold text-2xl" : "")}>
        {directionEl}
      </span>
    </Button>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  const [createExperiences] = useCreateExperiencesMutation();

  return <UpsertExperience {...props} createExperiences={createExperiences} />;
};

interface DescriptionProps {
  state: DescriptionFormField;
  onToggleDescription: () => void;
  onDescriptionChanged: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

interface TitleProps {
  state: FormField;
  onTitleChanged: (e: InputChangeEvent) => void;
}

interface CommentProps {
  state: FormField;
  onCommentChanged: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

interface DataDefinitionsProps {
  states: DataDefinitionFieldsMap;
  dispatch: DispatchType;
}
