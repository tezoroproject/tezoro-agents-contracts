import { useEffect, useMemo } from "react";
import { useAggregatedTokensStore } from "../state";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import BigNumber from "bignumber.js";

export function useTokensInChain() {
  const { aggregatedTokens } = useAggregatedTokensStore();
  const { chain, address: accountAddress } = useAccount();

  const tokensInChain = useMemo(() => {
    return aggregatedTokens
      ?.map((aggregatedToken) => {
        const tokenInChain = aggregatedToken?.chains.find(
          (c) => c.chainId === chain?.id
        );

        if (!tokenInChain) return null;

        return {
          ...tokenInChain,
          symbol: aggregatedToken.symbol,
        };
      })
      .filter((token) => token !== null);
  }, [aggregatedTokens, chain?.id]);

  const tokenBalancesCalls = useMemo(() => {
    if (!accountAddress || !tokensInChain) return [];

    return tokensInChain.map(
      ({ address }) =>
        ({
          address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [accountAddress],
        } as const)
    );
  }, [accountAddress, tokensInChain]);

  const { data: tokensBalances, refetch } = useReadContracts({
    contracts: tokenBalancesCalls,
    allowFailure: false,
  });

  const tokensInChainWithBalances = useMemo(() => {
    if (!tokensInChain) return undefined;

    return tokensInChain
      .map((tokenInChain, index) => {
        const tokenBalance = tokensBalances?.[index];
        if (tokenBalance == undefined) return null;

        const normalizedBalance = new BigNumber(
          tokenBalance.toString()
        ).dividedBy(10 ** tokenInChain.decimals);

        return {
          ...tokenInChain,
          balance: {
            raw: tokenBalance,
            normalized: normalizedBalance,
          },
        };
      })
      .filter((t) => t !== null);
  }, [tokensInChain, tokensBalances]);

  useEffect(() => {
    if (accountAddress && tokenBalancesCalls.length > 0) {
      refetch();
    }
  }, [accountAddress, tokenBalancesCalls, refetch]);

  return {
    tokens: tokensInChainWithBalances,
    refetch,
  };
}
