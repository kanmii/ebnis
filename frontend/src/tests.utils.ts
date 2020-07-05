/* istanbul ignore file */
import { fireEvent } from "@testing-library/react";
import { DataTypes } from "./graphql/apollo-types/globalTypes";
import { ExperienceFragment } from "./graphql/apollo-types/ExperienceFragment";

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
  entries: {
    edges: [] as any,
  },
} as ExperienceFragment;

