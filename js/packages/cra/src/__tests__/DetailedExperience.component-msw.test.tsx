/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import {
  getMswExperienceCommentsGql,
  getMswListExperiencesGql,
} from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer, mswServerListen } from "@eb/cm/src/__tests__/msw-server";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { makeApolloClient } from "../apollo/client";
import {
  getCachedExperienceAndEntriesDetailView,
  readExperienceCompleteFragment,
  writeCachedExperienceCompleteFragment,
} from "../apollo/get-detailed-experience-query";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  commentNotificationId,
  commentsErrorContainerId,
  createCommentsMenuId,
  emptyCommentsContainerId,
  hideCommentsMenuId,
  showCommentsMenuId,
} from "../components/DetailExperience/detail-experience.dom";
import { getExperienceComments } from "../utils/experience.gql.types";
import { scrollDocumentToTop } from "../components/DetailExperience/detail-experience.injectables";
import {
  Match,
  Props,
} from "../components/DetailExperience/detailed-experience-utils";
import { Props as UpsertCommentProps } from "../components/UpsertComment/upsert-comment.utils";
import {
  getById,
  mockComment1,
  mockComment1Id,
  mockOnlineExperience1,
  mockOnlineExperienceId1,
  onlineEntrySuccess,
} from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { getIsConnected } from "../utils/connections";
import { getExperienceComments } from "../utils/experience.gql.types";
import { E2EWindowObject } from "../utils/types";

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockScrollDocumentToTop = scrollDocumentToTop as jest.Mock;

const mockUpsertCommentSuccessId = "@test/1";
const mockUpsertCommentCloseId = "@test/2";
const mockSuccess: CommentFragment = {
  ...mockComment1,
};
jest.mock("../components/DetailExperience/detail-experience.lazy", () => {
  return {
    UpsertEntry: () => null,
    UpsertComment: (props: UpsertCommentProps) => {
      const { onSuccess, onClose } = props;

      return (
        <div>
          <button
            id={mockUpsertCommentSuccessId}
            onClick={() => {
              onSuccess(mockSuccess);
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

jest.mock("../components/Loading/loading.component", () => {
  return () => null;
});

jest.mock("../apollo/get-detailed-experience-query");
const mockReadExperienceCompleteFragment = readExperienceCompleteFragment as jest.Mock;
const mockWriteCachedExperienceCompleteFragment = writeCachedExperienceCompleteFragment as jest.Mock;

const mockGetCachedExperienceAndEntriesDetailView = getCachedExperienceAndEntriesDetailView as jest.Mock;

jest.mock("../utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../components/Header/header.component", () => () => null);

const mockPersistFunc = jest.fn();

const ebnisObject = {
  persistor: {
    persist: mockPersistFunc as any,
  },
  // logApolloQueries: true,
  // logReducers: true,
} as E2EWindowObject;

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

// ====================================================
// TESTS
// ====================================================

describe("components", () => {
  it("errors when getting online comments", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: mockOnlineExperience1,
      },
    });

    mswServer.use(
      getMswExperienceCommentsGql({
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
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      // Menu item should prompt user to show comments
      const showCommentsMenuItem = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      // Hide comment menu should not be visible
      expect(getById(hideCommentsMenuId)).toBeNull();

      // Comment error should not be visible
      expect(getCommentsErrorContainer()).toBeNull();

      // When show comments menu item is clicked
      showCommentsMenuItem.click();

      // Comment error should be visible
      await waitFor(() => {
        expect(getCommentsErrorContainer()).not.toBeNull();
      });

      // Show comments menu should not be visible
      expect(getById(showCommentsMenuId)).toBeNull();

      // Create comment menu should be visible
      expect(getById(createCommentsMenuId)).not.toBeNull();

      // Hide comment menu should be visible
      expect(getById(hideCommentsMenuId)).not.toBeNull();
    });
  });

  it("errors when fetching comments with retries fails", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    // Given that user is offline
    mockGetIsConnected.mockReturnValue(false);

    // And we can not read comments from cache
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: mockOnlineExperience1,
      },
    });

    mockReadExperienceCompleteFragment.mockReturnValue({
      ...mockOnlineExperience1,
    });

    const { ui } = makeComp();
    await act(async () => {
      // When component is rendered
      render(ui);

      // Menu item should prompt user to show comments
      const showCommentsMenuItem = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      // Comment error should not be visible
      expect(getCommentsErrorContainer()).toBeNull();

      // When show comments menu item is clicked
      showCommentsMenuItem.click();

      // Comment error should be visible
      await waitFor(() => {
        expect(getCommentsErrorContainer()).not.toBeNull();
      });
    });
  });

  it(`displays online comments /
       it hides comments`, async () => {
    mswServer.use(
      getMswListExperiencesGql({
        getExperience: mockOnlineExperience1,
        getEntries: null,
      }),

      getMswExperienceCommentsGql({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [mockComment1],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      // Menu item should prompt user to show comments
      const showCommentsMenuItem = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      // When show comments menu item is clicked
      showCommentsMenuItem.click();

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // Page should not be scrolled
      expect(mockScrollDocumentToTop).not.toHaveBeenCalled();

      // No comments should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // Comment should be visible after a while
      await waitFor(() => {
        expect(getById(mockComment1Id).id).toBe(mockComment1Id);
      });

      expect(getById(emptyCommentsContainerId)).toBeNull();

      // comments should have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).toHaveBeenCalledWith({
        ...mockOnlineExperience1,
        comments: [mockComment1],
      });

      // Page should be scrolled
      expect(mockScrollDocumentToTop).toHaveBeenCalled();

      // When hide comment menu item is clicked
      getById(hideCommentsMenuId).click();

      // Comments should not be visible
      expect(getById(mockComment1Id)).toBeNull();
    });
  });

  it("displays offline comments", async () => {
    mockGetIsConnected.mockReturnValue(false);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: mockOnlineExperience1,
      },
    });

    mockReadExperienceCompleteFragment.mockReturnValue({
      ...mockOnlineExperience1,
      comments: [mockComment1],
    });

    mockUseWithSubscriptionContext.mockReturnValue({});

    const { ui } = makeComp();
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      // When show comments menu item is clicked
      const showCommentsMenuItem = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      showCommentsMenuItem.click();

      // Page should not be scrolled
      expect(mockScrollDocumentToTop).not.toHaveBeenCalled();

      // Comment should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // Comment should be visible after a while
      await waitFor(() => {
        expect(getById(mockComment1Id).id).toBe(mockComment1Id);
      });

      expect(getById(emptyCommentsContainerId)).toBeNull();

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // Page should be scrolled
      expect(mockScrollDocumentToTop).toHaveBeenCalled();
    });
  });

  it("displays empty comments message/create new comment", async () => {
    mswServer.use(
      getMswListExperiencesGql({
        getExperience: mockOnlineExperience1,
        getEntries: onlineEntrySuccess,
      }),

      getMswExperienceCommentsGql({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(mockOnlineExperience1);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      // Menu item should prompt user to show comments
      const showCommentMenuItem = await waitFor(() => {
        const commentMenuItem = getById(showCommentsMenuId);
        expect(commentMenuItem).not.toBeNull();
        return commentMenuItem;
      });

      // When show comments menu item is clicked
      showCommentMenuItem.click();

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // Page should not be scrolled
      expect(mockScrollDocumentToTop).not.toHaveBeenCalled();

      // User should be prompted to create comment
      const createCommentPromptEl = await waitFor(() => {
        const el = getById(emptyCommentsContainerId);
        expect(el).not.toBeNull();
        return el;
      });

      // Comments should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // Empty comments should have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).toHaveBeenCalledWith({
        ...mockOnlineExperience1,
        comments: [],
      });

      // Page should be scrolled
      expect(mockScrollDocumentToTop).toHaveBeenCalled();
      mockScrollDocumentToTop.mockClear();

      // Show comments menu item should not be visible
      expect(getById(showCommentsMenuId)).toBeNull();

      // Upsert comment UI should not be visible
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();

      // Notification should not be visible
      expect(getById(commentNotificationId)).toBeNull();

      // Page should not be scrolled
      expect(mockScrollDocumentToTop).not.toHaveBeenCalled();

      // Comment should not be visible
      expect(getById(mockComment1Id)).toBeNull();

      // When user clicks to create element
      createCommentPromptEl.click();

      // When user create a comment successfully
      getById(mockUpsertCommentSuccessId).click();

      // Notification should be visible
      expect(getById(commentNotificationId)).not.toBeNull();

      // Comment should be visible
      expect(getById(mockComment1Id)).not.toBeNull();

      // Notification should not be visible after a while
      await waitFor(() => {
        expect(getById(commentNotificationId)).toBeNull();
      });

      // Page should be scrolled
      expect(mockScrollDocumentToTop).toHaveBeenCalled();

      // When comment UI is closed
      // getById(mockUpsertCommentCloseId).click();

      // Comment Ui should not be visible
      expect(getById(mockUpsertCommentCloseId)).toBeNull();
      expect(getById(mockUpsertCommentSuccessId)).toBeNull();
    });
  });
});

// ====================================================
// HELPER FUNCTIONS
// ====================================================

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  props.match = {
    params: {
      experienceId: mockOnlineExperience1.id,
    },
  } as Match;

  return {
    ui: (
      <DetailExperienceP
        componentTimeoutsMs={{ fetchRetries: [0], closeNotification: 0 }}
        getExperienceComments={getExperienceComments}
        {...props}
      />
    ),
  };
}

function getCommentsErrorContainer() {
  return getById(commentsErrorContainerId);
}
