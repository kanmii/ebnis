/* eslint-disable @typescript-eslint/no-var-requires */
import { DeleteExperiences } from "../graphql/apollo-types/DeleteExperiences";
import { GetExperienceComments } from "../graphql/apollo-types/GetExperienceComments";
import { UpdateExperiencesOnline } from "../graphql/apollo-types/UpdateExperiencesOnline";
import {
  CYPRESS_APOLLO_KEY,
  EbnisGlobals,
  MswGraphql,
  MswSetupWorkerApi,
} from "../utils/types";
import {
  mockComment1,
  mockComment2,
  mockComment3,
  mockComment3Id,
  mockDataDefinition1,
  mockOnlineEntry1,
  mockOnlineEntry1Success,
  mockOnlineExperience1,
  mockOnlineExperience2,
  mockOnlineExperience3,
  mockOnlineExperienceId1,
  mockUser1,
} from "./mock-data";
import {
  getExperienceAndEntriesDetailViewGqlMsw,
  getExperienceCommentsGqlMsw,
  getExperiencesConnectionListViewMswGql,
  getPreFetchExperiencesMswGql,
  loginMswGql,
  updateExperiencesMswGql,
  deleteExperiencesMswGql,
} from "./msw-handlers";

let ebnis: EbnisGlobals;

let mswBrowserWorker: MswSetupWorkerApi;
let mswGraphql: MswGraphql;

if (window.Cypress) {
  ebnis = window.Cypress.env(CYPRESS_APOLLO_KEY) as EbnisGlobals;
  window.____ebnis = ebnis;

  mswBrowserWorker = ebnis.mswBrowserWorker as MswSetupWorkerApi;
  mswGraphql = ebnis.mswGraphql as MswGraphql;
  // Browser worker would have been started inside cypress
  // mswBrowserWorker.start();
} else {
  const msw = require("./msw-browser");

  mswBrowserWorker = msw.mswBrowserWorker as MswSetupWorkerApi;
  mswGraphql = msw.mswGraphql as MswGraphql;

  ebnis = (window.____ebnis || {}) as EbnisGlobals;
  ebnis.mswBrowserWorker = mswBrowserWorker;
  ebnis.mswGraphql = mswGraphql;
  window.____ebnis = ebnis;
  mswBrowserWorker.start();
}

// ====================================================
// START getMswExperienceCommentsGql
// ====================================================

export const getMswExperienceCommentsGqlSuccess3: GetExperienceComments = {
  getExperienceComments: {
    __typename: "GetExperienceCommentsSuccess",
    comments: [mockComment1, mockComment2, mockComment3],
  },
};

export const getMswExperienceCommentsGqlError: GetExperienceComments = {
  getExperienceComments: {
    __typename: "GetExperienceCommentsErrors",
    errors: {
      __typename: "ExperienceError",
      experienceId: mockOnlineExperienceId1,
      error: "error",
    },
  },
};
// ====================================================
// END getMswExperienceCommentsGql
// ====================================================

// ====================================================
// START updateMswExperiencesGql
// ====================================================

// delete comments: mockComment1 success / mockComment3 fails
const updateMswExperiencesGql1: UpdateExperiencesOnline = {
  updateExperiences: {
    __typename: "UpdateExperiencesSomeSuccess",
    experiences: [
      {
        __typename: "UpdateExperienceSomeSuccess",
        experience: {
          __typename: "UpdateExperience",
          experienceId: mockOnlineExperienceId1,
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

// ====================================================
// END updateMswExperiencesGql
// ====================================================

// ====================================================
// START deleteExperiencesMswGql
// ====================================================

// deleting online experience succeeds
const deleteOnlineExperience1Data1: DeleteExperiences = {
  deleteExperiences: {
    __typename: "DeleteExperiencesSomeSuccess",
    experiences: [
      {
        __typename: "DeleteExperienceSuccess",
        experience: {
          __typename: "Experience",
          id: mockOnlineExperienceId1,
          title: "aa",
        },
      },
    ],
    clientSession: "",
    clientToken: "",
  },
};
// ====================================================
// END deleteExperiencesMswGql
// ====================================================

mswBrowserWorker.use(
  loginMswGql({
    login: {
      __typename: "UserSuccess",
      user: mockUser1,
    },
  }),

  getPreFetchExperiencesMswGql({
    preFetchExperiences: [
      {
        __typename: "Experience",
        id: mockOnlineExperienceId1,
        comments: null,
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
        dataDefinitions: [mockDataDefinition1],
      },
    ],
  }),

  getExperiencesConnectionListViewMswGql({
    getExperiences: {
      __typename: "ExperienceConnection",
      edges: [
        {
          __typename: "ExperienceEdge",
          cursor: "",
          node: mockOnlineExperience1,
        },
        {
          __typename: "ExperienceEdge",
          cursor: "",
          node: mockOnlineExperience2,
        },
        {
          __typename: "ExperienceEdge",
          cursor: "",
          node: mockOnlineExperience3,
        },
      ],
      pageInfo: {
        __typename: "PageInfo",
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  }),

  getExperienceAndEntriesDetailViewGqlMsw({
    getExperience: mockOnlineExperience1,
    getEntries: mockOnlineEntry1Success,
  }),

  getExperienceCommentsGqlMsw(getMswExperienceCommentsGqlSuccess3),

  updateExperiencesMswGql(updateMswExperiencesGql1),

  deleteExperiencesMswGql(deleteOnlineExperience1Data1),
);
