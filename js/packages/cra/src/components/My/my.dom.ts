export const MY_TITLE = "Experiences";
export const domPrefix = "my";

export const activateInsertExperienceDomId = `${domPrefix}-activate-insert-experience`;
export const fetchExperiencesErrorsDomId = `${domPrefix}-fetch-experiences-errors`;
export const noExperiencesActivateNewDomId = `${domPrefix}-no-experiences-activate-new`;
export const experiencesDomId = `${domPrefix}-experiences`;
export const searchInputDomId = `${domPrefix}-search-input`;
export const fetchErrorRetryDomId = `${domPrefix}-fetch-error-retry`;

export const isOfflineClassName = "experience--is-danger";
export const isPartOfflineClassName = "experience--is-warning";
export const descriptionTextSelector = "js-${domPrefix}-description-text";
export const descriptionHideSelector = "js-${domPrefix}-description-hide";
export const descriptionShowSelector = "js-${domPrefix}-description-show";
export const descriptionShowHideSelector =
  "js-${domPrefix}-description-show-hide";
export const descriptionContainerSelector =
  "js-${domPrefix}-description-container";
export const dropdownTriggerSelector = `js-${domPrefix}-experience-menu-trigger`;
export const dropdownMenuMenuSelector = `js-${domPrefix}-dropdown-menu-menu`;
export const onDeleteExperienceSuccessNotificationId = `js-${domPrefix}-on-delete-experience-success-notification`;
export const onDeleteExperienceCancelledNotificationId = `js-${domPrefix}-on-delete-experience-cancelled-notification`;
export const updateExperienceMenuItemSelector = `js-${domPrefix}-update-experience-menu-item`;
export const updateExperienceSuccessNotificationSelector = `js-${domPrefix}-update-experience-success-notification-close`;
export const experienceContainerSelector = `js-${domPrefix}-experience`;
export const noTriggerDocumentEventClassName = `js-${domPrefix}-no-trigger-document`;
export const searchLinkSelector = `js-${domPrefix}-search-link`;
export const noSearchResultSelector = `js-${domPrefix}-no-search-result`;
export const fetchNextSelector = `js-${domPrefix}-fetch-next`;

export function makeScrollToDomId(id: string) {
  return `${id}-${domPrefix}-scroll-to`;
}
