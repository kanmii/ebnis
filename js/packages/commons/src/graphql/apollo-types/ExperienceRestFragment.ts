/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes } from "./globalTypes";

// ====================================================
// GraphQL fragment: ExperienceRestFragment
// ====================================================

export interface ExperienceRestFragment_dataDefinitions {
  __typename: "DataDefinition";
  id: string;
  /**
   * Name of field e.g start, end, meal
   */
  name: string;
  /**
   * The data type
   */
  type: DataTypes;
  /**
   * String that uniquely identifies this data definition has been
   * created offline. If an associated entry is also created
   * offline, then `dataDefinition.definitionId` **MUST BE** the same as this
   * field and will be validated as such.
   */
  clientId: string | null;
}

export interface ExperienceRestFragment_comments {
  __typename: "Comment";
  id: string;
  text: string;
}

export interface ExperienceRestFragment {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: ExperienceRestFragment_dataDefinitions[];
  /**
   * The list of comments belonging to an experience
   */
  comments: (ExperienceRestFragment_comments | null)[] | null;
}
