/* istanbul ignore file */
import { WithSubscriptionContext } from "../../utils/app-context";
export { useOnExperiencesDeletedSubscription } from "../../utils/experience.gql.types";

export const WithSubscriptionProvider = WithSubscriptionContext.Provider;

export function cleanupWithSubscriptions(func: () => void) {
  func();
}
