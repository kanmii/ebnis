/* istanbul ignore file */
import { useContext } from "react";
import { WithSubscriptionContext } from "../../../cra/src/utils/app-context";

export function useWithSubscriptionContext() {
  return useContext(WithSubscriptionContext);
}
