/* istanbul ignore file */
import { useContext } from "react";
import { WithSubscriptionContext } from "../../../cra/src/utils/react-app-context";

export function useWithSubscriptionContext() {
  return useContext(WithSubscriptionContext);
}

export type UseWithSubscriptionContextInjectType = {
  useWithSubscriptionContextInject: typeof useWithSubscriptionContext;
};
