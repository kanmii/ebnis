/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: ExperienceListViewEdgeFragment
// ====================================================

export interface ExperienceListViewEdgeFragment_node {
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
}

export interface ExperienceListViewEdgeFragment {
  __typename: "ExperienceEdge";
  cursor: string | null;
  node: ExperienceListViewEdgeFragment_node | null;
}
