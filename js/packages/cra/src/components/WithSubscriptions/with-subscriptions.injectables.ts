/* istanbul ignore file */
import {
  WithSubscriptionContext,
  WithSubscriptionsDispatchContext,
} from "../../utils/app-context";
export { subscribeToGraphqlEvents } from "@eb/shared/src/apollo/experience.gql.types";

export const WithSubscriptionProvider = WithSubscriptionContext.Provider;
export const WithSubscriptionsDispatchProvider =
  WithSubscriptionsDispatchContext.Provider;

export function cleanupWithSubscriptions(func: () => void) {
  func();
}
