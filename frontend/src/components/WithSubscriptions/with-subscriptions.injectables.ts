/* istanbul ignore file */
import { WithEmitterContext } from "../../utils/app-context";
export { useOnExperiencesDeletedSubscription } from "../../utils/experience.gql.types";

export const WithEmitterProvider = WithEmitterContext.Provider;

export function cleanupObservableSubscription(
  subscription: ZenObservable.Subscription,
) {
  subscription.unsubscribe();
}
