import { Hex, keccak256, PublicClient, toHex, zeroAddress } from "viem";
import { Address } from "viem";

import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import { getBestSupplyMarkets } from "../../clients/tezoro-subgraph";
import { MarketKey } from "../../types";
import { indexerSDK } from "../../clients/indexer";
import { isMarketUsedAsCollateral } from "../../utils";
import { BORROW_PROTOCOL } from "../../../global-constants";

type Result = {
  marketsFrom: MarketKey[];
  marketsTo: MarketKey[];
  fromProtocols: bigint[];
  toProtocols: bigint[];
};

type InputParams = {
  chainId: number;
  publicClient: PublicClient;
  agent: Address;
  account: Address; // Account to use for simulation
};

export async function generateRebalancePlan({
  chainId,
  publicClient,
  agent,
  account,
}: InputParams): Promise<Result> {
  const {
    positions: { items: positions },
  } = await indexerSDK.agentPositionsQuery({
    agentAddress: agent,
  });

  const protocols = await publicClient.readContract({
    address: agent,
    abi: TezoroLendingAgentAbi,
    functionName: "getProtocols",
    args: [],
  });

  if (positions.length === 0) {
    console.log(
      `${new Date().toUTCString()}: No positions found for agent ${agent}. Skipping.`
    );
    return {
      marketsFrom: [],
      marketsTo: [],
      fromProtocols: [],
      toProtocols: [],
    };
  }

  console.log(
    `[generateRebalancePlan] Found ${positions.length} positions for agent ${agent}`
  );
  const tokens = positions.map(
    (p) => p.token?.address.toLowerCase() as Address
  );

  console.log("[generateRebalancePlan] Fetching distribution plan...");
  const distributionPlan = await getBestSupplyMarkets(chainId, tokens, [
    ...protocols,
  ]);
  console.log(
    `[generateRebalancePlan] Got ${distributionPlan.length} plan steps`
  );

  const distMarketMap = new Map<
    string,
    { targetMarket: MarketKey; targetProtocol: bigint }
  >();

  for (const {
    protocol,
    marketAddress,
    flags,
    auxId,
    collateralAsset,
    loanAsset,
  } of distributionPlan) {
    if (
      !collateralAsset.token?.address ||
      collateralAsset.token.address === zeroAddress
    )
      continue;

    const market: MarketKey = {
      marketAddress,
      loanToken: loanAsset.token.address,
      collateralToken: collateralAsset.token.address,
      auxId,
      flags,
    };

    distMarketMap.set(collateralAsset.token.address.toLowerCase(), {
      targetMarket: market,
      targetProtocol: BigInt(protocol),
    });
  }

  const marketsFrom: MarketKey[] = [];
  const marketsTo: MarketKey[] = [];
  const fromProtocols: bigint[] = [];
  const toProtocols: bigint[] = [];

  console.log(`[generateRebalancePlan] Checking ${tokens.length} tokens...`);

  for (const position of positions) {
    if (!position.token) {
      throw new Error(`Position ${position.id} has no token`);
    }
    const tokenKey = position.token.address.toLowerCase();
    const distrEntry = distMarketMap.get(tokenKey);

    if (!distrEntry) {
      console.log(`[Token ${tokenKey}] No distribution market found, skipping`);
      continue;
    }

    const { targetMarket, targetProtocol } = distrEntry;

    if (!position.allocations) {
      throw new Error(`Position ${position.id} has no allocations`);
    }

    const sortedAllocations = position.allocations.items.sort(
      (a, b) => Number.parseInt(a.timestamp) - Number.parseInt(b.timestamp)
    );

    const lastAllocation = sortedAllocations[sortedAllocations.length - 1];
    if (!lastAllocation) {
      throw new Error(
        `No last allocation found for token ${position.token.address}`
      );
    }

    if (!lastAllocation.market) {
      throw new Error(
        `Last allocation for token ${position.token.address} has no market`
      );
    }

    const isCollateralized = await isMarketUsedAsCollateral(
      agent,
      lastAllocation.market.protocolCode,
      {
        marketAddress: lastAllocation.market.marketAddress as Address,
        loanToken: lastAllocation.market.loanToken?.address as Address,
        collateralToken: lastAllocation.market.collateralToken
          ?.address as Address,
        auxId: lastAllocation.market.auxId as Hex,
        flags: lastAllocation.market.flags,
      },
      publicClient,
      account
    );

    if (
      isCollateralized ||
      lastAllocation.market.protocolCode === BORROW_PROTOCOL
    ) {
      console.log(
        `[Token ${position.token.symbol}] Market ${lastAllocation.market.marketAddress} is used as collateral or in borrow protocol and cant be rebalances, skipping`
      );
      continue;
    }

    console.log(
      `[Token ${position.token.symbol}] Current protocol: ${lastAllocation.market.protocolCode}`
    );

    console.log(
      `[Token ${position.token.symbol}] Target protocol: ${targetProtocol}`
    );
    const targetProtocolNumber = Number(targetProtocol);
    if (lastAllocation.market.protocolCode === targetProtocolNumber) {
      console.log(
        `[Token ${position.token.symbol}] Already in target protocol ${targetProtocol}, skipping`
      );
      continue;
    }

    console.log(
      `[Token ${position.token.symbol}] Needs rebalance: ${lastAllocation.market?.protocolCode} → ${targetProtocol}`
    );

    if (!lastAllocation.market.collateralToken) {
      throw new Error(
        `Last allocation for token ${position.token.address} has no collateral token`
      );
    }
    marketsFrom.push({
      marketAddress: lastAllocation.market.marketAddress as Address,
      loanToken: lastAllocation.market.loanToken?.address as Address,
      collateralToken: lastAllocation.market.collateralToken.address as Address,
      auxId: lastAllocation.market.auxId as Hex,
      flags: lastAllocation.market.flags,
    });

    fromProtocols.push(BigInt(lastAllocation.market.protocolCode));
    marketsTo.push(targetMarket);
    toProtocols.push(targetProtocol);
  }

  console.log(
    `[generateRebalancePlan] Final plan: ${marketsFrom.length} movements`
  );

  return {
    marketsFrom,
    marketsTo,
    fromProtocols,
    toProtocols,
  };
}
