/* istanbul ignore file */
import { fireEvent } from "@testing-library/react";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { EntryConnectionFragment } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";

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
} as ExperienceCompleteFragment;

export const defaultGetEntriesQuery = {
  edges: [] as any,
} as EntryConnectionFragment;
