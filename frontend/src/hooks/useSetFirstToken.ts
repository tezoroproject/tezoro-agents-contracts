import { useEffect } from "react";
import { useAggregatedTokensStore } from "../state";
import { useActiveAllocation } from "./useActiveAllocation";
import { useTezoro } from "./useTezoro";
import { INITIAL_SUPPLY_ASSET_SYMBOL, MAX_AMOUNT_DECIMALS } from "../constants";
import BigNumber from "bignumber.js";

export function useSetFirstToken() {
  const { aggregatedTokens } = useAggregatedTokensStore();
  const { tokensInChain } = useTezoro();
  const { updateActiveAllocation: updateActiveDeployment } =
    useActiveAllocation();

  useEffect(() => {
    const initialTokenInChain = tokensInChain?.find(
      (token) =>
        token.symbol.toLowerCase() === INITIAL_SUPPLY_ASSET_SYMBOL.toLowerCase()
    );
    const initialAggregatedToken = aggregatedTokens?.find(
      (token) =>
        token.symbol.toLowerCase() === INITIAL_SUPPLY_ASSET_SYMBOL.toLowerCase()
    );
    const initialToken = initialTokenInChain ?? initialAggregatedToken;

    if (!initialToken) return;

    updateActiveDeployment((draft) => {
      if (draft.tokens.length > 0) return;

      const amount =
        "balance" in initialToken
          ? initialToken.balance.normalized
              .dp(MAX_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
              .toString()
          : "0";
      console.info("Set first token:", { symbol: initialToken.symbol, amount });

      draft.tokens.push({
        symbol: initialToken.symbol,
        allocation: {
          amount: amount,
        },
      });
    });
  }, [aggregatedTokens, tokensInChain, updateActiveDeployment]);
}
