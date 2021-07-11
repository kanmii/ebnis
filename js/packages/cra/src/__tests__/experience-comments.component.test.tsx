import { ApolloError } from "@apollo/client";
import {
  readExperienceDCFragment,
  writeExperienceDCFragment,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import { getExperienceComments } from "@eb/shared/src/apollo/experience.gql.types";
import { makeApolloClient } from "@eb/shared/src/client";
import { CommentFragment } from "@eb/shared/src/graphql/apollo-types/CommentFragment";
import { UpdateExperiencesOnline } from "@eb/shared/src/graphql/apollo-types/UpdateExperiencesOnline";
import { getIsConnected } from "@eb/shared/src/utils/connections";
import { EbnisGlobals } from "@eb/shared/src/utils/types";
import {
  mockComment1,
  mockComment1Id,
  mockComment2,
  mockComment2Id,
  mockComment3,
  mockComment3Id,
  mockOnlineExperience1,
  mockOnlineExperienceId1,
} from "@eb/shared/src/__tests__/mock-data";
import {
  getExperienceCommentsGqlMsw,
  updateExperiencesMswGql,
} from "@eb/shared/src/__tests__/msw-handlers";
import {
  mswServer,
  mswServerListen,
} from "@eb/shared/src/__tests__/msw-server";
import { componentTimeoutsMs } from "@eb/shared/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { GraphQLError } from "graphql";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { updateExperiencesMutation } from "../../../shared/src/apollo/update-experiences.gql";
import { ActionType as ParentActionType } from "../components/DetailExperience/detailed-experience-utils";
import { Comments } from "../components/experience-comments/experience-comments.component";
import {
  commentItemOptionsSelector,
  commentItemOptionsToggleSelector,
  commentNotificationCloseId,
  commentsErrorContainerId,
  commentsHeaderNewId,
  deleteCommentMenuSelector,
  deleteCommentPromptFooterCloseId,
  deleteCommentPromptHeaderCloseId,
  deleteCommentPromptOkId,
  deletedCommentsFailure,
  deletedCommentsFailureSelector,
  deletedCommentsSuccess,
  emptyCommentsContainerId,
} from "../components/experience-comments/experience-comments.dom";
import {
  ActionType,
  EffectArgs,
  effectFunctions,
  EffectType as E,
  initState,
  Props,
  reducer,
  StateMachine as S,
} from "../components/experience-comments/experience-comments.utils";
import { Props as UpsertCommentProps } from "../components/UpsertComment/upsert-comment.utils";
import { getAllByClass, getById, getEffects } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { activeClassName } from "../utils/utils.dom";

jest.mock("@eb/shared/src/apollo/experiences-list-cache-utils");

jest.mock("@eb/shared/src/apollo/update-experiences-manual-cache-update");

jest.mock("@eb/shared/src/apollo/experience-detail-cache-utils");
// getCachedExperienceDetailView
const mockReadExperienceCompleteFragment =
  readExperienceDCFragment as jest.Mock;
const mockWriteCachedExperienceCompleteFragment =
  writeExperienceDCFragment as jest.Mock;

jest.mock("@eb/shared/src/utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

const mockLoadingId = "@x/l";
jest.mock("../components/Loading/loading.component", () => {
  return () => <span id={mockLoadingId} />;
});

const mockUpsertCommentSuccessId = "@test/upsert-success";
const mockUpsertCommentCloseId = "@test/upsert-close";
const mockNewCommentSuccess: CommentFragment = {
  ...mockComment1,
};
jest.mock("../components/experience-comments/experience-comments.lazy", () => {
  return {
    UpsertComment: (props: UpsertCommentProps) => {
      const { onSuccess, onClose } = props;

      return (
        <div>
          <button
            id={mockUpsertCommentSuccessId}
            onClick={() => {
              onSuccess(mockNewCommentSuccess);
            }}
          />

          <button
            id={mockUpsertCommentCloseId}
            onClick={(e) => {
              onClose(e);
            }}
          />
        </div>
      );
    },
  };
});

const mockDispatchFn = jest.fn();
const mockParentDispatchFn = jest.fn();

const mockPersistFunc = jest.fn();
afterEach(() => {
  jest.resetAllMocks();
});

describe("components", () => {
  const globals = {
    persistor: {
      persist: mockPersistFunc as any,
    },
  } as EbnisGlobals;

  beforeAll(() => {
    window.____ebnis = globals;
    mswServerListen();
  });

  afterAll(() => {
    deleteObjectKey(window, "____ebnis");
    mswServer.close();
  });

  beforeEach(() => {
    const { client, cache } = makeApolloClient({
      ebnisGlobals: globals,
      testing: true,
    });
    globals.cache = cache;
    globals.client = client;
  });

  afterEach(() => {
    mswServer.resetHandlers();
    cleanup();
    deleteObjectKey(globals, "client");
    deleteObjectKey(globals, "cache");
  });

  it("fetch online comments fails/no retries", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceCommentsGqlMsw({
        getExperienceComments: {
          __typename: "GetExperienceCommentsErrors",
          errors: {
            __typename: "ExperienceError",
            experienceId: mockOnlineExperienceId1,
            error: "error",
          },
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      // Comment error should not be visible
      expect(getCommentsErrorContainer()).toBeNull();

      // Comment error should be visible shortly
      await waitFor(() => {
        expect(getCommentsErrorContainer()).not.toBeNull();
      });
    });
  });

  it("fetch online comments fails: retries", async () => {
    mockGetIsConnected.mockReturnValue(false);

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      // Comment error should not be visible
      expect(getCommentsErrorContainer()).toBeNull();

      // Comment error should be visible shortly
      await waitFor(() => {
        expect(getCommentsErrorContainer()).not.toBeNull();
      });
    });
  });

  it("fetch online comments succeeds / none empty/ create", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceCommentsGqlMsw({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [mockComment2],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // Comments should not be visible
      expect(getById(mockComment2Id)).toBeNull();

      // Comment should be visible shortly
      await waitFor(() => {
        expect(getById(mockComment2Id).id).toBe(mockComment2Id);
      });

      // comments should have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).toHaveBeenCalledWith({
        ...mockOnlineExperience1,
        comments: [mockComment2],
      });

      // Upsert UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // Notification should not be visible
      expect(getById(commentNotificationCloseId)).toBeNull();

      // UI menus should not be cleared
      expect(mockParentDispatchFn.mock.calls).toHaveLength(0);

      // When user clicks to show upsert UI
      getById(commentsHeaderNewId).click();

      // UI menus should be cleared
      expect(mockParentDispatchFn).toBeCalledWith({
        type: ParentActionType.toggle_menu,
        key: "close",
      });

      // Comment that has not been created should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // When comment is created
      getById(mockUpsertCommentSuccessId).click();

      // Newly created comment should be visible
      expect(getById(mockComment1Id)).not.toBeNull();

      // Upsert UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // Notification should be visible
      expect(getById(commentNotificationCloseId)).not.toBeNull();

      // When notification is closed
      getById(commentNotificationCloseId).click();

      // Notification should be visible
      expect(getById(commentNotificationCloseId)).not.toBeNull();
    });
  });

  it("fetch online comments succeeds/ empty /create new comment", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceCommentsGqlMsw({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);

    const { ui } = makeComp();

    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // User should be prompted to create comment
      const createCommentPromptEl = await waitFor(() => {
        const el = getById(emptyCommentsContainerId);
        expect(el).not.toBeNull();
        return el;
      });

      // Empty comments should have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).toHaveBeenCalledWith({
        ...mockOnlineExperience1,
        comments: [],
      });

      // Upsert UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // Notification should not be visible
      expect(getById(commentNotificationCloseId)).toBeNull();

      // When user clicks to create element
      createCommentPromptEl.click();

      // Upsert UI should be visible
      expect(getById(mockUpsertCommentSuccessId)).not.toBeNull();

      // When Upsert Ui is closed
      getById(mockUpsertCommentCloseId).click();

      // Upsert UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // When user clicks to create element
      createCommentPromptEl.click();

      // Upsert UI should be visible
      const el = getById(mockUpsertCommentSuccessId);

      // Comment that has not been created should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // When comment is created
      el.click();

      // Newly created comment should be visible
      expect(getById(mockComment1Id)).not.toBeNull();

      // Upsert UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // Notification should be visible
      expect(getById(commentNotificationCloseId)).not.toBeNull();

      // Notification should not be visible shortly
      await waitFor(() => {
        expect(getById(commentNotificationCloseId)).toBeNull();
      });
    });
  });

  const mockDeleteResponse1: UpdateExperiencesOnline = {
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
            deletes: [
              {
                __typename: "CommentSuccess",
                comment: {
                  ...mockComment1,
                },
              },

              {
                __typename: "CommentUnionErrors",
                errors: {
                  __typename: "CommentErrors",
                  meta: {
                    __typename: "CommentErrorsMeta",
                    id: mockComment3Id,
                    index: 1,
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
            inserts: null,
          },
        },
      ],
    },
  };

  const e = {
    ...mockOnlineExperience1,
    comments: [mockComment1, mockComment2, mockComment3],
  };

  it("deletes comments", async () => {
    mockReadExperienceCompleteFragment.mockReturnValue(e);
    mswServer.use(updateExperiencesMswGql(mockDeleteResponse1));

    const { ui } = makeComp({});
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      // Comments options trigger should not be visible
      expect(getAllByClass(commentItemOptionsSelector).length).toBe(0);

      // Comments options trigger should be visible
      const optionsMenus = await waitFor(() => {
        const options = getAllByClass(commentItemOptionsSelector);
        expect(options.length).not.toBe(0);
        return options;
      });

      const optionMenu0 = optionsMenus.item(0) as HTMLElement;
      const optionMenu1 = optionsMenus.item(1) as HTMLElement;
      const optionMenu2 = optionsMenus.item(2) as HTMLElement;

      // Options menu should not be visible
      expect(optionMenu0.classList).not.toContain(activeClassName);
      expect(optionMenu1.classList).not.toContain(activeClassName);
      expect(optionMenu2.classList).not.toContain(activeClassName);

      // When option 0 menu is toggled on
      const optionsToggle = getAllByClass(commentItemOptionsToggleSelector);
      const option0Toggle = optionsToggle.item(0) as HTMLElement;
      const option1Toggle = optionsToggle.item(1) as HTMLElement;

      option0Toggle.click();

      // Option 0 menu should be visible
      expect(optionMenu0.classList).toContain(activeClassName);

      // other menus should not be visible
      expect(optionMenu1.classList).not.toContain(activeClassName);
      expect(optionMenu2.classList).not.toContain(activeClassName);

      // When option 1 menu is toggled on
      option1Toggle.click();

      // Option 1 should be active
      expect(optionMenu1.classList).toContain(activeClassName);

      // When option 1 menu is toggled on
      option1Toggle.click();

      // Option 1 should not be active
      expect(optionMenu1.classList).not.toContain(activeClassName);

      // Delete comment prompt should not be visible
      expect(getById(deleteCommentPromptHeaderCloseId)).toBeNull();

      const deleteMenus = getAllByClass(deleteCommentMenuSelector);
      const deleteMenu0 = deleteMenus.item(0) as HTMLElement;

      // When delete menu is clicked
      deleteMenu0.click();

      // When delete prompt is closed (header)
      const headerClosePrompt = getById(deleteCommentPromptHeaderCloseId);
      headerClosePrompt.click();

      // Delete prompt should not be visible
      expect(getById(deleteCommentPromptHeaderCloseId)).toBeNull();
      expect(getById(deleteCommentPromptFooterCloseId)).toBeNull();

      // When delete menu is clicked
      deleteMenu0.click();

      // When delete prompt is clicked (footer)
      const footerClosePrompt = getById(deleteCommentPromptFooterCloseId);
      footerClosePrompt.click();

      // Delete comment prompt should not be visible
      expect(getById(deleteCommentPromptFooterCloseId)).toBeNull();

      // when menu is opened
      option0Toggle.click();
      expect(optionMenu0.classList).toContain(activeClassName);

      // When menu item to prompt delete is clicked
      deleteMenu0.click();

      // Options menus should not be active
      expect(optionMenu0.classList).not.toContain(activeClassName);

      // Loading UI should not be visible
      expect(getById(mockLoadingId)).toBeNull();

      // When Ok to delete comment is clicked
      getById(deleteCommentPromptOkId).click();

      // Delete comment prompt should not be visible
      expect(getById(deleteCommentPromptOkId)).toBeNull();

      // Deleted comment should still be visible
      expect(getById(mockComment1Id)).not.toBeNull();

      // AfterCommentsDeleted UI should not be visible
      expect(getById(deletedCommentsFailure)).toBeNull();
      expect(getById(deletedCommentsSuccess)).toBeNull();
      expect(getAllByClass(deletedCommentsFailureSelector).length).toBe(0);

      // WaitingForTask UI should be visible
      expect(getById(mockLoadingId)).not.toBeNull();

      // AfterCommentsDeleted UI should be visible after a while
      await waitFor(() => {
        expect(getById(deletedCommentsSuccess)).not.toBeNull();
      });
      expect(getAllByClass(deletedCommentsFailureSelector).length).not.toBe(0);

      // WaitingForTask UI should not be visible
      expect(getById(mockLoadingId)).toBeNull();

      // Deleted comment should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // Comments not deleted should be visible
      expect(getById(mockComment2Id)).not.toBeNull();
      expect(getById(mockComment3Id)).not.toBeNull();
    });
  });
});

describe("reducers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  const mockGetExperienceComments = jest.fn();
  const mockUpdateExperiencesMutation = jest.fn();

  const props = {
    componentTimeoutsMs,
    experience: mockOnlineExperience1,
    getExperienceComments: mockGetExperienceComments as any,
    updateExperiencesMutation: mockUpdateExperiencesMutation as any,
    postActions: [],
    parentDispatch: mockParentDispatchFn as any,
  } as Props;

  const effectArgs = {
    dispatch: mockDispatchFn,
  } as unknown as EffectArgs;

  it("no cached experience/online comments error timeout", async () => {
    // first time to fetch , there is not network
    mockGetIsConnected
      .mockReturnValueOnce(false)
      // So we try again
      .mockReturnValueOnce(true);

    // An exception is raised
    mockGetExperienceComments.mockRejectedValueOnce({
      error: new ApolloError({
        graphQLErrors: [new GraphQLError("a")],
      }),
    });

    const fetchCommentsState = initState(props);
    const fetchCommentsEffect = getEffects<E, S>(fetchCommentsState)[0];

    await effectFunctions[fetchCommentsEffect.key](
      fetchCommentsEffect.ownArgs as any,
      props,
      effectArgs,
    );

    jest.runOnlyPendingTimers();
    await waitFor(() => true);
    expect(typeof mockDispatchFn.mock.calls[0][0].errors.error).toEqual(
      "string",
    );

    // We received an empty result
    mockDispatchFn.mockClear();
    mockGetExperienceComments.mockResolvedValueOnce({});
    mockGetIsConnected.mockReturnValueOnce(true);

    await effectFunctions[fetchCommentsEffect.key](
      fetchCommentsEffect.ownArgs as any,
      props,
      effectArgs,
    );

    await waitFor(() => true);
    expect(typeof mockDispatchFn.mock.calls[0][0].errors.error).toEqual(
      "string",
    );
  });

  it("delete comments: empty result/errors", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mockReadExperienceCompleteFragment.mockReturnValue({
      ...mockOnlineExperience1,
      comments: [mockComment1],
    });

    const fetchCommentsState = initState(props);
    const fetchCommentsEffect = getEffects<E, S>(fetchCommentsState)[0];

    await effectFunctions[fetchCommentsEffect.key](
      fetchCommentsEffect.ownArgs as any,
      props,
      effectArgs,
    );

    const commentsFetchedState = reducer(
      fetchCommentsState,
      mockDispatchFn.mock.calls[0][0],
    );

    const deleteCommentPromptState = reducer(commentsFetchedState, {
      type: ActionType.delete_prompt,
      ids: [mockComment1Id],
    });

    const deletingCommentsState = reducer(deleteCommentPromptState, {
      type: ActionType.yes_delete,
    });

    const deleteCommentsEffect = getEffects<E, S>(deletingCommentsState)[0];

    mockDispatchFn.mockClear();
    await effectFunctions[deleteCommentsEffect.key](
      deleteCommentsEffect.ownArgs as any,
      props,
      effectArgs,
    );

    const { onUpdateSuccess, onError } =
      mockUpdateExperiencesMutation.mock.calls[0][0];
    onUpdateSuccess();

    expect(typeof mockDispatchFn.mock.calls[0][0].error).toEqual("string");

    mockDispatchFn.mockClear();
    onError();
    expect(typeof mockDispatchFn.mock.calls[0][0].error).toEqual("string");
  });
});

// ====================================================
// HELPER FUNCTIONS
// ====================================================

const ComponentP = Comments as ComponentType<Partial<Props>>;

function makeComp({
  props = {
    postActions: [],
  },
}: {
  props?: Partial<Props>;
} = {}) {
  return {
    ui: (
      <ComponentP
        componentTimeoutsMs={componentTimeoutsMs}
        getExperienceComments={getExperienceComments}
        updateExperiencesMutation={updateExperiencesMutation}
        experience={mockOnlineExperience1}
        parentDispatch={mockParentDispatchFn}
        {...props}
      />
    ),
  };
}

function getCommentsErrorContainer() {
  return getById(commentsErrorContainerId);
}
