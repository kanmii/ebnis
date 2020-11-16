/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CreateOfflineEntryMutationVariables,
  CreateOfflineEntryMutationValid,
  createOfflineEntryMutation,
} from "../components/UpsertEntry/upsert-entry.resolvers";
import { upsertNewEntry } from "../components/UpsertEntry/upsert-entry.injectables";
import { isOfflineId, makeOfflineId } from "../utils/offlines";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "../apollo/unsynced-ledger";
import {
  readExperienceFragment,
  getEntriesQuerySuccess,
} from "../apollo/get-detailed-experience-query";

jest.mock("../components/UpsertEntry/upsert-entry.injectables");
const mockUpsertWithEntry = upsertNewEntry as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;
const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;

afterEach(() => {
  jest.resetAllMocks();
});

it("online experience/creates entry", () => {
  mockGetUnsyncedExperience.mockReturnValue({});

  mockGetEntriesQuerySuccess.mockReturnValueOnce({
    edges: [],
  });

  mockUpsertWithEntry.mockReturnValueOnce({});

  const variables = {
    experienceId: "1",
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  expect(mockUpsertWithEntry).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();

  mockReadExperienceFragment.mockReturnValue({});

  const {
    entry: { id, dataObjects },
  } = createOfflineEntryMutation(variables) as CreateOfflineEntryMutationValid;

  expect(mockUpsertWithEntry).toHaveBeenCalled();
  expect(isOfflineId(id)).toBe(true);
  expect(isOfflineId((dataObjects[0] as any).id)).toBe(true);

  expect(mockWriteUnsyncedExperience.mock.calls[0]).toEqual([
    "1",
    {
      newEntries: true,
    },
  ]);
});

it("offline experience/creates entry", () => {
  mockGetUnsyncedExperience.mockReturnValue(null);

  mockGetEntriesQuerySuccess.mockReturnValueOnce({
    edges: [],
  });

  mockUpsertWithEntry.mockReturnValueOnce({});

  mockReadExperienceFragment.mockReturnValue({});

  const id = makeOfflineId(1);

  const variables = {
    experienceId: id,
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  createOfflineEntryMutation(variables);

  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockUpsertWithEntry).toHaveBeenCalled();
});

it("experience not found", () => {
  const variables = {
    experienceId: "0",
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  const result = createOfflineEntryMutation(variables);
  expect(result).toBeNull();
});
