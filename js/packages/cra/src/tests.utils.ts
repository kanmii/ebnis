/* istanbul ignore file */
import { CommentFragment } from "@eb/cm/src/graphql/apollo-types/CommentFragment";
import { EntryConnectionFragment } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { GetEntriesUnionFragment } from "@eb/cm/src/graphql/apollo-types/GetEntriesUnionFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { fireEvent } from "@testing-library/react";
import { GenericGeneralEffect, GenericHasEffect } from "./utils/effects";
import { makeOfflineId } from "./utils/offlines";

export function fillField(element: Element, value: string) {
  fireEvent.change(element, {
    target: { value },
  });
}

export function getById<T extends HTMLElement = HTMLElement>(domId: string) {
  return document.getElementById(domId) as T;
}

export function getByClass(className: string) {
  return document.getElementsByClassName(className);
}

export const defaultExperience = {
  id: "1",
  dataDefinitions: [
    {
      id: "1",
      name: "aa",
      type: DataTypes.INTEGER,
    },
  ],
} as ExperienceCompleteFragment;

export const defaultGetEntriesQuery = {
  edges: [] as any,
} as EntryConnectionFragment;

const onlineEntryClientId = "aa";
export const onlineEntryId = "a";

export const onlineEntry: EntryFragment = {
  __typename: "Entry",
  experienceId: "x",
  id: onlineEntryId,
  clientId: onlineEntryClientId,
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

export const onlineEntrySuccess: GetEntriesUnionFragment = {
  __typename: "GetEntriesSuccess",
  entries: {
    edges: [
      {
        node: onlineEntry,
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

export const offlineEntryId = makeOfflineId("b");
export const offlineEntry = {
  __typename: "Entry",
  id: offlineEntryId,
  clientId: offlineEntryId,
  insertedAt: "2020-09-16T20:00:37Z",
  updatedAt: "2020-09-16T20:00:37Z",
  dataObjects: [
    {
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
        node: offlineEntry,
      },
    ],
    pageInfo: {},
  },
};

export const mockComment1Id = "comment-1";

export const mockComment1: CommentFragment = {
  id: mockComment1Id,
  text: "comment-1",
  __typename: "Comment",
};

export const mockComment2Id = "comment-2";

export const mockComment2: CommentFragment = {
  id: mockComment2Id,
  text: "comment-2",
  __typename: "Comment",
};

export const mockComment3Id = "comment-3";

export const mockComment3: CommentFragment = {
  id: mockComment3Id,
  text: "comment-3",
  __typename: "Comment",
};

export const mockOnlineExperienceId1 = "onlineId";
const mockOnlineDefinitionId1 = "1";

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

export function getEffects<E, S extends GenericGeneralEffect<E>>(state: S) {
  return (state.effects.general as GenericHasEffect<E>).hasEffects.context
    .effects;
}
