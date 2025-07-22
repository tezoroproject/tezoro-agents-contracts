import {
  calculateTotalAccruedUsd,
  calculateTotalSuppliedUsd,
  calculateWeightedAPY,
} from "../../math-utils";
import { Address } from "viem";
import { ExplorerLink } from "../ExplorerLink";
import { Button } from "../../ui/button";
import { ButtonVariants } from "../../ui/button.types";
import BigNumber from "bignumber.js";
import { useEffect, useMemo, useState } from "react";
import { useTezoro } from "../../hooks";
import { useAgentPositionsQuery } from "../../hooks/data/useAgentPositionsQuery";
import { PositionInfo } from "../../types";
import ILendingAdapterAbi from "../../blockchain/abis/ILendingAdapter.abi";
import { useReadContracts } from "wagmi";

type AgentInfoProps = {
  agentAddress: Address;
  onView?: () => void;
  onAddFunds?: () => void;
  isDisabled: boolean;
};
export function AgentPreviewInfo({
  agentAddress,
  onView,
  onAddFunds,
  isDisabled,
}: AgentInfoProps) {
  const { currentChainInfo, chainMarkets } = useTezoro();

  const [totalSuppliedUsd, setTotalSuppliedUSD] = useState<BigNumber>();
  const [weightedApy, setWeightedApy] = useState<BigNumber>();
  const [totalAccruedUsd, setTotalAccruedUsd] = useState<BigNumber>();

  const { data: agentPositions } = useAgentPositionsQuery(agentAddress);

  console.log("agentPositions", agentPositions);
  const balanceCalls = useMemo(
    () =>
      agentPositions?.items.map((item) => {
        const sortedAllocations = item.allocations.items.sort(
          (a, b) => Number.parseInt(a.timestamp) - Number.parseInt(b.timestamp)
        );
        const lastAllocation = sortedAllocations[sortedAllocations.length - 1];

        if (!lastAllocation) {
          throw new Error(
            `No last allocation found for token ${item.token.address}`
          );
        }
        const adapterByProtocol = currentChainInfo?.protocols.find(
          (protocol) => protocol.code === lastAllocation.market.protocolCode
        );
        if (!adapterByProtocol) {
          throw new Error(
            `No adapter found for protocol code ${lastAllocation.market.protocolCode}`
          );
        }
        return {
          address: adapterByProtocol.adapter,
          abi: ILendingAdapterAbi,
          functionName: "getSupplyBalance",
          args: [
            {
              loanToken: lastAllocation.market.loanToken.address,
              collateralToken: lastAllocation.market.collateralToken.address,
              marketAddress: lastAllocation.market.marketAddress,
              auxId: lastAllocation.market.auxId,
              flags: lastAllocation.market.flags,
            },
            agentAddress,
          ],
        } as const;
      }),
    [agentPositions?.items, currentChainInfo?.protocols, agentAddress]
  );

  const { data: balances } = useReadContracts({
    contracts: balanceCalls,
    allowFailure: false,
  });

  const positionsInfo: PositionInfo[] | undefined = useMemo(() => {
    return agentPositions?.items
      .map((item, index) => {
        const allPrevAllocations = item.allocations.items.slice(0, -1);
        const accumulatedAccruedInterest = allPrevAllocations.reduce(
          (acc, allocation) => {
            const earned = allocation.withdrawal
              ? BigInt(allocation.amount) - BigInt(allocation.withdrawal.amount)
              : 0n; // No withdrawal means no interest earned in accumulated
            return acc + earned;
          },
          0n
        );
        const sortedAllocations = item.allocations.items.sort(
          (a, b) => Number.parseInt(a.timestamp) - Number.parseInt(b.timestamp)
        );
        const lastAllocation = sortedAllocations[sortedAllocations.length - 1];

        if (!lastAllocation) {
          throw new Error(
            `No last allocation found for token ${item.token.address}`
          );
        }

        const accumulatedAmount = sortedAllocations
          .filter(
            (allocation) =>
              !allocation.withdrawal && allocation.timestamp >= item.timestamp
          )
          .reduce((acc, allocation) => acc + BigInt(allocation.amount), 0n);

        const tokenBalance = balances?.[index];

        const currentMarketAccruedInterest =
          (tokenBalance ?? 0n) - BigInt(lastAllocation.amount);
        return {
          metadata: {
            decimals: item.token.decimals,
            symbol: item.token.symbol,
            token: item.token.address,
          },
          accumulatedAccruedInterest:
            accumulatedAccruedInterest > 0n ? accumulatedAccruedInterest : 0n,
          currentMarketAccruedInterest:
            currentMarketAccruedInterest < 0n
              ? 0n
              : currentMarketAccruedInterest,
          supplied: accumulatedAmount,
          market: {
            ...lastAllocation.market,
            loanToken: lastAllocation.market.loanToken.address,
            collateralToken: lastAllocation.market.collateralToken.address,
          },
          protocolCode: lastAllocation.market.protocolCode,
          isClosed: lastAllocation.withdrawal !== null,
        };
      })
      .filter((pos) => !pos.isClosed);
  }, [agentPositions?.items, balances]);

  useEffect(() => {
    if (positionsInfo && currentChainInfo && chainMarkets) {
      const { llamaChainId } = currentChainInfo;
      calculateTotalSuppliedUsd(positionsInfo, llamaChainId).then((value) => {
        setTotalSuppliedUSD(value);

        calculateWeightedAPY(
          positionsInfo,
          value,
          llamaChainId,
          chainMarkets
        ).then(setWeightedApy);
        calculateTotalAccruedUsd(positionsInfo, llamaChainId).then(
          setTotalAccruedUsd
        );
      });
    }
  }, [positionsInfo, currentChainInfo, chainMarkets]);

  return (
    <section className="px-[14px] py-[10px] bg-white border border-[#F4F4F4] rounded-[12px]">
      <div className="text-[16px] min-[410px]:text-[18px] font-medium flex items-center">
        Yield Farming agent
        {weightedApy?.gt(0) ? (
          <div
            className="w-2 h-2 ml-[6px] rounded-full bg-[#02BDA7]"
            title="Active"
          />
        ) : isDisabled ? (
          <div
            className="w-2 h-2 ml-[6px] rounded-full bg-[#FF4548]"
            title="Disabled"
          />
        ) : (
          <div
            className="w-2 h-2 ml-[6px] rounded-full bg-[#FFB800]"
            title="Inactive"
          />
        )}
      </div>
      <div className="mt-[9px] flex flex-col gap-3 text-[14px] min-[410px]:text-[16px] leading-[1.2] text-[#6F6F6F]">
        <div className="flex justify-between gap-2">
          Contract
          <ExplorerLink address={agentAddress}>
            {agentAddress.slice(0, 6)}...
            {agentAddress.slice(-4)}
          </ExplorerLink>
        </div>
        <div className="flex justify-between gap-2">
          Total Supplied
          <span>${totalSuppliedUsd?.toFixed(2)}</span>
        </div>
        {weightedApy && (
          <div className="flex justify-between gap-2">
            Weighted APY<span>{weightedApy?.toFixed(2)}%</span>
          </div>
        )}
        {/* <div className="flex justify-between gap-2">
          Total Borrowable
          <span>${totalBorrowable.toFixed(2)}</span>
        </div> */}
        <div
          className="flex justify-between gap-2"
          title={totalAccruedUsd?.toString()}
        >
          Total Accrued
          <span>${totalAccruedUsd?.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-[14px] w-full flex justify-between gap-2">
        {!isDisabled && (
          <Button
            onClick={onAddFunds}
            variant={ButtonVariants.DEFAULT}
            className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
          >
            Add Funds
          </Button>
        )}
        <Button
          onClick={onView}
          variant={ButtonVariants.SECONDARY}
          className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
        >
          View
        </Button>
      </div>
    </section>
  );
}
