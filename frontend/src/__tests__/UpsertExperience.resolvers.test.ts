import { upsertExperienceResolvers } from "../components/UpsertExperience/upsert-experience.resolvers";
import { MUTATION_NAME_createExperienceOffline } from "../apollo/resolvers";
import {
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_CreateExperienceErrors,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "../graphql/apollo-types/CreateExperiences";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { upsertExperiencesInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { writeUnsyncedExperience } from "../apollo/unsynced-ledger";
import { isOfflineId } from "../utils/offlines";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { GetExperienceConnectionMini_getExperiences } from "../graphql/apollo-types/GetExperienceConnectionMini";

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = upsertExperiencesInGetExperiencesMiniQuery as jest.Mock;

const mockWriteQueryFn = jest.fn();

const cache = {
  writeQuery: mockWriteQueryFn,
};

const lastArg = { cache } as any;

let mockUuid = 0;
jest.mock("uuid", () => ({
  v4: () => "" + mockUuid++,
}));

afterEach(() => {
  jest.resetAllMocks();
  mockUuid = 0;
});

const createOfflineExperienceResolver =
  upsertExperienceResolvers.Mutation[MUTATION_NAME_createExperienceOffline];

it("creates offline experience/success", () => {
  expect(
    mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();

  mockGetExperiencesMiniQuery.mockReturnValue(null);

  const { experience } = createOfflineExperienceResolver(
    null as any,
    {
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
    } as CreateExperiencesVariables,
    lastArg,
  ) as CreateExperiences_createExperiences_ExperienceSuccess;

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

  const { errors } = createOfflineExperienceResolver(
    null as any,
    {
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
    } as CreateExperiencesVariables,
    lastArg,
  ) as CreateExperiences_createExperiences_CreateExperienceErrors;

  expect(typeof errors.title).toBe("string");
});
