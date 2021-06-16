import { Button } from "@eb/jsx/src/Button";
import Modal from "@eb/jsx/src/Modal";
import { ReactComponent as ExclamationErrorSvg } from "@eb/shared/src/styles/exclamation-error.svg";
import { StateValue } from "@eb/shared/src/utils/types";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import { ChangeEvent, useCallback, useReducer } from "react";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { useRunEffects } from "../../utils/use-run-effects";
import {
  closeId,
  errorsId,
  resetId,
  submitId,
  textInputId,
  upsertCommentComponentId,
} from "./upsert-comment.dom";
import {
  ActionType,
  CallerProps,
  effectFunctions,
  FormField,
  initState,
  Props,
  reducer,
  SubmissionError,
} from "./upsert-comment.utils";

export function UpsertComment(props: Props) {
  const { className, onClose } = props;
  // istanbul ignore next:
  const propClassName = className || "";

  const [stateMachine, dispatch] = useReducer(reducer, props, initState);

  const {
    states: {
      submission: submissionState,
      form: {
        fields: { text: textState },
      },
    },
    effects: { general: generalEffects },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const onTextChanged = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const node = e.currentTarget;
    dispatch({
      type: ActionType.FORM_CHANGED,
      value: node.value,
      fieldName: "text",
    });
  }, []);

  let errors: undefined | SubmissionError = undefined;

  if (submissionState.value === StateValue.errors) {
    errors = submissionState.errors.context.errors as SubmissionError;
  }

  return (
    <Modal
      id={upsertCommentComponentId}
      className={propClassName}
      onClose={onClose}
    >
      <Modal.Card>
        <Modal.Header onClose={onClose} id={closeId}>
          Leave a comment
        </Modal.Header>
        <Modal.Body>
          <>
            {errors !== undefined && (
              <div
                id={errorsId}
                className={`
                flex
                mb-2
                pl-1
                pr-2
                text-red-500
            `}
              >
                <div
                  className={`
                  flex-shrink-0
              `}
                  style={{
                    width: "24px",
                  }}
                >
                  <ExclamationErrorSvg />
                </div>

                <div
                  className={`
                  flex-grow
                  ml-2
                `}
                >
                  <p
                    className={`
                    font-semibold
                  `}
                  >
                    There are errors!
                  </p>
                  <ul
                    className={`
                      ml-4
                      mt-2
                  `}
                  >
                    {errors.map(([key, error]) => {
                      return (
                        <li
                          key={key}
                          className={`
                        list-disc
                         mb-2
                      `}
                        >
                          {error}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            <TextComponent state={textState} onTextChanged={onTextChanged} />
          </>
        </Modal.Body>

        <Modal.Footer>
          <>
            <Button
              className="mr-4"
              btnType={ComponentColorType.is_success}
              type="submit"
              id={submitId}
              onClick={(e) => {
                e.preventDefault();
                dispatch({
                  type: ActionType.SUBMISSION,
                });
              }}
            >
              Save changes
            </Button>

            <Button
              id={resetId}
              btnType={ComponentColorType.is_danger}
              onClick={(e) => {
                e.preventDefault();
                dispatch({
                  type: ActionType.RESET,
                });
              }}
            >
              Reset
            </Button>
          </>
        </Modal.Footer>
      </Modal.Card>
    </Modal>
  );
}

function TextComponent(props: TextProps) {
  const { state, onTextChanged } = props;

  let textValue = "";

  if (state.states.value === StateValue.changed) {
    const {
      context: { formValue },
    } = state.states.changed;

    textValue = formValue;
  }

  return (
    <div
      className={`
          field
        `}
    >
      <div className="control">
        <textarea
          className={`
              block
              w-full
              p-3
              border
              rounded
              bg-white
              text-gray-600
              border-gray-500
              active:border-blue-500
              focus:border-blue-500
              hover:border-gray-700
            `}
          rows={10}
          id={textInputId}
          value={textValue}
          onChange={onTextChanged}
        />
      </div>
    </div>
  );
}

// istanbul ignore next:
export default (props: CallerProps) => {
  return (
    <UpsertComment
      updateExperiencesMutation={updateExperiencesMutation}
      {...props}
    />
  );
};

interface TextProps {
  state: FormField;
  onTextChanged: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}
