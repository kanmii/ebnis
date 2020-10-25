import React, {
  useEffect,
  useReducer,
  useCallback,
  FormEvent,
  ChangeEvent,
} from "react";
import makeClassNames from "classnames";
import "./upsert-entry.styles.scss";
import {
  CallerProps,
  Props,
  effectFunctions,
  reducer,
  initState,
  ActionType,
  DispatchType,
  FieldState,
  FormObjVal,
  Submission,
} from "./upsert-entry.utils";
import {
  useUpdateExperiencesOnlineMutation,
  useCreateExperiencesMutation,
} from "../../utils/experience.gql.types";
import { useCreateOfflineEntryMutation } from "./upsert-entry.resolvers";
import { addResolvers } from "./upsert-entry.injectables";
import Loading from "../Loading/loading.component";
import { componentFromDataType } from "./component-from-data-type";
import { DataTypes } from "../../graphql/apollo-types/globalTypes";
import FormCtrlError from "../FormCtrlError/form-ctrl-error.component";
import { DataDefinitionFragment } from "../../graphql/apollo-types/DataDefinitionFragment";
import {
  submitBtnDomId,
  notificationCloseId,
  fieldErrorSelector,
} from "./upsert-entry.dom";
import { StateValue } from "../../utils/types";
import { errorClassName } from "../../utils/utils.dom";
import { useRunEffects } from "../../utils/use-run-effects";

export function UpsertEntry(props: Props) {
  const { experience, onClose } = props;

  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states: { submission: submissionState, form },
    effects: { general: generalEffects },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const onSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({
      type: ActionType.ON_SUBMIT,
    });
  }, []);

  const onCloseNotification = useCallback(() => {
    dispatch({
      type: ActionType.DISMISS_NOTIFICATION,
    });
  }, []);

  useEffect(() => {
    addResolvers(window.____ebnis.client);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { dataDefinitions, title } = experience;

  return (
    <>
      <form
        className={makeClassNames({
          "modal is-active component-upsert-entry": true,
          submitting: submissionState.value === StateValue.active,
        })}
        onSubmit={onSubmit}
      >
        <div className="modal-background"></div>

        <div className="modal-card">
          <header className="modal-card-head">
            <div className="modal-card-title">
              <strong>New Entry</strong>
              <div className="experience-title">{title}</div>
            </div>

            <button
              className="delete upsert-entry__delete"
              aria-label="close"
              type="button"
              onClick={onClose}
            ></button>
          </header>

          <div className="modal-card-body">
            <span className="scroll-into-view" />

            <NotificationComponent
              submissionState={submissionState}
              onCloseNotification={onCloseNotification}
            />

            {dataDefinitions.map((obj, index) => {
              const definition = obj as DataDefinitionFragment;

              return (
                <DataComponent
                  key={definition.id}
                  definition={definition}
                  index={index}
                  fieldState={form.fields[index]}
                  dispatch={dispatch}
                />
              );
            })}
          </div>

          <footer className="modal-card-foot">
            <button
              className="button submit-btn"
              id={submitBtnDomId}
              type="submit"
            >
              Submit
            </button>
          </footer>
        </div>
      </form>

      {submissionState.value === StateValue.active && <Loading />}
    </>
  );
}

const DataComponent = React.memo(
  function DataComponentFn(props: DataComponentProps) {
    const {
      definition,
      index,
      dispatch,
      fieldState: {
        context: { value: currentValue, errors },
      },
    } = props;

    const { name: fieldTitle, type, id } = definition;

    const generic = {
      id,
      name: id,
      value: currentValue,
      onChange:
        type === DataTypes.DATE || type === DataTypes.DATETIME
          ? makeDateChangedFn(dispatch, index)
          : (e: ChangeEvent<HTMLInputElement>) => {
              let value = e.currentTarget.value;

              dispatch({
                type: ActionType.ON_FORM_FIELD_CHANGED,
                fieldIndex: index,
                value,
              });
            },
    };

    const component = componentFromDataType(type, generic);

    return (
      <div
        className={makeClassNames({
          error: !!errors,
          field: true,
        })}
      >
        <label
          className="label form__label"
          htmlFor={id}
        >{`[${type}] ${fieldTitle}`}</label>

        <div className="control">{component}</div>

        {errors && (
          <FormCtrlError className={fieldErrorSelector}>
            {errors.map(([k, v]) => {
              return (
                <div key={k}>
                  <span
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {k}:
                  </span>{" "}
                  <span>{v}</span>
                </div>
              );
            })}
          </FormCtrlError>
        )}
      </div>
    );
  },

  function DataComponentDiff(prevProps, nextProps) {
    return prevProps.fieldState === nextProps.fieldState;
  },
);

function NotificationComponent({
  submissionState,
  onCloseNotification,
}: {
  submissionState: Submission;
  onCloseNotification: () => void;
}) {
  let errorNode =
    submissionState.value === StateValue.errors &&
    submissionState.errors.context.errors;

  if (!errorNode) {
    return null;
  }

  return (
    <div
      className={makeClassNames({
        notification: true,
        [errorClassName]: true,
      })}
    >
      <button
        id={notificationCloseId}
        type="button"
        className="delete"
        onClick={onCloseNotification}
      />
      <div>
        <strong>
          <p>
            Following errors were received while trying to create/Update the
            Eintrag
          </p>
        </strong>
      </div>
      <hr />
      <div>Eintrag:</div>
      {errorNode}
    </div>
  );
}

function makeDateChangedFn(dispatch: DispatchType, index: number) {
  return function makeDateChangedFnInner(fieldName: string, value: FormObjVal) {
    dispatch({
      type: ActionType.ON_FORM_FIELD_CHANGED,
      fieldIndex: index,
      value,
    });
  };
}

// istanbul ignore next:
export default (props: CallerProps) => {
  const [updateExperiencesOnline] = useUpdateExperiencesOnlineMutation();
  const [createOfflineEntry] = useCreateOfflineEntryMutation();
  const [createExperiences] = useCreateExperiencesMutation();

  return (
    <UpsertEntry
      {...props}
      updateExperiencesOnline={updateExperiencesOnline}
      createOfflineEntry={createOfflineEntry}
      createExperiences={createExperiences}
    />
  );
};

interface DataComponentProps {
  definition: DataDefinitionFragment;
  index: number;
  fieldState: FieldState;
  dispatch: DispatchType;
}

type E = React.ChangeEvent<HTMLInputElement>;
