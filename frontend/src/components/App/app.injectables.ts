/* istanbul ignore file */
import { EbnisAppContext, WithEmitterContext } from "../../utils/app-context";

export const EbnisAppProvider = EbnisAppContext.Provider;
export const WithEmitterProvider = WithEmitterContext.Provider;

export function cleanupObservableSubscription(
  subscription: ZenObservable.Subscription
) {
  subscription.unsubscribe();
}
