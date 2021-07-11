/* istanbul ignore file */
import {
  WithSubscriptionContext,
  WithSubscriptionsDispatchContext,
} from "../../utils/react-app-context";

export const WithSubscriptionProvider = WithSubscriptionContext.Provider;
export const WithSubscriptionsDispatchProvider =
  WithSubscriptionsDispatchContext.Provider;

export function cleanupWithSubscriptions(func: () => void) {
  func();
}
