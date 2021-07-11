/* istanbul ignore file */
import { EntryConnectionFragment } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { fireEvent } from "@testing-library/react";
import { GenericGeneralEffect, GenericHasEffect } from "./utils/effects";

export function fillField(element: Element, value: string) {
  fireEvent.change(element, {
    target: { value },
  });
}

export function getById<T extends HTMLElement = HTMLElement>(domId: string) {
  return document.getElementById(domId) as T;
}

export function getAllByClass(className: string) {
  return document.getElementsByClassName(className);
}

export function getOneByClass(className: string, index = 0) {
  return document.getElementsByClassName(className).item(index) as HTMLElement;
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
} as ExperienceDCFragment;

export const defaultGetEntriesQuery = {
  edges: [] as any,
} as EntryConnectionFragment;

export function getEffects<E, S extends GenericGeneralEffect<E>>(state: S) {
  return (state.effects.general as GenericHasEffect<E>).hasEffects.context
    .effects;
}
