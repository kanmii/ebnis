import { useCreateExperiencesMutation } from "@eb/shared/src/apollo/experience.gql.types";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { StateValue } from "@eb/shared/src/utils/types";
import makeClassNames from "classnames";
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
  descriptionInputDomId,
  disposeComponentDomId,
  domPrefix,
  fieldErrorSelector,
  makeDefinitionTypeOptionDomId,
  moveDownDefinitionSelector,
  moveUpDefinitionSelector,
  notificationCloseId,
  removeDefinitionSelector,
  resetDomId,
  scrollIntoViewDomId,
  submitDomId,
  titleInputDomId,
} from "./upsert-experience.dom";
import "./upsert-experience.styles.scss";
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
    <form
      className={makeClassNames({
        "form component-upsert-experience modal is-active": true,
        [className]: true,
      })}
      onSubmit={onSubmit}
      id={domPrefix}
    >
      <div className="modal-background"></div>

      <div className="modal-card">
        <header className="modal-card-head">
          <div className="modal-card-title">
            <p>{header}</p>
            {title && <p className="upsert-experience__title-small">{title}</p>}
          </div>

          <button
            type="button"
            className="delete"
            aria-label="close"
            id={disposeComponentDomId}
            onClick={onClose}
          />
        </header>

        <section className="modal-card-body">
          <span className="modal-scroll-into-view" id={scrollIntoViewDomId} />

          <ErrorOrWarning
            formValidity={formValidity}
            submissionState={submissionState}
            onCloseNotification={onCloseNotification}
          />

          <TitleComponent state={titleState} onTitleChanged={onTitleChanged} />

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
        </section>

        <footer className="modal-card-foot">
          <button
            type="submit"
            id={submitDomId}
            className="button is-rounded is-primary"
          >
            Save changes
          </button>

          <button
            id={resetDomId}
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
        </footer>
      </div>
    </form>
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
    <div
      className={makeClassNames({
        notification: true,
        [warningClassName]: !!warningText,
        [errorClassName]: !!errorText,
      })}
    >
      <button
        id={notificationCloseId}
        type="button"
        className="delete"
        onClick={onCloseNotification}
      />
      {warningText || errorText}
    </div>
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
      className={makeClassNames({
        "field form__field": true,
        "form__field--errors": !!titleErrors,
      })}
    >
      <label htmlFor={titleInputDomId} className="form__label">
        Title
      </label>

      <div className="control">
        <input
          className={makeClassNames({
            "form__control input is-rounded": true,
            "is-danger": !!titleErrors,
          })}
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
    <div
      className={makeClassNames({
        "field form__field": true,
      })}
    >
      <label htmlFor={commentInputDomId} className="form__label">
        Comment
      </label>

      <div className="control">
        <textarea
          rows={7}
          className={makeClassNames({
            "form__control textarea": true,
          })}
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
    <div className="field form__field">
      <label
        htmlFor={descriptionInputDomId}
        className="form__label form__label-description"
      >
        <span>Description</span>

        <div
          className="form__label-description-toggle"
          onClick={onToggleDescription}
        >
          {descriptionActive ? (
            <span className="form__label-description-hide" />
          ) : (
            <span className="form__label-description-show" />
          )}
        </div>
      </label>

      <div className="control">
        <textarea
          rows={7}
          className={makeClassNames({
            "form__control textarea": true,
            "form__control--hidden": !descriptionActive,
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
            className={makeClassNames({
              "data-definition": true,
              [definitionContainerDomSelector]: true,
            })}
            id={id}
            data-id={id}
          >
            <div
              className={makeClassNames({
                "field form__field": true,
                "form__field--errors": !!nameErrors,
              })}
            >
              <label
                htmlFor={definitionNameInputDomId + id}
                className="form__label"
              >
                Field name
              </label>

              <div className="control">
                <input
                  type="text"
                  className={makeClassNames({
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
              className={makeClassNames({
                "field form__field": true,
                "form__field--errors": !!typeErrors,
              })}
            >
              <label
                htmlFor={definitionTypeInputDomId + id}
                className="form__label"
              >
                Data type
              </label>

              <div className="control">
                <div className="select is-rounded">
                  <select
                    className={makeClassNames({
                      "form__control form__control--select": true,
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
                  </select>
                </div>
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

            <div className="data-definition-controls">
              <button
                type="button"
                className={`button is-rounded data-definition-control ${addDefinitionSelector}`}
                onClick={() => {
                  dispatch({
                    type: ActionType.ADD_DEFINITION,
                    data: definitionProperties,
                  });
                }}
              >
                <span className="icon is-small">
                  <i className="fas fa-plus"></i>
                </span>
              </button>

              {definitionsLen !== 1 && (
                <button
                  type="button"
                  className={`button is-rounded data-definition-control ${removeDefinitionSelector}`}
                  onClick={() => {
                    dispatch({
                      type: ActionType.REMOVE_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                >
                  <span className="icon is-small">
                    <i className="fas fa-minus"></i>
                  </span>
                </button>
              )}

              {index !== 0 && (
                <button
                  type="button"
                  className={`button is-rounded data-definition-control ${moveUpDefinitionSelector}`}
                  onClick={() => {
                    dispatch({
                      type: ActionType.UP_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                >
                  <span className="icon is-small">
                    <i className="fas fa-chevron-up"></i>
                  </span>
                </button>
              )}

              {definitionsLen > 1 && index + 1 !== definitionsLen && (
                <button
                  type="button"
                  className={makeClassNames({
                    "button is-rounded": true,
                    "data-definition-control": true,
                    "data-definition-control--down": true,
                    [moveDownDefinitionSelector]: true,
                  })}
                  onClick={() => {
                    dispatch({
                      type: ActionType.DOWN_DEFINITION,
                      data: definitionProperties,
                    });
                  }}
                >
                  <span className="icon is-small">
                    <i className="fas fa-chevron-down"></i>
                  </span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
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
