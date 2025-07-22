import { useEffect } from "react";
import { useLocalStorageSelector } from "./useLocalStorageSelector";
import { v4 as uuidv4 } from "uuid";
import { useLocalStorage } from "./useLocalStorage";
import { useActiveAllocation } from "./useActiveAllocation";
import { useAccount } from "wagmi";
import { config } from "../blockchain/config";

export function useInitializeAllocation() {
  const isInitialized = useLocalStorageSelector(
    (state) => state?.isInitialized
  );
  const { updateLocalStorage } = useLocalStorage();
  const { chain } = useAccount({ config });

  const { activeAllocation } = useActiveAllocation();

  useEffect(() => {
    if (isInitialized && !activeAllocation) {
      console.log("Initializing default allocation");

      updateLocalStorage?.((draft) => {
        const allocationInChain = draft.allocations.find(
          (allocation) => allocation.chainId === chain?.id
        );
        if (!allocationInChain) {
          draft.allocations.push({
            id: uuidv4(),
            tokens: [],
          });
        }
      });
    }
  }, [activeAllocation, chain?.id, isInitialized, updateLocalStorage]);
}
