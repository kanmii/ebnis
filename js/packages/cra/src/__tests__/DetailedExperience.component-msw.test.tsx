/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import {
  getMswExperienceCommentsGql,
  getMswListExperiencesGql,
} from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer } from "@eb/cm/src/__tests__/msw-server";
import { waitForCount } from "@eb/cm/src/__tests__/pure-utils";
import { cleanup, render, waitFor } from "@testing-library/react";
import React, { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { makeApolloClient } from "../apollo/client";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import { showExperienceCommentsLinkSelector } from "../components/DetailExperience/detail-experience.dom";
import {
  Match,
  Props,
} from "../components/DetailExperience/detailed-experience-utils";
import { deleteObjectKey } from "../utils";
import { getIsConnected } from "../utils/connections";
import { E2EWindowObject } from "../utils/types";

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
  mswServer.listen({
    onUnhandledRequest: "warn",
  });
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
  mswServer.close();
});

beforeEach(() => {
  const { client, cache } = makeApolloClient({ mock: true });
  ebnisObject.cache = cache;
  ebnisObject.client = client;
});

afterEach(() => {
  mswServer.resetHandlers();
  cleanup();
  jest.resetAllMocks();
  delete (ebnisObject as any).client;
  delete (ebnisObject as any).cache;
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

////////////////////////// TESTS //////////////////////////////

describe("components", () => {
  it("displays comments", async () => {
    mswServer.use(
      getMswListExperiencesGql({
        getExperience: onlineExperience,
        getEntries: null,
      }),

      getMswExperienceCommentsGql({
        getExperienceComments: [
          {
            id: "aa",
            text: "aa",
            __typename: "Comment",
          },
        ],
      }),
    );

    mockUseWithSubscriptionContext.mockReturnValue({});
    mockGetIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    await act(async () => {
      render(ui);

      const el = await waitForCount(async () => {
        const el = await waitFor(getShowExperienceCommentsEl);
        return el;
      });

      el.click();
    });
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

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
