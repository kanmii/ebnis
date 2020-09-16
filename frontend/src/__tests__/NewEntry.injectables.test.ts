/* eslint-disable @typescript-eslint/no-explicit-any */
import { upsertNewEntry } from "../components/NewEntry/new-entry.injectables";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";
import {
  getEntriesQuerySuccess,
  readExperienceFragment,
  writeExperienceFragmentToCache,
} from "../apollo/get-detailed-experience-query";

jest.mock("../apollo/write-experience-fragment");
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/read-experience-fragment");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;

const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;

afterEach(() => {
  jest.resetAllMocks();
});

it("inserts with id/no onDone", () => {
  mockReadExperienceFragment.mockReturnValue({} as ExperienceFragment);
  mockGetEntriesQuerySuccess.mockReturnValue({});
  const entry = {} as any;

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache).not.toHaveBeenCalled();

  upsertNewEntry("1", entry);

  expect(mockWriteExperienceFragmentToCache).toHaveBeenCalled();

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery.mock.calls[0][0]
      .entries.edges,
  ).toEqual([entryToEdge(entry)]);
});

it("inserts with experience/onDone", () => {
  const experience = {
    id: "1",
  } as ExperienceFragment;

  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [
      {
        node: {
          id: "x",
        },
      },
      {
        node: {
          id: "1",
        },
      },
    ],
  });

  const entry = {
    id: "1",
    __typename: "Entry",
  } as any;

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache).not.toHaveBeenCalled();

  const mockOnDone = jest.fn();

  upsertNewEntry(experience.id, entry, mockOnDone);

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).toHaveBeenCalled();

  expect(
    mockWriteExperienceFragmentToCache.mock.calls[0][0].entries.edges,
  ).toEqual([
    {
      node: {
        id: "x",
      },
    },
    {
      node: {
        id: "1",
        __typename: "Entry",
      },
    },
  ]);

  expect(mockOnDone).toHaveBeenCalled();
});
