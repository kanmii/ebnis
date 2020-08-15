/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes } from "./globalTypes";

// ====================================================
// GraphQL fragment: ExperienceNoEntryFragment
// ====================================================

export interface ExperienceNoEntryFragment_dataDefinitions {
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

export interface ExperienceNoEntryFragment {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  title: string;
  /**
   * The description of the experience
   */
  description: string | null;
  /**
   * The client ID. For experiences created on the client while server is
   * offline and to be saved , the client ID uniquely identifies such and can
   * be used to enforce uniqueness at the DB level. Not providing client_id
   * assumes a fresh experience.
   */
  clientId: string | null;
  insertedAt: any;
  updatedAt: any;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: ExperienceNoEntryFragment_dataDefinitions[];
}
