import { useEffect } from "react";
import { useActiveAllocation } from "./useActiveAllocation";
import { useTezoro } from "./useTezoro";
import { useToast } from "./useToast";
import { useActiveAgent } from "./useActiveAgent";

export function useCleanUnreachableTokens() {
  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();
  const { tokensInChain } = useTezoro();
  const activeAgent = useActiveAgent();
  const { addToast } = useToast();

  useEffect(() => {
    if (activeAgent) return; // Don't clean tokens if the deployment is already confirmed.
    if (!tokensInChain?.length || !activeAllocation) return;

    const tokensToRemove = activeAllocation.tokens.filter(
      (token) => !tokensInChain.some((t) => t.symbol === token.symbol)
    );

    if (tokensToRemove.length) {
      updateActiveAllocation((draft) => {
        draft.tokens = draft.tokens.filter(
          (token) => !tokensToRemove.some((t) => t.symbol === token.symbol)
        );
      });
      addToast(
        `Tokens ${tokensToRemove
          .map((token) => token.symbol)
          .join(
            ", "
          )} have been removed from the deployment because they are not available in the current chain.`,
        "info"
      );
    }
  }, [
    activeAgent,
    activeAllocation,
    addToast,
    tokensInChain,
    updateActiveAllocation,
  ]);
}
