import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";

export const domPrefix = "upsert-experience-component";

export const scrollIntoViewDomId = `${domPrefix}-scroll-into-view`;
export const titleInputDomId = `${domPrefix}-title-input`;
export const commentInputDomId = `${domPrefix}-comment-input`;
export const descriptionInputDomId = `${domPrefix}-description-input`;
export const definitionNameInputDomId = `${domPrefix}-definition-name-input`;
export const definitionTypeInputDomId = `${domPrefix}-definition-type-input`;
export const submitDomId = `${domPrefix}-submit`;
export const resetDomId = `${domPrefix}-reset`;
export const notificationCloseId = `${domPrefix}-notification-close`;
export const notificationElementSelector = `js-${domPrefix}-notification`;
export const addDefinitionSelector = "js-add-definition";
export const removeDefinitionSelector = "js-remove-definition";
export const moveUpDefinitionSelector = "js-move-up-definition";
export const moveDownDefinitionSelector = "js-move-down-definition";
export const definitionNameFormControlSelector = `${domPrefix}-def-name-form-control`;
export const definitionTypeFormControlSelector = `${domPrefix}-def-type-form-control`;
export const fieldErrorSelector = `${domPrefix}-field-error`;
export const fieldSelector = `${domPrefix}-field`;
export const disposeComponentDomId = `${domPrefix}-dispose`;
export const hiddenSelector = `js-${domPrefix}-hidden`;
export const descriptionToggleSelector = `js-${domPrefix}-description-toggle`;
export const descriptionHideSelector = `js-${domPrefix}-description-hide`;
export const descriptionShowSelector = `js-${domPrefix}-description-show`;
export const fieldErrorIndicatorSelector = `js-${domPrefix}-field-error-indicator`;

export function makeDefinitionTypeOptionDomId(type: DataTypes) {
  return `${domPrefix}-${type}`;
}

export const definitionContainerDomSelector = `js-${domPrefix}-definition-container`;
