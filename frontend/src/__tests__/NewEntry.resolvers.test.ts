/* eslint-disable @typescript-eslint/no-explicit-any */
import { MUTATION_NAME_createOfflineEntry } from "../apollo/resolvers";
import {
  newEntryResolvers,
  CreateOfflineEntryMutationVariables,
  CreateOfflineEntryMutationValid,
} from "../components/NewEntry/new-entry.resolvers";
import { upsertExperienceWithEntry } from "../components/NewEntry/new-entry.injectables";
import { isOfflineId, makeOfflineId } from "../utils/offlines";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "../apollo/unsynced-ledger";
import { readExperienceFragment } from "../apollo/read-experience-fragment";

jest.mock("../components/NewEntry/new-entry.injectables");
const mockUpsertExperienceWithEntry = upsertExperienceWithEntry as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/read-experience-fragment");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;

const createOfflineEntryMutationResolver =
  newEntryResolvers.Mutation[MUTATION_NAME_createOfflineEntry];

const mockCache = jest.fn();
const context = {
  cache: mockCache,
} as any;

afterEach(() => {
  jest.resetAllMocks();
});

const obj = null as any;

it("online experience/creates entry", () => {
  mockGetUnsyncedExperience.mockReturnValue({});

  const variables = {
    experienceId: "1",
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  expect(mockUpsertExperienceWithEntry).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();

  mockReadExperienceFragment.mockReturnValue({
    entries: {
      edges: [],
    },
  });

  const {
    entry: { id, dataObjects },
  } = createOfflineEntryMutationResolver(
    obj,
    variables,
    context,
  ) as CreateOfflineEntryMutationValid;

  expect(mockUpsertExperienceWithEntry).toHaveBeenCalled();
  expect(isOfflineId(id));
  expect(isOfflineId((dataObjects[0] as any).id));
  expect(mockWriteUnsyncedExperience.mock.calls[0]).toEqual([
    "1",
    {
      newEntries: true,
    },
  ]);
});

it("offline experience/creates entry", () => {
  mockGetUnsyncedExperience.mockReturnValue(null);

  mockReadExperienceFragment.mockReturnValue({
    entries: {
      edges: [],
    },
  });

  const id = makeOfflineId(1);

  const variables = {
    experienceId: id,
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  createOfflineEntryMutationResolver(obj, variables, context);

  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockUpsertExperienceWithEntry).toHaveBeenCalled();
});

it("experience not found", () => {
  const variables = {
    experienceId: "0",
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  const result = createOfflineEntryMutationResolver(obj, variables, context);
  expect(result).toBeNull();
});
