/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  getMswExperienceCommentsGql,
  getMswListExperiencesGql,
} from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer, mswServerListen } from "@eb/cm/src/__tests__/msw-server";
import { waitForCount } from "@eb/cm/src/__tests__/pure-utils";
import { cleanup, render, waitFor } from "@testing-library/react";
import React, { ComponentType } from "react";
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
  hideDetailedExperienceCommentsText,
  showDetailedExperienceCommentsText,
  showExperienceCommentsLinkSelector,
  noCommentsContainerSelector,
} from "../components/DetailExperience/detail-experience.dom";
import {
  Match,
  Props,
} from "../components/DetailExperience/detailed-experience-utils";
import { getById } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { getIsConnected } from "../utils/connections";
import { E2EWindowObject } from "../utils/types";

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

const onlineId = "onlineId";
const onlineDefinitionId = "1";

const onlineExperience = {
  title: "",
  description: "",
  clientId: "",
  insertedAt: "",
  updatedAt: "",
  id: onlineId,
  dataDefinitions: [
    {
      id: onlineDefinitionId,
      clientId: "",
      name: "aa",
      type: DataTypes.INTEGER,
      __typename: "DataDefinition",
    },
  ],
  __typename: "Experience",
} as ExperienceCompleteFragment;

// ====================================================
// TESTS
// ====================================================

describe("components", () => {
  const comment1Id = "comment-1";
  const comment2Id = "comment-2";

  const comment1: CommentFragment = {
    id: comment1Id,
    text: "comment-1",
    __typename: "Comment",
  };

  const comment2: CommentFragment = {
    id: comment1Id,
    text: "comment-2",
    __typename: "Comment",
  };

  it("create online comment", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
      },
    });

    mswServer.use(
      getMswExperienceCommentsGql({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(onlineExperience);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      // Comments should not be visible
      expect(getById(comment1Id)).toBeNull();

      // Menu item should prompt user to show comments
      const commentMenuItem = await waitForCount(async () => {
        const el = await waitFor(getShowExperienceCommentsEl);
        return el;
      });

      expect(commentMenuItem.textContent).toBe(
        showDetailedExperienceCommentsText,
      );

      // When show comments menu item is clicked
      commentMenuItem.click();

      // Comment should be visible
      const noCommentsEl = await waitForCount(async () => {
        const noCommentsEl = await waitFor(() => {
          const noCommentsEl = getById(noCommentsContainerSelector);
          return noCommentsEl;
        });

        return noCommentsEl;
      });

      expect(noCommentsEl).not.toBeNull();
    });
  });

  it("displays online comments", async () => {
    mswServer.use(
      getMswListExperiencesGql({
        getExperience: onlineExperience,
        getEntries: null,
      }),

      getMswExperienceCommentsGql({
        getExperienceComments: {
          __typename: "GetExperienceCommentsSuccess",
          comments: [comment1],
        },
      }),
    );

    mockReadExperienceCompleteFragment.mockReturnValue(onlineExperience);
    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      // Comments should not be visible
      expect(getById(comment1Id)).toBeNull();

      // Menu item should prompt user to show comments
      const commentMenuItem = await waitForCount(async () => {
        const el = await waitFor(getShowExperienceCommentsEl);
        return el;
      });

      expect(commentMenuItem.textContent).toBe(
        showDetailedExperienceCommentsText,
      );

      // When show comments menu item is clicked
      commentMenuItem.click();

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();

      // Comment should be visible
      const commentEl = await waitForCount(async () => {
        const commentEl = await waitFor(() => {
          return getById(comment1Id);
        });
        return commentEl;
      });

      expect(commentEl.id).toBe(comment1Id);
      expect(getById(noCommentsContainerSelector)).toBeNull();

      // comments should have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).toHaveBeenCalledWith({
        ...onlineExperience,
        comments: [comment1],
      });

      // Menu item should prompt user to hide comments
      expect(commentMenuItem.textContent).toBe(
        hideDetailedExperienceCommentsText,
      );

      // When hide comment menu item is clicked
      commentMenuItem.click();

      // Comments should not be visible
      expect(getById(comment1Id)).toBeNull();
    });
  });

  it("displays offline comments", async () => {
    mockGetIsConnected.mockReturnValue(false);

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValueOnce({
      data: {
        getExperience: onlineExperience,
      },
    });

    mockReadExperienceCompleteFragment.mockReturnValue({
      ...onlineExperience,
      comments: [comment1],
    });

    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      await waitFor(() => true);

      // Comment should not be visible
      expect(getById(comment1Id)).toBeNull();

      // When show comments menu item is clicked
      // const commentMenuItem = await waitFor(getShowExperienceCommentsEl);
      const commentMenuItem = await waitForCount(async () => {
        const commentEl = await waitFor(getShowExperienceCommentsEl);

        return commentEl;
      });

      commentMenuItem.click();

      // Comment should be visible
      const commentEl = await waitForCount(async () => {
        const commentEl = await waitFor(() => {
          const commentEl = getById(comment1Id);
          return commentEl;
        });

        return commentEl;
      });

      expect(commentEl.id).toBe(comment1Id);
      expect(getById(noCommentsContainerSelector)).toBeNull();

      // comments should not have been written to cache
      expect(mockWriteCachedExperienceCompleteFragment).not.toHaveBeenCalled();
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
      experienceId: onlineExperience.id,
    },
  } as Match;

  return {
    ui: <DetailExperienceP {...props} />,
  };
}

function getShowExperienceCommentsEl() {
  return document
    .getElementsByClassName(showExperienceCommentsLinkSelector)
    .item(0) as HTMLElement;
}
