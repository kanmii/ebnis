/* eslint-disable @typescript-eslint/no-explicit-any */
import { upsertExperienceWithEntry } from "../components/NewEntry/new-entry.injectables";
import { readExperienceFragment } from "../apollo/read-experience-fragment";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { writeExperienceFragmentToCache } from "../apollo/write-experience-fragment";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import { entryToEdge } from "../components/NewEntry/entry-to-edge";

jest.mock("../apollo/write-experience-fragment");
const mockWriteExperienceFragmentToCache = writeExperienceFragmentToCache as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

jest.mock("../apollo/read-experience-fragment");
const mockReadExperienceFragment = readExperienceFragment as jest.Mock;

afterEach(() => {
  jest.resetAllMocks();
});

it("inserts with id/no onDone", () => {
  mockReadExperienceFragment.mockReturnValue({
    entries: {},
  } as ExperienceFragment);
  const entry = {} as any;

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache).not.toHaveBeenCalled();

  upsertExperienceWithEntry(entry, "1");

  expect(mockWriteExperienceFragmentToCache).toHaveBeenCalled();

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery.mock.calls[0][0]
      .entries.edges,
  ).toEqual([entryToEdge(entry)]);
});

it("inserts with experience/onDone", () => {
  const experience = {
    entries: {
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
    },
  } as ExperienceFragment;
  const entry = {
    id: "1",
    __typename: "Entry",
  } as any;

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteExperienceFragmentToCache).not.toHaveBeenCalled();

  const mockOnDone = jest.fn();

  upsertExperienceWithEntry(entry, experience, mockOnDone);

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
