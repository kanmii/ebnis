import { CommentFragment } from "../graphql/apollo-types/CommentFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "../graphql/apollo-types/ExperienceCompleteFragment";
import { GetEntriesUnionFragment } from "../graphql/apollo-types/GetEntriesUnionFragment";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { makeOfflineId } from "../utils/offlines";

export const mockOnlineExperienceId1 = "onlineId";
const mockOnlineDefinitionId1 = "1";

const mockOnlineEntry1ClientId = "on-ent-cl-1";
export const mockOnlineEntry1Id = "on-ent-1";

export const mockOfflineEntry1Id = makeOfflineId("b");

export const mockComment1Id = "comment-1";

export const mockComment2Id = "comment-2";

export const mockComment3Id = "comment-3";

export const mockOnlineEntry1: EntryFragment = {
  __typename: "Entry",
  experienceId: mockOnlineExperienceId1,
  id: mockOnlineEntry1Id,
  clientId: mockOnlineEntry1ClientId,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      id: "a",
      definitionId: "1",
      data: `{"integer":1}`,
      __typename: "DataObject",
      clientId: "",
      insertedAt: "",
      updatedAt: "",
    },
  ],
};

export const mockOnlineEntry1Success: GetEntriesUnionFragment = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: mockOnlineEntry1,
        __typename: "EntryEdge",
        cursor: "a",
      },
    ],
    __typename: "EntryConnection",
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    },
  },
};

export const mockOfflineEntry1 = {
  __typename: "Entry",
  id: mockOfflineEntry1Id,
  clientId: mockOfflineEntry1Id,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      __typename: "DataObject",
      id: "a",
      definitionId: "1",
      data: `{"integer":1}`,
    },
  ],
} as EntryFragment;

export const offlineEntrySuccess = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: mockOfflineEntry1,
      },
    ],
    pageInfo: {},
  },
};

export const mockComment1: CommentFragment = {
  id: mockComment1Id,
  text: "comment-1",
  __typename: "Comment",
};

export const mockComment2: CommentFragment = {
  id: mockComment2Id,
  text: "comment-2",
  __typename: "Comment",
};

export const mockComment3: CommentFragment = {
  id: mockComment3Id,
  text: "comment-3",
  __typename: "Comment",
};

export const mockOnlineExperience1 = {
  title: "",
  description: "",
  clientId: "",
  insertedAt: "",
  updatedAt: "",
  id: mockOnlineExperienceId1,
  dataDefinitions: [
    {
      id: mockOnlineDefinitionId1,
      clientId: "",
      name: "aa",
      type: DataTypes.INTEGER,
      __typename: "DataDefinition",
    },
  ],
  __typename: "Experience",
} as ExperienceCompleteFragment;
