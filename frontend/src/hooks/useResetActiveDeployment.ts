import { useEffect } from "react";
import { useActiveAllocation } from "./useActiveAllocation";

export function useResetActiveDeployment() {
  const { activeAllocation, removeActiveAllocation } = useActiveAllocation();

  useEffect(() => {
    if (
      activeAllocation?.borrowing
        ? activeAllocation.borrowing.txConfirmedAt
        : activeAllocation?.distributionTxConfirmedAt
    ) {
      removeActiveAllocation();
    }
  }, [activeAllocation, removeActiveAllocation]);
}
