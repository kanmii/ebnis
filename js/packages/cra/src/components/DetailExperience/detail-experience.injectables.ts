/* istanbul ignore file */
export {
  useDeleteExperiencesMutation,
  useUpdateExperiencesOnlineMutation,
} from "../../utils/experience.gql.types";

// istanbul ignore next:
export function scrollDocumentToTop() {
  document.documentElement.scrollTop = 0;
}
