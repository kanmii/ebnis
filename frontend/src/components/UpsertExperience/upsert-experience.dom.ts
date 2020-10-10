import { DataTypes } from "../../graphql/apollo-types/globalTypes";

export const domPrefix = "experience-definition";

export const scrollIntoViewDomId = `${domPrefix}-scroll-into-view`;
export const titleInputDomId = `${domPrefix}-title-input`;
export const descriptionInputDomId = `${domPrefix}-description-input`;
export const definitionNameInputDomId = `${domPrefix}-definition-name-input`;
export const definitionTypeInputDomId = `${domPrefix}-definition-type-input`;
export const submitDomId = `${domPrefix}-submit`;
export const resetDomId = `${domPrefix}-reset`;
export const notificationCloseId = `${domPrefix}-notification-close`;
export const addDefinitionSelector = "js-add-definition";
export const removeDefinitionSelector = "js-remove-definition";
export const moveUpDefinitionSelector = "js-move-up-definition";
export const moveDownDefinitionSelector = "js-move-down-definition";
export const definitionNameFormControlSelector = `${domPrefix}-def-name-form-control`;
export const definitionTypeFormControlSelector = `${domPrefix}-def-type-form-control`;
export const fieldErrorSelector = `${domPrefix}-field-error`;
export const disposeComponentDomId = `${domPrefix}-dispose`;

export function makeDefinitionTypeOptionDomId(type: DataTypes) {
  return `${domPrefix}-${type}`;
}

export const definitionContainerDomSelector = `js-${domPrefix}-definition-container`;

type Id = string | number;
