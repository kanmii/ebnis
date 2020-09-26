/* eslint-disable @typescript-eslint/no-explicit-any */
import { upsertNewEntry } from "../components/NewEntry/new-entry.injectables";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";
import {
  getEntriesQuerySuccess,
  writeGetEntriesQuery,
} from "../apollo/get-detailed-experience-query";

jest.mock("../apollo/get-detailed-experience-query");
const mockGetEntriesQuerySuccess = getEntriesQuerySuccess as jest.Mock;
const mockWriteGetEntriesQuery = writeGetEntriesQuery as jest.Mock;

jest.mock("../apollo/update-get-experiences-mini-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

afterEach(() => {
  jest.resetAllMocks();
});

const experience = {
  id: "1",
} as ExperienceFragment;

const erfahrungId = experience.id;

it("inserts with id/no onDone", () => {
  mockGetEntriesQuerySuccess.mockReturnValue({
    edges: [],
  });
  const entry = {} as any;

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
  ).not.toHaveBeenCalled();

  expect(mockWriteGetEntriesQuery).not.toHaveBeenCalled();

  upsertNewEntry(experience, entry);

  expect(mockWriteGetEntriesQuery.mock.calls[0][0]).toEqual(erfahrungId);
  expect(
    mockWriteGetEntriesQuery.mock.calls[0][1].entries.edges[0].node,
  ).toEqual(entry);

  expect(
    mockFloatExperienceToTheTopInGetExperiencesMiniQuery.mock.calls[0][0].id,
  ).toBe(erfahrungId);
});

it("inserts with experience/onDone", () => {
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

  const mockOnDone = jest.fn();

  upsertNewEntry(experience, entry, mockOnDone);

  expect(mockWriteGetEntriesQuery.mock.calls[0][1].entries.edges).toEqual([
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
