/* istanbul ignore file */
import { WithEmitterContext } from "../../utils/app-context";

export const WithEmitterProvider = WithEmitterContext.Provider;

export function cleanupObservableSubscription(
  subscription: ZenObservable.Subscription,
) {
  subscription.unsubscribe();
}
