import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TezoroContext } from "../contexts/TezoroContext";
import { useAccount, useReadContracts } from "wagmi";
import { chains, config } from "../blockchain/config";
import { erc20Abi, type Address } from "viem";
import { useAggregatedTokensStore } from "../state";
import BigNumber from "bignumber.js";
import { ChainMarkets, getMarkets } from "../clients/tezoro-backend";
import { useUserAgentsQuery } from "../hooks/data/useUserAgentsQuery";

export function TezoroProvider({ children }: PropsWithChildren) {
  const [marketsData, setMarketsData] = useState<ChainMarkets[]>();
  const { chain, address: accountAddress } = useAccount({ config });
  const { aggregatedTokens } = useAggregatedTokensStore();

  const currentChainInfo = chain ? chains[chain.id] : null;

  useEffect(() => {
    getMarkets().then(setMarketsData);
  }, []);

  const chainMarkets = useMemo(() => {
    if (!marketsData || !currentChainInfo) return undefined;
    const marketsInChain = marketsData.find(
      (market) =>
        market.chainId ===
        (currentChainInfo.internalChainId ?? currentChainInfo.chain.id)
    );
    return marketsInChain?.markets;
  }, [currentChainInfo, marketsData]);

  const {
    data: userAgentsData,
    refetch: refetchAgents,
    isFetched,
  } = useUserAgentsQuery(accountAddress);

  const agents = useMemo(() => {
    if (userAgentsData === undefined) {
      return undefined;
    }
    return userAgentsData
      .map((agent) => ({
        address: agent.id,
        isDisabled: agent.disabledAt !== null,
        adapters: agent.adapters,
        deploymentTimestamp: agent.createdAt,
      }))
      .sort((a, b) => {
        return (
          Number.parseInt(a.deploymentTimestamp) -
          Number.parseInt(b.deploymentTimestamp)
        );
      });
  }, [userAgentsData]);

  const handleRefetchAgents = useCallback(
    async (cb?: (agents: Address[] | undefined) => void) => {
      try {
        const { data } = await refetchAgents();
        const agentsList = data?.map((agent) => agent.id);

        if (agentsList) {
          cb?.(agentsList);
        } else {
          console.warn("No agents data returned from refetchAgents");
          cb?.(undefined);
        }
      } catch (error) {
        console.error("Error refetching agents:", error);
        cb?.(undefined);
      }
    },
    [refetchAgents]
  );

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

  const { data: tokensBalances, refetch: refetchTokensBalances } =
    useReadContracts({
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
      refetchTokensBalances();
    }
  }, [accountAddress, tokenBalancesCalls, refetchTokensBalances]);

  const memoizedValue = useMemo(
    () => ({
      isAgentsFetched: isFetched,
      agents,
      refetchAgents: handleRefetchAgents,
      refetchTokensBalances,
      tokensInChain: tokensInChainWithBalances,
      chainMarkets,
    }),
    [
      isFetched,
      agents,
      handleRefetchAgents,
      refetchTokensBalances,
      tokensInChainWithBalances,
      chainMarkets,
    ]
  );

  return (
    <TezoroContext.Provider value={memoizedValue}>
      {children}
    </TezoroContext.Provider>
  );
}
