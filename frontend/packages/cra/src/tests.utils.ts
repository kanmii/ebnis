/* istanbul ignore file */
import { fireEvent } from "@testing-library/react";
import { DataTypes } from "@ebnis/commons/src/graphql/apollo-types/globalTypes";
import { ExperienceFragment } from "@ebnis/commons/src/graphql/apollo-types/ExperienceFragment";
import { GetEntries_getEntries_GetEntriesSuccess_entries } from "@ebnis/commons/src/graphql/apollo-types/GetEntries";

export function fillField(element: Element, value: string) {
  fireEvent.change(element, {
    target: { value },
  });
}

export const defaultExperience = {
  id: "1",
  dataDefinitions: [
    {
      id: "1",
      name: "aa",
      type: DataTypes.INTEGER,
    },
  ],
} as ExperienceFragment;

export const defaultGetEntriesQuery = {
  edges: [] as any,
} as GetEntries_getEntries_GetEntriesSuccess_entries;
