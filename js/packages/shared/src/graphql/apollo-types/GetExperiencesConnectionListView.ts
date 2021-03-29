/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetExperiencesConnectionListView
// ====================================================

export interface GetExperiencesConnectionListView_getExperiences_pageInfo {
  __typename: "PageInfo";
  /**
   * When paginating forwards, are there more items?
   */
  hasNextPage: boolean;
  /**
   * When paginating backwards, are there more items?
   */
  hasPreviousPage: boolean;
  /**
   * When paginating backwards, the cursor to continue.
   */
  startCursor: string | null;
  /**
   * When paginating forwards, the cursor to continue.
   */
  endCursor: string | null;
}

export interface GetExperiencesConnectionListView_getExperiences_edges_node {
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

export interface GetExperiencesConnectionListView_getExperiences_edges {
  __typename: "ExperienceEdge";
  cursor: string | null;
  node: GetExperiencesConnectionListView_getExperiences_edges_node | null;
}

export interface GetExperiencesConnectionListView_getExperiences {
  __typename: "ExperienceConnection";
  pageInfo: GetExperiencesConnectionListView_getExperiences_pageInfo;
  edges:
    | (GetExperiencesConnectionListView_getExperiences_edges | null)[]
    | null;
}

export interface GetExperiencesConnectionListView {
  /**
   * Get all experiences belonging to a user.
   * The experiences returned may be paginated
   * and may be filtered by IDs
   */
  getExperiences: GetExperiencesConnectionListView_getExperiences | null;
}

export interface GetExperiencesConnectionListViewVariables {
  after?: string | null;
  before?: string | null;
  first?: number | null;
  last?: number | null;
  ids?: (string | null)[] | null;
}
