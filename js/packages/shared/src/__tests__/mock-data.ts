import { CommentFragment } from "../graphql/apollo-types/CommentFragment";
import { DataDefinitionFragment } from "../graphql/apollo-types/DataDefinitionFragment";
import { EntryConnectionFragment } from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "../graphql/apollo-types/ExperienceDCFragment";
import { GetEntriesUnionFragment } from "../graphql/apollo-types/GetEntriesUnionFragment";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { UserFragment } from "../graphql/apollo-types/UserFragment";
import { makeOfflineId } from "../utils/offlines";

// ====================================================
// START IDs
// ====================================================
export const mockUser1Id = "aaa";

export const mockOnlineExperienceId1 = "onlineId1";
export const mockOnlineDataDefinitionInteger1Id = "1";

export const mockOfflineExperienceId1 = makeOfflineId("onlineId1");

const mockOnlineEntry1ClientId = "on-ent-cl-1";
export const mockOnlineEntry1Id = "on-ent-1";

export const mockOnlineEntry2Id = "on-ent-2";

export const mockOfflineEntry1Id = makeOfflineId("b");

export const mockComment1Id = "comment-1";

export const mockComment2Id = "comment-2";

export const mockComment3Id = "comment-3";

export const mockOnlineDataObject1id = "aa";
// ====================================================
// END IDs
// ====================================================

export const mockOnlineEntry1: EntryFragment = {
  __typename: "Entry",
  experienceId: mockOnlineExperienceId1,
  id: mockOnlineEntry1Id,
  clientId: mockOnlineEntry1ClientId,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      id: mockOnlineDataObject1id,
      definitionId: mockOnlineDataDefinitionInteger1Id,
      data: `{"integer":1}`,
      __typename: "DataObject",
      clientId: "",
      insertedAt: "2021-02-19T00:41:52.618Z",
      updatedAt: "2021-02-19T00:41:52.618Z",
    },
  ],
};

export const mockOnlineEntry2: EntryFragment = {
  __typename: "Entry",
  experienceId: mockOnlineExperienceId1,
  id: mockOnlineEntry2Id,
  clientId: null,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
      id: mockOnlineDataObject1id,
      definitionId: mockOnlineDataDefinitionInteger1Id,
      data: `{"integer":1}`,
      __typename: "DataObject",
      clientId: "",
      insertedAt: "2021-02-19T00:41:52.618Z",
      updatedAt: "2021-02-19T00:41:52.618Z",
    },
  ],
};

export const mockEntry1Connection: EntryConnectionFragment = {
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
};

export const mockOnlineEntry1Success: GetEntriesUnionFragment = {
  __typename: "GetEntriesSuccess",
  entries: mockEntry1Connection,
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

export const mockDataDefinitionInteger1: DataDefinitionFragment = {
  __typename: "DataDefinition",
  id: mockOnlineDataDefinitionInteger1Id,
  clientId: "",
  name: "start number",
  type: DataTypes.INTEGER,
};

export const mockOnlineExperience1 = {
  title: "online experience 1",
  description: "",
  clientId: "",
  insertedAt: "2021-02-19T00:40:39.388Z",
  updatedAt: "2021-02-19T00:40:39.388Z",
  id: mockOnlineExperienceId1,
  dataDefinitions: [mockDataDefinitionInteger1],
  __typename: "Experience",
  comments: null,
} as ExperienceDCFragment;

export const mockOfflineExperience1 = {
  title: "online experience 1",
  description: "",
  clientId: "",
  insertedAt: "2021-02-19T00:40:39.388Z",
  updatedAt: "2021-02-19T00:40:39.388Z",
  id: mockOfflineExperienceId1,
  dataDefinitions: [mockDataDefinitionInteger1],
  __typename: "Experience",
} as ExperienceDCFragment;

export const mockUser1: UserFragment = {
  __typename: "User",
  id: mockUser1Id,
  name: "john",
  email: "john@abc.com",
  jwt: "",
};
