/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getCachedEntriesDetailViewSuccess,
  writeCachedEntriesDetailView,
} from "@eb/shared/src/apollo/get-detailed-experience-query";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "@eb/shared/src/apollo/update-get-experiences-list-view-query";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { upsertNewEntry } from "../components/UpsertEntry/upsert-entry.injectables";

jest.mock("@eb/shared/src/apollo/get-detailed-experience-query");
const mockGetEntriesQuerySuccess =
  getCachedEntriesDetailViewSuccess as jest.Mock;
const mockWriteGetEntriesQuery = writeCachedEntriesDetailView as jest.Mock;

jest.mock("@eb/shared/src/apollo/update-get-experiences-list-view-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery =
  floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

afterEach(() => {
  jest.resetAllMocks();
});

const experience = {
  id: "1",
} as ExperienceCompleteFragment;

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
