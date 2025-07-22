import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { Updater } from "use-immer";
import { Allocation } from "../schemas/localstorage-schema";
import { useLocalStorageSelector } from "./useLocalStorageSelector";
import { useAccount } from "wagmi";
import { config } from "../blockchain/config";
import { useActiveAgent } from "./useActiveAgent";

export function useActiveAllocation() {
  const { updateLocalStorage } = useLocalStorage();
  const allocations = useLocalStorageSelector((state) => state?.allocations);

  const { chain } = useAccount({ config });
  const activeAgent = useActiveAgent();
  const currentAllocation = useMemo(() => {
    const chainActiveAllocation = allocations?.find(
      (allocation) => allocation.chainId === chain?.id
    );

    const allocationWithoutChainId = allocations?.find(
      (allocation) => allocation.chainId === undefined
    );
    return chainActiveAllocation ?? allocationWithoutChainId;
  }, [chain, allocations]);

  const updateActiveAllocation: Updater<Allocation> = (updater) => {
    if (!currentAllocation) return;
    if (!updateLocalStorage) return;

    updateLocalStorage((draft) => {
      const active = draft.allocations.find(
        (d) => d.id === currentAllocation.id
      );
      if (!active) return;

      if (typeof updater === "function") {
        updater(active);
      } else {
        Object.assign(active, updater);
      }
    });
  };

  const isMutationAvailable = activeAgent === undefined;

  const removeActiveAllocation = () => {
    if (!updateLocalStorage) return;
    updateLocalStorage((draft) => {
      draft.allocations = draft.allocations.filter(
        (allocation) => allocation.id !== currentAllocation?.id
      );
    });
  };

  return {
    activeAllocation: currentAllocation,
    isMutationAvailable,
    updateActiveAllocation,
    removeActiveAllocation,
  };
}
