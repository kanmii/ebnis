import { experienceDefinitionResolvers } from "../components/NewExperience/new-experience.resolvers";
import { MUTATION_NAME_createExperienceOffline } from "../apollo/resolvers";
import {
  CreateExperiencesVariables,
  CreateExperiences_createExperiences_CreateExperienceErrors,
  CreateExperiences_createExperiences_ExperienceSuccess,
} from "../graphql/apollo-types/CreateExperiences";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { writeExperienceFragmentToCache } from "../apollo/write-experience-fragment";
import { insertExperienceInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { writeUnsyncedExperience } from "../apollo/unsynced-ledger";
import { isOfflineId } from "../utils/offlines";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { GetExperienceConnectionMini_getExperiences } from "../graphql/apollo-types/GetExperienceConnectionMini";

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockInsertExperienceInGetExperiencesMiniQuery = insertExperienceInGetExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/write-experience-fragment");
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;

jest.mock("uuidv4", () => ({
  uuid: () => "1",
}));

const createOfflineExperienceResolver =
  experienceDefinitionResolvers.Mutation[MUTATION_NAME_createExperienceOffline];

it("creates offline experience/success", () => {
  expect(mockWriteExperienceFragmentToCache).not.toHaveBeenCalled();
  expect(mockInsertExperienceInGetExperiencesMiniQuery).not.toHaveBeenCalled();
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
    null as any,
  ) as CreateExperiences_createExperiences_ExperienceSuccess

  expect(mockWriteExperienceFragmentToCache).toHaveBeenCalled();
  expect(mockInsertExperienceInGetExperiencesMiniQuery).toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).toHaveBeenCalled();
  expect(isOfflineId(experience.id)).toBe(true);
});

it("creates offline experience/fails", () => {
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
    null as any,
  ) as CreateExperiences_createExperiences_CreateExperienceErrors;

  expect(typeof errors.title).toBe("string");
});
