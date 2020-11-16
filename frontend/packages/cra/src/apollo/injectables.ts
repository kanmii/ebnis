/* istanbul ignore file */
import { useContext } from "react";
import { WithSubscriptionContext } from "../utils/app-context";

export function useWithSubscriptionContext() {
  return useContext(WithSubscriptionContext);
}
