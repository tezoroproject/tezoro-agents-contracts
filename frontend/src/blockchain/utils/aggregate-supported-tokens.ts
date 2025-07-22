import { Chain, availableChains } from "../config";
import { Address } from "viem";
import { ChainMarkets, getMarkets } from "../../clients/tezoro-backend";

export type AggregatedToken = {
  symbol: string;
  weight: number;
  supplyRate: number;
  chains: {
    chainId: Chain["id"];
    address: Address;
    decimals: number;
    supplyRate: number;
  }[];
};

type TokenEntry = {
  address: Address;
  symbol: string;
  decimals: number;
  weight: number;
  supplyRate: number;
};

async function getUniqueTokensForChain(
  chainMarkets: ChainMarkets,
  chainId: Chain["id"]
) {
  const { markets } = chainMarkets;

  const tokenMap = new Map<string, TokenEntry>();

  const flatCollateralTokens = markets.map((market) => market.collateralAsset);
  for (const collateral of flatCollateralTokens) {
    const key = collateral.token.address.toLowerCase();
    const existing = tokenMap.get(key);
    if (existing) {
      existing.weight += 1;
    } else {
      tokenMap.set(key, {
        address: collateral.token.address,
        symbol: collateral.token.symbol,
        decimals: collateral.token.decimals,
        weight: 1,
        supplyRate: collateral.supplyRate,
      });
    }
  }

  return Array.from(tokenMap.values()).map((token) => ({
    ...token,
    chainId,
  }));
}

function mergeAggregatedTokens(
  tokensByChain: (TokenEntry & { chainId: Chain["id"] })[]
): AggregatedToken[] {
  const aggregatedMap = new Map<string, AggregatedToken>();

  for (const {
    symbol,
    address,
    decimals,
    weight,
    chainId,
    supplyRate,
  } of tokensByChain) {
    const existing = aggregatedMap.get(symbol);
    const chainEntry = { chainId, address, decimals, supplyRate };

    if (existing) {
      existing.chains.push(chainEntry);
      existing.weight += weight;

      if (existing.supplyRate < supplyRate) {
        existing.supplyRate = supplyRate;
      }
    } else {
      aggregatedMap.set(symbol, {
        symbol,
        weight,
        chains: [chainEntry],
        supplyRate,
      });
    }
  }

  return Array.from(aggregatedMap.values());
}

export async function aggregateSupportedTokens(): Promise<AggregatedToken[]> {
  const marketsData = await getMarkets();

  const tokensByChain = (
    await Promise.all(
      availableChains.map(async ({ chain, internalChainId }) => {
        const marketsInChain = marketsData.find(
          (m) => m.chainId === (internalChainId ?? chain.id)
        );
        if (!marketsInChain) {
          throw new Error(`No markets found for chain ${chain.id}`);
        }
        return getUniqueTokensForChain(marketsInChain, chain.id);
      })
    )
  ).flat();

  const mergedAggregatedTokens = mergeAggregatedTokens(tokensByChain);
  const tokensWithRate = mergedAggregatedTokens.filter(
    (token) => token.supplyRate >= 0
  );
  const sortedTokens = tokensWithRate.sort((a, b) => b.weight - a.weight);
  return sortedTokens;
}
