import {
  createOfflineExperience,
  updateExperienceOfflineFn,
} from "../components/UpsertExperience/upsert-experience.resolvers";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import {
  upsertExperiencesInGetExperiencesMiniQuery,
  floatExperienceToTheTopInGetExperiencesMiniQuery,
} from "../apollo/update-get-experiences-mini-query";
import {
  writeUnsyncedExperience,
  getUnsyncedExperience,
} from "../apollo/unsynced-ledger";
import { isOfflineId, makeOfflineId } from "../utils/offlines";
import { getExperiencesMiniQuery } from "../apollo/get-experiences-mini-query";
import { GetExperienceConnectionMini_getExperiences } from "../graphql/apollo-types/GetExperienceConnectionMini";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { E2EWindowObject } from "../utils/types";
import {
  readExperienceFragment,
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
  writeExperienceFragmentToCache,
} from "../apollo/get-detailed-experience-query";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { AppPersistor } from "../utils/app-context";

jest.mock("../apollo/get-detailed-experience-query");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;
const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;
const mockWriteGetEntriesQuery = writeGetEntriesQuery as jest.Mock;
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;

jest.mock("../apollo/get-experiences-mini-query");
const mockGetExperiencesMiniQuery = getExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockInsertOrReplaceOrRemoveExperiencesInGetExperiencesMiniQuery = upsertExperiencesInGetExperiencesMiniQuery as jest.Mock;
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

const mockWriteQueryFn = jest.fn();

const cache = {
  writeQuery: mockWriteQueryFn,
} as any;

let mockUuid = 0;
jest.mock("uuid", () => ({
  v4: () => "" + mockUuid++,
}));

const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const globals = {
  cache,
  persistor,
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

const onlineExperience = {
  id: "1",
  title: "a",
} as ExperienceFragment;

it("updates online experience: title and description", () => {
  mockReadExperienceFragment.mockReturnValue(onlineExperience);

  mockGetUnsyncedExperience.mockReturnValue({});

  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [],
  });

  const input = {
    experienceId: "1",
    ownFields: {
      title: "b",
      description: "c",
    },
  };

  const receivedExperience = updateExperienceOfflineFn(input);

  const expectedExperience = {
    id: "1",
    title: "b",
    description: "c",
  };

  expect(receivedExperience).toEqual(expectedExperience);
  expect(mockWriteGetEntriesQuery).not.toBeCalledWith();

  expect(mockWriteExperienceFragmentToCache).toBeCalledWith(expectedExperience);

  expect(mockFloatExperienceToTheTopInGetExperiencesMiniQuery).toBeCalledWith(
    expectedExperience,
  );

  expect(mockWriteUnsyncedExperience).toBeCalledWith("1", {
    ownFields: {
      title: true,
      description: true,
    },
  });
});

it("updates offline experience: entry updated / deleted / definition updated", () => {
  const offlineExperienceId = makeOfflineId(".");

  const definitionNoChanges = {
    id: "dd1",
    name: "dd1n",
    type: DataTypes.INTEGER,
  };

  const definitionNameChanged = {
    id: "dd2",
    name: "dd2n",
    type: DataTypes.SINGLE_LINE_TEXT,
  };

  const definitionTypeChanged = {
    id: "dd3",
    name: "dd3n",
    type: DataTypes.INTEGER,
  };

  const offlineExperience = {
    id: offlineExperienceId,
    dataDefinitions: [
      definitionNoChanges,
      definitionNameChanged,
      definitionTypeChanged,
    ],
  } as ExperienceFragment;

  const dataObjectDataChanged = {
    id: "do1",
    definitionId: "dd1",
    data: `{"integer":1}`,
  };

  const updatedDataObjectDataChanged = {
    id: "do1",
    definitionId: "dd1",
    data: `{"integer":2}`,
  };

  const dataObjectNameChanged = {
    id: "do2",
    definitionId: "dd2",
    data: `{"single_line_text":"a"}`,
  };

  const dataObjectTypeChanged = {
    id: "do2",
    definitionId: definitionTypeChanged.id,
    data: `{"integer":5}`,
  };

  const entry = {
    id: "ent1",
    dataObjects: [
      dataObjectDataChanged,
      dataObjectNameChanged,
      dataObjectTypeChanged,
    ],
  } as EntryFragment;

  const updatedEntry = {
    id: "ent1",
    dataObjects: [
      updatedDataObjectDataChanged,
      dataObjectNameChanged,
      dataObjectTypeChanged,
    ],
  } as EntryFragment;

  mockReadExperienceFragment.mockReturnValue(offlineExperience);

  mockGetUnsyncedExperience.mockReturnValue({});

  const entryNoChanges = {
    node: {
      id: "ent3", // untouched
      dataObjects: [],
    },
  };

  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [
      {
        node: entry,
      },
      {
        node: {
          id: "ent2", // will be deleted
        },
      },
      entryNoChanges,
    ],
  });

  const input = {
    experienceId: offlineExperienceId,
    deletedEntry: {
      id: "ent2",
    } as EntryFragment,
    updatedEntry: {
      entry: updatedEntry,
      dataObjectsIds: [updatedDataObjectDataChanged.id],
    },
    updateDefinitions: [
      {
        id: definitionNameChanged.id,
        name: "dd2n?",
      },
      {
        id: definitionTypeChanged.id,
        type: DataTypes.DECIMAL,
      },
    ],
  };

  const receivedExperience = updateExperienceOfflineFn(input);

  const expectedExperience = {
    id: offlineExperienceId,
    dataDefinitions: [
      definitionNoChanges,
      {
        id: definitionNameChanged.id,
        name: "dd2n?",
        type: DataTypes.SINGLE_LINE_TEXT,
      },
      {
        id: definitionTypeChanged.id,
        name: "dd3n",
        type: DataTypes.DECIMAL,
      },
    ],
  };

  expect(receivedExperience).toEqual(expectedExperience);
  expect(mockWriteGetEntriesQuery).toBeCalledWith(
    offlineExperienceId,

    {
      __typename: "GetEntriesSuccess",
      entries: {
        edges: [
          {
            node: {
              id: entry.id,
              dataObjects: [
                {
                  data: '{"integer":2}',
                  definitionId: definitionNoChanges.id,
                  id: "do1",
                },
                dataObjectNameChanged,
                {
                  data: '{"decimal":"5"}',
                  definitionId: definitionTypeChanged.id,
                  id: dataObjectTypeChanged.id,
                },
              ],
            },
          },
          entryNoChanges,
        ],
      },
    },
  );

  expect(mockWriteExperienceFragmentToCache).toBeCalledWith(expectedExperience);

  expect(mockFloatExperienceToTheTopInGetExperiencesMiniQuery).toBeCalledWith(
    expectedExperience,
  );

  expect(mockWriteUnsyncedExperience).not.toBeCalledWith();
});

it("deletes entry from cache when entry deleted, but no updates for entries and/or data definitions", () => {
  const entry = {
    id: "ent1",
  } as EntryFragment;

  mockReadExperienceFragment.mockReturnValue(onlineExperience);

  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [
      {
        node: entry,
      },
      {
        node: {
          id: "ent2", // will be deleted
        },
      },
    ],
  });

  const input = {
    experienceId: onlineExperience.id,
    deletedEntry: {
      id: "ent2",
    } as EntryFragment,
  };

  updateExperienceOfflineFn(input);

  expect(mockWriteGetEntriesQuery).toBeCalledWith(
    onlineExperience.id,

    {
      __typename: "GetEntriesSuccess",
      entries: {
        edges: [
          {
            node: entry,
          },
        ],
      },
    },
  );
});
