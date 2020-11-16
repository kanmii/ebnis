/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL subscription operation: OnExperiencesDeletedSubscription
// ====================================================

export interface OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences {
  __typename: "Experience";
  /**
   * The title of the experience
   */
  id: string;
  title: string;
}

export interface OnExperiencesDeletedSubscription_onExperiencesDeleted {
  __typename: "OnExperiencesDeleted";
  experiences: (OnExperiencesDeletedSubscription_onExperiencesDeleted_experiences | null)[];
  clientSession: string;
  clientToken: string;
}

export interface OnExperiencesDeletedSubscription {
  /**
   * Experiences Deleted
   */
  onExperiencesDeleted: OnExperiencesDeletedSubscription_onExperiencesDeleted | null;
}

export interface OnExperiencesDeletedSubscriptionVariables {
  clientSession: string;
}
