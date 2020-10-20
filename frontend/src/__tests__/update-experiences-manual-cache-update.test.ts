import { DataProxy } from "@apollo/client";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import {
  updateExperiencesManualCacheUpdate,
  // StateValue,
} from "../apollo/update-experiences-manual-cache-update";
import {
  writeExperienceFragmentToCache,
  readExperienceFragment,
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
} from "../apollo/get-detailed-experience-query";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  getUnsyncedExperience,
  removeUnsyncedExperiences,
  writeUnsyncedExperience,
} from "../apollo/unsynced-ledger";
import { UnsyncedModifiedExperience } from "../utils/unsynced-ledger.types";
import { entryToEdge } from "../components/UpsertEntry/entry-to-edge";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { GetEntriesUnionFragment_GetEntriesSuccess_entries } from "../graphql/apollo-types/GetEntriesUnionFragment";
import { UpdateExperienceSomeSuccessFragment } from "../graphql/apollo-types/UpdateExperienceSomeSuccessFragment";
import { EntryConnectionFragment } from "../graphql/apollo-types/EntryConnectionFragment";

const mockWriteGetEntriesQuery = writeGetEntriesQuery as jest.Mock;

const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;
const mockRemoveUnsyncedExperience = removeUnsyncedExperiences as jest.Mock;
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;

const dataProxy = {} as DataProxy;

afterEach(() => {
  jest.resetAllMocks();
});

it("invalid result", () => {
  updateExperiencesManualCacheUpdate(dataProxy, {
    data: {},
  } as any);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();
});

it("ownFields success", () => {
  mockReadExperienceFragment.mockReturnValue({
    title: "a",
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    ownFields: {},
  });

  call({
    experience: {
      ownFields: {
        __typename: "ExperienceOwnFieldsSuccess",
        data: {
          title: "b",
        },
      },
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockRemoveUnsyncedExperience.mock.calls[0][0]).toEqual(["1"]);
  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    title: "b",
  });
});

it("ownFields failed", () => {
  mockReadExperienceFragment.mockReturnValue({
    title: "a",
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    ownFields: {
      title: "b",
    },
  });

  call({
    experience: {
      ownFields: {
        __typename: "UpdateExperienceOwnFieldsErrors",
      },
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockWriteUnsyncedExperience.mock.calls[0]).toEqual([
    "1",
    {
      ownFields: {
        title: "b",
      },
    },
  ]);

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    title: "a",
  });
});

it("data definitions success", () => {
  mockReadExperienceFragment.mockReturnValue({
    dataDefinitions: [
      {
        id: "a",
        name: "n",
      },
      {
        id: "b",
      },
    ],
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    definitions: {},
  } as UnsyncedModifiedExperience);

  call({
    experience: {
      updatedDefinitions: [
        {
          __typename: "DefinitionSuccess",
          definition: {
            id: "a",
            name: "n1",
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockRemoveUnsyncedExperience).toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    dataDefinitions: [
      {
        id: "a",
        name: "n1",
      },
      {
        id: "b",
      },
    ],
  });
});

it("data definitions failed", () => {
  mockReadExperienceFragment.mockReturnValue({
    dataDefinitions: [
      {
        id: "b",
      },
    ],
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    definitions: {},
  } as UnsyncedModifiedExperience);

  call({
    experience: {
      updatedDefinitions: [
        {
          __typename: "DefinitionErrors",
          errors: {
            id: "b",
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    definitions: {},
  });

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    dataDefinitions: [
      {
        id: "b",
      },
    ],
  });
});

it("new entries success", () => {
  mockReadExperienceFragment.mockReturnValueOnce({});

  mockGetEntriesQuerySuccess.mockReturnValueOnce({
    edges: [] as any,
  } as GetEntriesUnionFragment_GetEntriesSuccess_entries);

  call({
    entries: {
      newEntries: [
        {
          __typename: "CreateEntrySuccess",
          entry: {
            id: "a",
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockWriteGetEntriesQuery.mock.calls[0][1].entries).toEqual({
    edges: [
      entryToEdge({
        id: "a",
      } as EntryFragment),
    ],
  } as EntryConnectionFragment);
});

it("synced entries success", () => {
  mockReadExperienceFragment.mockReturnValue({} as ExperienceFragment);

  mockGetEntriesQuerySuccess.mockReturnValueOnce({
    edges: [
      {
        node: {
          id: "a",
        },
      },
    ],
  });

  mockGetUnsyncedExperience.mockReturnValue({
    newEntries: true,
    definitions: {},
  } as UnsyncedModifiedExperience);

  call({
    entries: {
      newEntries: [
        {
          __typename: "CreateEntrySuccess",
          entry: {
            id: "b", // changed from cached
            clientId: "a",
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    definitions: {},
  });

  expect(mockWriteGetEntriesQuery.mock.calls[0][1].entries).toEqual({
    edges: [
      {
        node: {
          id: "b",
          clientId: "a",
        },
      },
    ],
  } as EntryConnectionFragment);
});

it("synced entries failed", () => {
  mockReadExperienceFragment.mockReturnValue({} as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    newEntries: true,
  } as UnsyncedModifiedExperience);

  call({
    entries: {
      newEntries: [
        {
          __typename: "CreateEntryErrors",
          errors: {
            meta: {
              clientId: "c",
            },
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    newEntries: true,
  });

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual(
    {} as ExperienceFragment,
  );
});

it("updated entries success", () => {
  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [
      {
        node: {
          id: "a",
          dataObjects: [
            {
              id: "aa",
              data: "a",
            },
            {
              id: "ab",
            },
          ],
        },
      },
      {
        node: {
          id: "b",
        },
      },
    ],
  } as GetEntriesUnionFragment_GetEntriesSuccess_entries);

  mockGetUnsyncedExperience.mockReturnValue({
    modifiedEntries: {
      a: {
        aa: true,
      },
    },
  } as UnsyncedModifiedExperience);

  mockReadExperienceFragment.mockReturnValueOnce({});

  call({
    entries: {
      updatedEntries: [
        {
          __typename: "UpdateEntrySomeSuccess",
          entry: {
            entryId: "a",
            dataObjects: [
              {
                __typename: "DataObjectSuccess",
                dataObject: {
                  id: "aa",
                  data: "b", // changed from cached
                },
              },
            ],
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockRemoveUnsyncedExperience).toHaveBeenCalled();

  expect(mockWriteGetEntriesQuery.mock.calls[0][1].entries).toEqual({
    edges: [
      {
        node: {
          id: "a",
          dataObjects: [
            {
              id: "aa",
              data: "b",
            },
            {
              id: "ab",
            },
          ],
        },
      },
      {
        node: {
          id: "b",
        },
      },
    ],
  } as GetEntriesUnionFragment_GetEntriesSuccess_entries);
});

test("updated entries errors", () => {
  mockReadExperienceFragment.mockReturnValue({} as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    modifiedEntries: {
      a: {
        aa: true,
      },
    },
  } as UnsyncedModifiedExperience);

  call({
    entries: {
      updatedEntries: [
        {
          __typename: "UpdateEntryErrors",
          errors: {
            entryId: "a",
          },
        },
      ],
    },
  } as UpdateExperienceSomeSuccessFragment);

  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    modifiedEntries: {
      a: {
        aa: true,
      },
    },
  });

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual(
    {} as ExperienceFragment,
  );
});

function call({ experience, entries }: UpdateExperienceSomeSuccessFragment) {
  updateExperiencesManualCacheUpdate(dataProxy, {
    data: {
      updateExperiences: {
        __typename: "UpdateExperiencesSomeSuccess",
        experiences: [
          {
            __typename: "UpdateExperienceSomeSuccess",
            experience: {
              experienceId: "1",
              ...experience,
            },
            entries,
          },
        ],
      },
    },
  } as UpdateExperiencesOnlineMutationResult);
}
