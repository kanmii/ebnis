/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DataTypes } from "./globalTypes";

// ====================================================
// GraphQL fragment: PreFetchExperienceFragment
// ====================================================

export interface PreFetchExperienceFragment_edges_node_dataDefinitions {
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

export interface PreFetchExperienceFragment_edges_node {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  /**
   * The field definitions used for the experience entries
   */
  dataDefinitions: PreFetchExperienceFragment_edges_node_dataDefinitions[];
}

export interface PreFetchExperienceFragment_edges {
  __typename: "ExperienceEdge";
  cursor: string | null;
  node: PreFetchExperienceFragment_edges_node | null;
}

export interface PreFetchExperienceFragment {
  __typename: "ExperienceConnection";
  edges: (PreFetchExperienceFragment_edges | null)[] | null;
}
