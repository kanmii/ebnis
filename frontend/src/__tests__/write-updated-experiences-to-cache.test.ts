import { DataProxy } from "apollo-cache";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import {
  writeUpdatedExperienceToCache,
  // StateValue,
} from "../apollo/write-updated-experiences-to-cache";
import { E2EWindowObject } from "../utils/types";
import { readExperienceFragment } from "../apollo/read-experience-fragment";
import { writeExperienceFragmentToCache } from "../apollo/write-experience-fragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  getUnsyncedExperience,
  removeUnsyncedExperience,
  writeUnsyncedExperience,
} from "../apollo/unsynced-ledger";
import { UpdateExperienceFragment } from "../graphql/apollo-types/UpdateExperienceFragment";
import { UnsyncedModifiedExperience } from "../utils/unsynced-ledger.types";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";

jest.mock("../apollo/unsynced-ledger");
const mockGetUnsyncedExperience = getUnsyncedExperience as jest.Mock;
const mockRemoveUnsyncedExperience = removeUnsyncedExperience as jest.Mock;
const mockWriteUnsyncedExperience = writeUnsyncedExperience as jest.Mock;

jest.mock("../apollo/write-experience-fragment");
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;

jest.mock("../apollo/read-experience-fragment");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;

const app = {} as E2EWindowObject;
const dataProxy = {} as DataProxy;

beforeEach(() => {
  window.____ebnis = app;
});

afterEach(() => {
  delete window.____ebnis;
  jest.resetAllMocks();
});

test("invalid result", () => {
  writeUpdatedExperienceToCache()(dataProxy, {
    data: {},
  } as any);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience).not.toHaveBeenCalled();
});

test("ownFields success", () => {
  mockReadExperienceFragment.mockReturnValue({
    title: "a",
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    ownFields: {},
  });

  call({
    ownFields: {
      __typename: "ExperienceOwnFieldsSuccess",
      data: {
        title: "b",
      },
    },
  } as UpdateExperienceFragment);

  expect(mockRemoveUnsyncedExperience.mock.calls[0][0]).toBe("1");
  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    title: "b",
  });
});

test("ownFields failed", () => {
  mockReadExperienceFragment.mockReturnValue({
    title: "a",
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    ownFields: {
      title: "b",
    },
  });

  call({
    ownFields: {
      __typename: "UpdateExperienceOwnFieldsErrors",
    },
  } as UpdateExperienceFragment);

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

test("data definitions success", () => {
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
    updatedDefinitions: [
      {
        __typename: "DefinitionSuccess",
        definition: {
          id: "a",
          name: "n1",
        },
      },
    ],
  } as UpdateExperienceFragment);

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

test("data definitions failed", () => {
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
    updatedDefinitions: [
      {
        __typename: "DefinitionErrors",
      },
    ],
  } as UpdateExperienceFragment);

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

test("new entries success", () => {
  mockReadExperienceFragment.mockReturnValue({
    entries: {
      edges: [] as any,
    },
  } as ExperienceFragment);

  call({
    newEntries: [
      {
        __typename: "CreateEntrySuccess",
        entry: {
          id: "a",
        },
      },
    ],
  } as UpdateExperienceFragment);

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    entries: {
      edges: [
        entryToEdge({
          id: "a",
        } as EntryFragment),
      ],
    },
  } as ExperienceFragment);
});

it("synced entries success", () => {
  mockReadExperienceFragment.mockReturnValue({
    entries: {
      edges: [
        {
          node: {
            id: "a",
          },
        },
      ],
    },
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    newEntries: true,
    definitions: {},
  } as UnsyncedModifiedExperience);

  call({
    newEntries: [
      {
        __typename: "CreateEntrySuccess",
        entry: {
          id: "b", // changed from cached
          clientId: "a",
        },
      },
    ],
  } as UpdateExperienceFragment);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    definitions: {},
  });

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    entries: {
      edges: [
        {
          node: {
            id: "b",
            clientId: "a",
          },
        },
      ],
    },
  } as ExperienceFragment);
});

test("synced entries failed", () => {
  mockReadExperienceFragment.mockReturnValue({} as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    newEntries: true,
  } as UnsyncedModifiedExperience);

  call({
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
  } as UpdateExperienceFragment);

  expect(mockRemoveUnsyncedExperience).not.toHaveBeenCalled();
  expect(mockWriteUnsyncedExperience.mock.calls[0][1]).toEqual({
    newEntries: true,
  });

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual(
    {} as ExperienceFragment,
  );
});

test("updated entries success", () => {
  mockReadExperienceFragment.mockReturnValue({
    entries: {
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
    },
  } as ExperienceFragment);

  mockGetUnsyncedExperience.mockReturnValue({
    modifiedEntries: {
      a: {
        aa: true,
      },
    },
  } as UnsyncedModifiedExperience);

  call({
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
  } as UpdateExperienceFragment);

  expect(mockRemoveUnsyncedExperience).toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache.mock.calls[0][0]).toEqual({
    entries: {
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
    },
  } as ExperienceFragment);
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
    updatedEntries: [
      {
        __typename: "UpdateEntryErrors",
      },
    ],
  } as UpdateExperienceFragment);

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

function call(data: UpdateExperienceFragment) {
  writeUpdatedExperienceToCache()(dataProxy, {
    data: {
      updateExperiences: {
        __typename: "UpdateExperiencesSomeSuccess",
        experiences: [
          {
            __typename: "UpdateExperienceSomeSuccess",
            experience: {
              experienceId: "1",
              ...data,
            },
          },
        ],
      },
    },
  } as UpdateExperiencesOnlineMutationResult);
}
