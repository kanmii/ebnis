import { createOfflineExperience } from "../components/UpsertExperience/upsert-experience.resolvers";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { upsertExperiencesInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { writeUnsyncedExperience } from "../apollo/unsynced-ledger";
import { isOfflineId } from "../utils/offlines";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { GetExperienceConnectionMini_getExperiences } from "../graphql/apollo-types/GetExperienceConnectionMini";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { E2EWindowObject } from "../utils/types";

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = upsertExperiencesInGetExperiencesMiniQuery as jest.Mock;

const mockWriteQueryFn = jest.fn();

const cache = {
  writeQuery: mockWriteQueryFn,
} as any;

let mockUuid = 0;
jest.mock("uuid", () => ({
  v4: () => "" + mockUuid++,
}));

const globals = {
  cache,
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = globals;
});

afterAll(() => {
  delete window.____ebnis;
});

afterEach(() => {
  jest.resetAllMocks();
  mockUuid = 0;
});

it("creates offline experience/success", () => {
  expect(
    mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();

  mockGetExperiencesMiniQuery.mockReturnValue(null);

  const experience = createOfflineExperience({
    input: [
      {
        title: "aa",
        dataDefinitions: [
          {
            name: "nn",
            type: DataTypes.DATE,
          },
        ],
      },
    ],
  }) as ExperienceFragment;

  const erfahrungId = experience.id;

  expect(
    mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery.mock
      .calls[0][0],
  ).toEqual([[erfahrungId, experience]]);

  expect(mockWriteUnsyncedExperience.mock.calls[0]).toEqual([
    erfahrungId,
    {
      isOffline: true,
    },
  ]);

  expect(isOfflineId(erfahrungId)).toBe(true);
});

it("creates offline experience fails weil es liegt Erfahrung Titel", () => {
  mockGetExperiencesMiniQuery.mockReturnValue({
    edges: [
      {
        node: {
          title: "aa",
        },
      },
    ],
  } as GetExperienceConnectionMini_getExperiences);

  const errors = createOfflineExperience({
    input: [
      {
        title: "aa",
        dataDefinitions: [
          {
            name: "nn",
            type: DataTypes.DATE,
          },
        ],
      },
    ],
  }) as string;

  expect(typeof errors).toBe("string");
});
