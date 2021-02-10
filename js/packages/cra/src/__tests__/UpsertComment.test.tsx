import { updateMswExperiencesGql } from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer, mswServerListen } from "@eb/cm/src/__tests__/msw-server";
import { waitForCount } from "@eb/cm/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { makeApolloClient } from "../apollo/client";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-list-view-query";
import UpsertComment from "../components/UpsertComment/upsert-comment.component";
import {
  errorsId,
  submitId,
  textInputId,
  resetId,
  closeId,
} from "../components/UpsertComment/upsert-comment.dom";
import {
  ActionType,
  EffectArgs,
  effectFunctions,
  EffectType,
  initState,
  Props,
  reducer,
  StateMachine,
} from "../components/UpsertComment/upsert-comment.utils";
import { fillField, getById, mockComment1 } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { GenericHasEffect } from "../utils/effects";
import { E2EWindowObject } from "../utils/types";

jest.mock("../apollo/update-get-experiences-list-view-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const mockPersistFunc = jest.fn();

const ebnisObject = {
  persistor: {
    persist: mockPersistFunc as any,
  },
  // logApolloQueries: true,
  // logReducers: true,
} as E2EWindowObject;

describe("UpsertComment", () => {
  beforeAll(() => {
    window.____ebnis = ebnisObject;
    mswServerListen();
  });

  afterAll(() => {
    deleteObjectKey(window, "____ebnis");
    mswServer.close();
  });

  beforeEach(() => {
    const { client, cache } = makeApolloClient({ testing: true });
    ebnisObject.cache = cache;
    ebnisObject.client = client;
  });

  afterEach(() => {
    mswServer.resetHandlers();
    cleanup();
    deleteObjectKey(ebnisObject, "client");
    deleteObjectKey(ebnisObject, "cache");
  });

  describe("component", () => {
    it("creates successfully", async () => {
      mswServer.use(
        updateMswExperiencesGql({
          updateExperiences: {
            __typename: "UpdateExperiencesSomeSuccess",
            experiences: [
              {
                __typename: "UpdateExperienceSomeSuccess",
                experience: {
                  __typename: "UpdateExperience",
                  experienceId: "a",
                  updatedAt: "",
                  ownFields: null,
                  updatedDefinitions: null,
                },
                entries: null,
                comments: {
                  __typename: "CommentCrud",
                  inserts: [
                    {
                      __typename: "CommentSuccess",
                      comment: {
                        ...mockComment1,
                      },
                    },
                  ],
                  updates: null,
                  deletes: null,
                },
              },
            ],
          },
        }),
      );

      const { ui } = makeComp();

      render(ui);

      const commentInputEl = getById(textInputId) as HTMLInputElement;
      expect(commentInputEl.value).toBe("");
      fillField(commentInputEl, "aa");

      const submitEl = getById(submitId);
      submitEl.click();

      await waitForCount(() => {
        const c = mockOnSuccess.mock.calls;

        return c.length;
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(
        mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
      ).toHaveBeenCalled();
    });

    it("errors while creating", async () => {
      mswServer.use(
        updateMswExperiencesGql({
          updateExperiences: {
            __typename: "UpdateExperiencesAllFail",
            error: "a",
          },
        }),
      );

      const { ui } = makeComp();

      render(ui);

      const commentInputEl = getById(textInputId) as HTMLInputElement;
      expect(commentInputEl.value).toBe("");
      fillField(commentInputEl, "aa");

      const submitEl = getById(submitId);
      submitEl.click();

      expect(getById(errorsId)).toBeNull();

      await waitFor(() => {
        expect(getById(errorsId)).not.toBeNull();
      });

      expect(
        mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
      ).not.toHaveBeenCalled();
    });

    it("resets form / does not submit empty form / closes UI", async () => {
      const { ui } = makeComp();

      render(ui);

      const commentInputEl = getById(textInputId) as HTMLInputElement;
      fillField(commentInputEl, "aa");
      expect(commentInputEl.value).toBe("aa");

      // When form is reset
      getById(resetId).click();

      // Form should be empty
      expect(commentInputEl.value).toBe("");

      // Error UI should not be visible
      expect(getById(errorsId)).toBeNull();

      // When form is submitted
      const submitEl = getById(submitId);
      submitEl.click();

      // Error UI should be visible
      expect(getById(errorsId)).not.toBeNull();

      // Ui Should not be closed
      expect(mockOnClose).not.toBeCalled();

      // When UI is closed
      getById(closeId).click();

      // Ui should be closed
      expect(mockOnClose).toBeCalled();
    });
  });

  describe("reducer", () => {
    const mockDispatch = jest.fn();

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const props = ({
      association: {
        id: "a",
      },
      onSuccess: mockOnSuccess,
    } as unknown) as Props;

    it("errors on create", async () => {
      mswServer.use(
        updateMswExperiencesGql({
          updateExperiences: {
            __typename: "UpdateExperiencesSomeSuccess",
            experiences: [
              {
                __typename: "UpdateExperienceSomeSuccess",
                experience: {
                  __typename: "UpdateExperience",
                  experienceId: "a",
                  updatedAt: "",
                  ownFields: null,
                  updatedDefinitions: null,
                },
                entries: null,
                comments: {
                  __typename: "CommentCrud",
                  inserts: [
                    {
                      __typename: "CommentUnionErrors",
                      errors: {
                        __typename: "CommentErrors",
                        meta: {
                          __typename: "CommentErrorsMeta",
                          index: 1,
                          id: null,
                        },
                        errors: {
                          __typename: "CommentErrorsErrors",
                          error: "a",
                          id: null,
                          association: null,
                        },
                      },
                    },
                  ],
                  updates: null,
                  deletes: null,
                },
              },
            ],
          },
        }),
      );

      const state = initState();

      const fillTextFieldState = reducer(state, {
        type: ActionType.FORM_CHANGED,
        fieldName: "text",
        value: "aa",
      });

      const submitState = reducer(fillTextFieldState, {
        type: ActionType.SUBMISSION,
      });

      const { key, ownArgs } = getEffects(submitState)[0];
      await effectFunctions[key](ownArgs, props, effectArgs);

      const calls = await waitForCount(() => {
        const calls = mockDispatch.mock.calls[0];
        return calls;
      });

      expect(calls[0].errors).toEqual([["1", "a"]]);
    });
  });
});

// ====================================================
// START HELPERS SECTION
// ====================================================

const UpsertCommentP = UpsertComment as ComponentType<Partial<Props>>;

function makeComp(props: Partial<Props> = {}) {
  return {
    ui: (
      <UpsertCommentP
        {...props}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
        association={{
          id: "a",
        }}
      />
    ),
  };
}

function getEffects(state: StateMachine) {
  return (state.effects.general as GenericHasEffect<EffectType>).hasEffects
    .context.effects;
}
