import { Address } from "abitype";
import { MarketKey } from "./types";
import { Account, PublicClient } from "viem";
import TezoroLendingAgentAbi from "./blockchain/abis/TezoroLendingAgent.abi";

export async function isMarketUsedAsCollateral(
  agent: Address,
  protocol: number,
  market: MarketKey,
  publicClient: PublicClient,
  accountOverride: Account | Address
) {
  try {
    await publicClient.simulateContract({
      address: agent,
      abi: TezoroLendingAgentAbi,
      functionName: "batchWithdraw",
      args: [[protocol], [market], true],
      account: accountOverride,
    });
    return false;
  } catch {
    return true;
  }
}
