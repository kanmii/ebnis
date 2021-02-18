/* eslint-disable @typescript-eslint/no-var-requires */
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
  mockOnlineExperience1,
  mockOnlineEntry1Success,
} from "./mock-data";
import {
  getMswExperienceCommentsGql,
  getMswListExperiencesGql,
  updateMswExperiencesGql,
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

mswBrowserWorker.use(
  getMswListExperiencesGql({
    getExperience: mockOnlineExperience1,
    getEntries: mockOnlineEntry1Success,
  }),

  getMswExperienceCommentsGql({
    getExperienceComments: {
      __typename: "GetExperienceCommentsSuccess",
      comments: [mockComment1, mockComment2, mockComment3],
    },
  }),

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
  }),
);
