/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getCachedEntriesDetailViewSuccess,
  readExperienceDFragment,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import {
  getUnsyncedExperience,
  writeUnsyncedExperience,
} from "@eb/shared/src/apollo/unsynced-ledger";
import { upsertNewEntry } from "@eb/shared/src/apollo/upsert-entry.injectables";
import {
  createOfflineEntryMutation,
  CreateOfflineEntryMutationReturnVal,
  CreateOfflineEntryMutationVariables,
} from "@eb/shared/src/apollo/upsert-entry.resolvers";
import { isOfflineId, makeOfflineId } from "@eb/shared/src/utils/offlines";
import { deleteObjectKey } from "../utils";

jest.mock("@eb/shared/src/apollo/upsert-entry.injectables");
const mockUpsertWithEntry = upsertNewEntry as jest.Mock;

jest.mock("@eb/shared/src/apollo/unsynced-ledger");
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("@eb/shared/src/apollo/experience-detail-cache-utils");
const mockReadExperienceFragment = readExperienceDFragment as jest.Mock;
const mockGetEntriesQuerySuccess =
  getCachedEntriesDetailViewSuccess as jest.Mock;

const mockPersistFn = jest.fn();

const ebnisObject = {
  persistor: {
    persist: mockPersistFn,
  },
};

beforeAll(() => {
  window.____ebnis = ebnisObject as any;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

afterEach(() => {
  jest.clearAllMocks();
});

it("online experience/creates entry", async () => {
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
  } = (await createOfflineEntryMutation(
    variables,
  )) as CreateOfflineEntryMutationReturnVal;

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

it("offline experience/creates entry", async () => {
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

  await createOfflineEntryMutation(variables);

  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockUpsertWithEntry).toHaveBeenCalled();
});

it("experience not found", async () => {
  const variables = {
    experienceId: "0",
    dataObjects: [{}],
  } as CreateOfflineEntryMutationVariables;

  const result = await createOfflineEntryMutation(variables);
  expect(result).toBeNull();
});

it("with default values", async () => {
  mockGetUnsyncedExperience.mockReturnValue({});

  mockGetEntriesQuerySuccess.mockReturnValueOnce({
    edges: [],
  });

  mockUpsertWithEntry.mockReturnValueOnce({});

  const variables = {
    experienceId: "1",
    id: "e",
    dataObjects: [
      {
        id: "d",
      },
    ],
  } as CreateOfflineEntryMutationVariables;

  expect(mockUpsertWithEntry).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();

  const {
    entry: { id, dataObjects },
  } = (await createOfflineEntryMutation(
    variables,
    {} as any,
  )) as CreateOfflineEntryMutationReturnVal;

  expect(mockUpsertWithEntry).toHaveBeenCalled();

  expect(id).toBe("e");

  expect((dataObjects[0] as any).id).toBe("d");

  expect(mockWriteUnsyncedExperience.mock.calls[0]).toEqual([
    "1",
    {
      newEntries: true,
    },
  ]);
});
