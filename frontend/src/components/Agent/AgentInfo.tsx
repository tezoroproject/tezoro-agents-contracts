import {
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import { config } from "../../blockchain/config";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import BigNumber from "bignumber.js";
import {
  calculateTotalAccruedUsd,
  calculateTotalSuppliedUsd,
  calculateWeightedAPY,
} from "../../math-utils";
import { useTezoro } from "../../hooks";
import { Address, Hash, maxUint256 } from "viem";
import { Button } from "../../ui/button";
import { ButtonVariants } from "../../ui/button.types";
import { ExplorerLink } from "../ExplorerLink";
import { cn, formatTokenAmount } from "../../utils/utils";
import { Loader } from "../../ui/loader";
import { format } from "date-fns";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useConfirm } from "../../hooks/useConfirm";
import { CONFIRMATIONS } from "../../constants";
import { getUSDPriceFromLlama } from "../../clients/llama";
import { toMarketId } from "../../utils/to-market-id";
import { MarketKey, PositionInfo } from "../../types";
import { ModalScreenType } from "../../schemas/localstorage-schema";
import { useAgentPositionsQuery } from "../../hooks/data/useAgentPositionsQuery";
import ILendingAdapterAbi from "../../blockchain/abis/ILendingAdapter.abi";
import { useAgentLoansQuery } from "../../hooks/data/useAgentLoansQuery";

type AgentInfoProps = {
  agentAddress: Address;
  onChangeModalScreen: (modalScreen: ModalScreenType | null) => void;
};

type PopulatedPosition = {
  market: MarketKey;
  protocolCode: number;
  metadata: {
    token: Address;
    symbol?: string | null;
    decimals: number;
  };

  balance: BigNumber;
  balanceUsd: BigNumber;
  suppliedAmount: BigNumber;
  suppliedUsd: BigNumber;
  accruedInterestAmount: BigNumber;
  accruedInterestUsd: BigNumber;
  price: number;
  apy?: number;
  protocolName?: string | undefined;
};

type PopulatedBorrowedPosition = {
  market: MarketKey;
  protocolCode: number;
  metadata: {
    token: Address;
    symbol?: string | null;
    decimals: number;
  };
  suppliedAmount: BigNumber;
  suppliedUsd: BigNumber;
  price: number;
  debt: BigNumber;
  debtUsd: BigNumber;
  accruedInterestAmount: BigNumber;
  accruedInterestUsd: BigNumber;
  protocolName?: string | undefined;
  healthFactor: BigNumber;
  minAmount: BigNumber;
  maxAmount: BigNumber;
};

export function AgentInfo({
  agentAddress,
  onChangeModalScreen,
}: AgentInfoProps) {
  const { writeContract } = useWriteContract({ config });
  const [withdrawAllTxHash, setWithdrawAllTxHash] = useState<Hash>();
  const [withdrawTxHash, setWithdrawTxHash] = useState<Hash>();
  const [repayTxHash, setRepayTxHash] = useState<Hash>();
  const [permanentDisableTxHash, setPermanentDisableTxHash] = useState<Hash>();
  const { updateLocalStorage } = useLocalStorage();

  const {
    currentChainInfo,
    refetchAgents,
    agents,
    refetchTokensBalances,
    chainMarkets,
  } = useTezoro();

  const agentInfo = useMemo(
    () =>
      agents?.find(
        (agent) => agent.address.toLowerCase() === agentAddress.toLowerCase()
      ),
    [agents, agentAddress]
  );

  const { data: agentPositions, refetch: refetchPositionsInfo } =
    useAgentPositionsQuery(agentAddress);
  const { data: agentLoans } = useAgentLoansQuery(agentAddress);

  const uniqueAgentLoans = useMemo(() => {
    const sortedLoans = agentLoans?.items.sort((a, b) => {
      const aTimestamp = Number.parseInt(a.timestamp);
      const bTimestamp = Number.parseInt(b.timestamp);
      return bTimestamp - aTimestamp;
    });
    // Use "toMarketId" to leave positions with same markets
    const uniqueMarkets = new Set<string>();
    return sortedLoans?.filter((loan) => {
      const marketId = toMarketId(loan.market.protocolCode, {
        auxId: loan.market.auxId,
        marketAddress: loan.market.marketAddress,
        collateralToken: loan.market.collateralToken.address,
        flags: loan.market.flags,
        loanToken: loan.market.loanToken.address,
      });
      if (uniqueMarkets.has(marketId)) {
        return false; // Skip if market already exists
      }
      uniqueMarkets.add(marketId);
      return true; // Keep unique market
    });
  }, [agentLoans?.items]);

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

  const healthFactorCalls = useMemo(
    () =>
      uniqueAgentLoans?.map((item) => {
        const adapterByProtocol = currentChainInfo?.protocols.find(
          (protocol) => protocol.code === item.market.protocolCode
        );
        if (!adapterByProtocol) {
          throw new Error(
            `No adapter found for protocol code ${item.market.protocolCode}`
          );
        }
        return {
          address: adapterByProtocol.adapter,
          abi: ILendingAdapterAbi,
          functionName: "getHealthFactor",
          args: [
            {
              loanToken: item.market.loanToken.address,
              collateralToken: item.market.collateralToken.address,
              marketAddress: item.market.marketAddress,
              auxId: item.market.auxId,
              flags: item.market.flags,
            },
            agentAddress,
          ],
        } as const;
      }),
    [uniqueAgentLoans, currentChainInfo?.protocols, agentAddress]
  );

  const { data: healthFactors } = useReadContracts({
    contracts: healthFactorCalls,
    allowFailure: false,
  });

  const borrowedBalanceCalls = useMemo(
    () =>
      uniqueAgentLoans?.map((item) => {
        const adapterByProtocol = currentChainInfo?.protocols.find(
          (protocol) => protocol.code === item.market.protocolCode
        );
        if (!adapterByProtocol) {
          throw new Error(
            `No adapter found for protocol code ${item.market.protocolCode}`
          );
        }
        return {
          address: adapterByProtocol.adapter,
          abi: ILendingAdapterAbi,
          functionName: "getBorrowBalance",
          args: [
            {
              loanToken: item.market.loanToken.address,
              collateralToken: item.market.collateralToken.address,
              marketAddress: item.market.marketAddress,
              auxId: item.market.auxId,
              flags: item.market.flags,
            },
            agentAddress,
          ],
        } as const;
      }),
    [uniqueAgentLoans, currentChainInfo?.protocols, agentAddress]
  );

  const { data: borrowedBalances, refetch: refetchBorrowBalances } =
    useReadContracts({
      contracts: borrowedBalanceCalls,
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

        const accumulatedAmount = sortedAllocations
          .filter(
            (allocation) =>
              !allocation.withdrawal && allocation.timestamp >= item.timestamp
          )
          .reduce((acc, allocation) => acc + BigInt(allocation.amount), 0n);

        if (!lastAllocation) {
          throw new Error(
            `No last allocation found for token ${item.token.address}`
          );
        }

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

  const loansInfo = useMemo(() => {
    return uniqueAgentLoans?.map((item, index) => {
      const borrowedBalance = borrowedBalances?.[index];
      const healthFactor = healthFactors?.[index];
      return {
        ...item,
        balance: borrowedBalance,
        healthFactor: healthFactor,
      };
    });
  }, [uniqueAgentLoans, borrowedBalances, healthFactors]);

  useLayoutEffect(() => {
    refetchPositionsInfo();
  }, [refetchPositionsInfo]);

  const { data: deploymentTimestamp } = useReadContract({
    address: agentAddress,
    abi: TezoroLendingAgentAbi,
    functionName: "deploymentTimestamp",
  });

  const handleWithdrawAll = () => {
    if (positionsInfo) {
      const markets = positionsInfo.map(({ market }) => market);
      const protocols = positionsInfo.map(({ protocolCode }) => protocolCode);

      writeContract(
        {
          abi: TezoroLendingAgentAbi,
          address: agentAddress,
          functionName: "batchWithdraw",
          args: [protocols, markets, true],
        },
        {
          onSuccess: setWithdrawAllTxHash,
        }
      );
    }
  };
  const { confirm } = useConfirm();

  const handleWithdraw = (protocolCode: number, market: MarketKey) => {
    writeContract(
      {
        abi: TezoroLendingAgentAbi,
        address: agentAddress,
        functionName: "batchWithdraw",
        args: [[protocolCode], [market], true],
      },
      {
        onSuccess: setWithdrawTxHash,
      }
    );
  };

  const { data: permanentDisableReceipt } = useWaitForTransactionReceipt({
    hash: permanentDisableTxHash,
    confirmations: CONFIRMATIONS,
  });

  useEffect(() => {
    if (permanentDisableReceipt) {
      refetchAgents(() => {
        updateLocalStorage?.((draft) => {
          draft.screen = {
            type: "dashboard",
          };
        });

        onChangeModalScreen(null);
      });
    }
  }, [
    onChangeModalScreen,
    permanentDisableReceipt,
    refetchAgents,
    updateLocalStorage,
  ]);

  const handleDisable = async () => {
    const isConfirmed = await confirm({
      title: "Disable agent forever?",
      description:
        "This action will disable the agent forever. This action cannot be undone.",
      confirmText: "Disable",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      writeContract(
        {
          abi: TezoroLendingAgentAbi,
          address: agentAddress,
          functionName: "permanentlyDisable",
        },
        {
          onSuccess: setPermanentDisableTxHash,
        }
      );
    }
  };

  const { data: withdrawAllReceipt } = useWaitForTransactionReceipt({
    hash: withdrawAllTxHash,
    confirmations: CONFIRMATIONS,
  });

  const { data: withdrawReceipt } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
    confirmations: CONFIRMATIONS,
  });

  const { data: repayReceipt } = useWaitForTransactionReceipt({
    hash: repayTxHash,
    confirmations: CONFIRMATIONS,
  });

  // const { data: rebalancePlan } = useReadContract({
  //   address: deployedAgentAddress,
  //   abi: TezoroLendingAgentAbi,
  //   functionName: "calculateRebalance",
  //   args: tokens ? [tokens] : undefined,
  // });

  // const isRebalancingAvailable = useMemo(() => {
  //   if (!rebalancePlan) return false;
  //   const [tokensToMove] = rebalancePlan;
  //   const filteredTokens = tokensToMove.filter(
  //     (token) => token !== zeroAddress
  //   );
  //   return filteredTokens.length > 0;
  // }, [rebalancePlan]);

  const onWithdrawAll = useCallback(() => {
    onChangeModalScreen(null);
  }, [onChangeModalScreen]);

  useEffect(() => {
    if (withdrawReceipt) {
      refetchPositionsInfo();
      refetchTokensBalances();
    }
  }, [refetchPositionsInfo, refetchTokensBalances, withdrawReceipt]);

  useEffect(() => {
    if (repayReceipt) {
      refetchPositionsInfo();
      refetchTokensBalances();
      refetchBorrowBalances();
    }
  }, [
    refetchBorrowBalances,
    refetchPositionsInfo,
    refetchTokensBalances,
    repayReceipt,
  ]);

  useEffect(() => {
    if (withdrawAllReceipt) {
      onWithdrawAll?.();
      refetchPositionsInfo();
      refetchTokensBalances();
    }
  }, [
    onWithdrawAll,
    refetchPositionsInfo,
    refetchTokensBalances,
    withdrawAllReceipt,
  ]);

  // const [totalSuppliedUsd, setTotalSuppliedUSD] = useState<BigNumber>();
  const [weightedApy, setWeightedApy] = useState<BigNumber>();
  const [totalAccruedUsd, setTotalAccruedUsd] = useState<BigNumber>();

  useEffect(() => {
    if (positionsInfo && currentChainInfo && chainMarkets) {
      const { llamaChainId } = currentChainInfo;
      calculateTotalSuppliedUsd(positionsInfo, llamaChainId).then((value) => {
        // setTotalSuppliedUSD(value);
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

  const populatePosition = useCallback(
    async function (
      position: NonNullable<typeof positionsInfo>[number] | undefined,
      llamaChainId: string
    ) {
      if (!position) {
        throw new Error("Position or supplied data is undefined");
      }
      const {
        metadata,
        supplied,
        accumulatedAccruedInterest,
        currentMarketAccruedInterest,
        market,
      } = position;

      const positionMarketId = toMarketId(position.protocolCode, market);

      const suppliedAmount = new BigNumber(supplied.toString()).dividedBy(
        new BigNumber(10).pow(metadata.decimals)
      );

      const { price: usdPrice } = await getUSDPriceFromLlama(
        llamaChainId,
        metadata.token
      );

      const suppliedUsd = suppliedAmount.multipliedBy(usdPrice);

      const totalAccruedInterest =
        accumulatedAccruedInterest + currentMarketAccruedInterest;

      const accruedInterestAmount = new BigNumber(
        totalAccruedInterest?.toString() ?? "0"
      ).dividedBy(new BigNumber(10).pow(metadata.decimals));

      const accruedInterestUsd = accruedInterestAmount.multipliedBy(usdPrice);

      const balance = new BigNumber(supplied.toString()).dividedBy(
        new BigNumber(10).pow(metadata.decimals)
      );

      const balanceUsd = balance.multipliedBy(usdPrice);

      const chainMarket = chainMarkets?.find(
        (market) =>
          toMarketId(market.protocol, {
            auxId: market.auxId,
            marketAddress: market.marketAddress,
            collateralToken: market.collateralAsset.token.address,
            flags: market.flags,
            loanToken: market.loanAsset.token.address,
          }) === positionMarketId
      );

      if (!chainMarket) {
        throw new Error(
          `Chain market not found for position with marketId ${positionMarketId}`
        );
      }

      const protocol = currentChainInfo?.protocols.find(
        ({ code }) => code === position.protocolCode
      );

      return {
        metadata,
        balance,
        balanceUsd,
        suppliedAmount,
        suppliedUsd,
        accruedInterestAmount,
        accruedInterestUsd,
        price: usdPrice,
        apy: chainMarket.collateralAsset.supplyRate,
        protocolName: protocol?.name,
        protocolCode: position.protocolCode,
        market,
      };
    },
    [chainMarkets, currentChainInfo?.protocols]
  );

  const populateBorrowedPosition = useCallback(async function (
    position:
      | (NonNullable<NonNullable<typeof uniqueAgentLoans>>[number] & {
          balance?: bigint;
          healthFactor?: bigint;
        })
      | undefined,
    llamaChainId: string
  ) {
    if (!position) {
      throw new Error("Position or supplied data is undefined");
    }
    const { market, minAmount, maxAmount } = position;

    const maxAmountBigInt = BigInt(maxAmount ?? "0");
    const minAmountBigInt = BigInt(minAmount);
    const amount = maxAmountBigInt > 0n ? maxAmountBigInt : minAmountBigInt;

    const minAmountBN = new BigNumber(minAmountBigInt.toString()).dividedBy(
      new BigNumber(10).pow(market.loanToken.decimals)
    );
    const maxAmountBN = new BigNumber(maxAmountBigInt.toString()).dividedBy(
      new BigNumber(10).pow(market.loanToken.decimals)
    );

    const { price: usdPrice } = await getUSDPriceFromLlama(
      llamaChainId,
      market.loanToken.address
    );

    const suppliedAmount = new BigNumber(amount.toString()).dividedBy(
      new BigNumber(10).pow(market.loanToken.decimals)
    );

    const suppliedUsd = suppliedAmount.multipliedBy(usdPrice);

    const debt = new BigNumber(position.balance?.toString() ?? "0").dividedBy(
      new BigNumber(10).pow(position.market.loanToken.decimals)
    );
    const debtUsd = debt.multipliedBy(usdPrice);
    const accruedInterestAmount = debt.minus(suppliedAmount);
    const accruedInterestUsd = accruedInterestAmount.multipliedBy(usdPrice);
    return {
      market: {
        auxId: market.auxId,
        collateralToken: market.collateralToken.address,
        flags: market.flags,
        loanToken: market.loanToken.address,
        marketAddress: market.marketAddress,
      },
      protocolCode: position.market.protocolCode,
      metadata: {
        token: market.loanToken.address,
        symbol: market.loanToken.symbol,
        decimals: market.loanToken.decimals,
      },
      suppliedAmount,
      suppliedUsd,
      price: usdPrice,
      debt,
      accruedInterestAmount,
      accruedInterestUsd,
      debtUsd,
      healthFactor: position.healthFactor
        ? new BigNumber(position.healthFactor.toString()).div(1e18)
        : new BigNumber(0),
      minAmount: minAmountBN,
      maxAmount: maxAmountBN,
    };
  }, []);

  const handleRepayFullLoan = (position: PopulatedBorrowedPosition) => {
    const { market, protocolCode } = position;

    writeContract(
      {
        abi: TezoroLendingAgentAbi,
        address: agentAddress,
        functionName: "repay",
        args: [protocolCode, market, maxUint256],
      },
      {
        onSuccess: setRepayTxHash,
      }
    );
  };

  const [populatedPositionsInfo, setPopulatedPositionsInfo] = useState<
    PopulatedPosition[]
  >([]);

  const [populatedBorrowedPositionsInfo, setPopulatedBorrowedPositionsInfo] =
    useState<PopulatedBorrowedPosition[]>([]);

  useEffect(() => {
    if (positionsInfo && currentChainInfo) {
      const { llamaChainId } = currentChainInfo;
      Promise.all(
        positionsInfo.map((position) =>
          populatePosition(position, llamaChainId)
        )
      ).then(setPopulatedPositionsInfo);
    }
  }, [positionsInfo, currentChainInfo, populatePosition]);

  useEffect(() => {
    if (loansInfo && currentChainInfo) {
      const { llamaChainId } = currentChainInfo;
      Promise.all(
        loansInfo.map((position) =>
          populateBorrowedPosition(position, llamaChainId)
        )
      ).then((data) => {
        const positionsWithDebt = data.filter((p) => p.debt.isGreaterThan(0));
        setPopulatedBorrowedPositionsInfo(positionsWithDebt);
      });
    }
  }, [loansInfo, currentChainInfo, populateBorrowedPosition]);

  if (!positionsInfo) {
    return (
      <div className="absolute top-0 left-0 z-10 w-full h-full bg-white flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  const isTxLoading =
    (withdrawTxHash !== undefined && !withdrawReceipt) ||
    (withdrawAllTxHash !== undefined && !withdrawAllReceipt) ||
    (repayTxHash !== undefined && !repayReceipt) ||
    (permanentDisableTxHash !== undefined && !permanentDisableReceipt);

  const goToRebalancingHistory = (token: Address) => {
    onChangeModalScreen({
      type: "agentToken",
      agentAddress: agentAddress,
      tokenAddress: token,
    });
  };

  const goToAddFunds = () => {
    onChangeModalScreen({
      type: "addFunds",
      agentAddress: agentAddress,
      typeBefore: "agent",
    });
  };

  return (
    <>
      {isTxLoading ? (
        <div className="fixed top-0 left-0 z-1000 w-full h-full flex justify-center items-center pointer-events-none">
          <Loader />
        </div>
      ) : null}
      <section className="flex-1 overflow-y-scroll scrollbar-none">
        <div className="text-[14px] min-[410px]:text-[16px] text-[#6F6F6F] flex flex-col gap-1">
          <div className="flex justify-between gap-2">
            <span>Contract</span>{" "}
            <ExplorerLink address={agentAddress}>
              {agentAddress.slice(0, 6)}...
              {agentAddress.slice(-4)}
            </ExplorerLink>
          </div>
          {deploymentTimestamp && (
            <div className="flex justify-between gap-2">
              <span>Deployment date</span>{" "}
              {format(
                new Date(Number(deploymentTimestamp) * 1000),
                "MMMM d, yyyy"
              )}
            </div>
          )}
          {weightedApy && (
            <div className="flex justify-between gap-2">
              <span>Weighted APY</span>
              {weightedApy.isNaN() ? "-" : `${weightedApy.toFixed(2)}%`}
            </div>
          )}
          <div
            className="flex justify-between gap-2"
            title={totalAccruedUsd?.toString()}
          >
            <span>Total Accrued</span> ${totalAccruedUsd?.toFixed(2)}
          </div>
          {/* <div className="flex justify-between gap-2">
          <span>Total Borrowable</span> ${totalBorrowable.toFixed(2)}
        </div> */}
        </div>

        <div
          className={cn(
            "mt-4 flex gap-2 max-[500px]:flex-col",
            isTxLoading && "opacity-50 pointer-events-none"
          )}
        >
          {!agentInfo?.isDisabled && (
            <Button
              type="button"
              onClick={goToAddFunds}
              variant={ButtonVariants.DEFAULT}
              className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
              disabled={isTxLoading}
            >
              Add Funds
            </Button>
          )}
          {positionsInfo.length > 1 && (
            <Button
              type="button"
              onClick={handleWithdrawAll}
              disabled={isTxLoading}
              variant={ButtonVariants.SECONDARY}
              className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
            >
              Withdraw All
            </Button>
          )}
          {((positionsInfo.length === 0 && !agentInfo?.isDisabled) ||
            import.meta.env.DEV) && (
            <Button
              type="button"
              onClick={handleDisable}
              className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px] px-2"
              variant={ButtonVariants.SECONDARY}
              disabled={isTxLoading}
            >
              Disable
            </Button>
          )}
        </div>

        {populatedPositionsInfo.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4">
            {populatedPositionsInfo.map((position, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg py-[10px] px-[14px] border border-[#F4F4F4]",
                  isTxLoading && "opacity-50 pointer-events-none"
                )}
              >
                <div className="text-black text-base font-medium">
                  {position.metadata.symbol}
                </div>
                <div
                  className="mt-[9px] flex flex-col gap-3 text-[#6F6F6F] text-[14px] min-[410px]:text-[16px]
                  leading-tight"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div>Supplied</div>
                    <div title={position.suppliedAmount.toString()}>
                      {position.suppliedAmount.toFixed(6)} ($
                      {position.suppliedUsd.toFixed(2)})
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Current balance</div>
                    <div title={position.balance.toString()}>
                      {position.balance.toFixed(6)} ($
                      {position.balanceUsd.toFixed(2)})
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Accrued interest</div>
                    <div className="flex gap-1">
                      <span title={position.accruedInterestAmount.toString()}>
                        ~{formatTokenAmount(position.accruedInterestAmount)}
                      </span>
                      <span title={position.accruedInterestUsd.toString()}>
                        (~ ${position.accruedInterestUsd.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>APY</div>
                    <div>{position.apy?.toFixed(2)}%</div>
                  </div>
                  {/* <div className="flex justify-between items-center gap-2">
                    <div>LTV</div>
                    <div>{position.ltv.toFixed(2)}%</div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Borrowable</div>
                    <div>${position.borrowable.toFixed(2)}</div>
                  </div> */}
                  <div className="flex justify-between items-center gap-2">
                    <div>Lending platform</div>
                    <div>{position.protocolName}</div>
                  </div>
                </div>
                <div className="flex mt-[14px] items-center gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      handleWithdraw(position.protocolCode, position.market)
                    }
                    variant={ButtonVariants.SECONDARY}
                    className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
                    disabled={isTxLoading}
                  >
                    Withdraw
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      goToRebalancingHistory(position.metadata.token)
                    }
                    variant={ButtonVariants.SECONDARY}
                    className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
                    disabled={isTxLoading}
                  >
                    History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {populatedBorrowedPositionsInfo.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4">
            {populatedBorrowedPositionsInfo.map((position, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg py-[10px] px-[14px] border border-[#F4F4F4]",
                  isTxLoading && "opacity-50 pointer-events-none"
                )}
              >
                <div className="text-black text-base font-medium">
                  Borrowed {position.metadata.symbol}
                </div>
                <div
                  className="mt-[9px] flex flex-col gap-3 text-[#6F6F6F] text-[14px] min-[410px]:text-[16px]
                  leading-tight"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div>Health Factor</div>
                    <div
                      className={cn({
                        "text-red-500": position.healthFactor.isLessThan(1),
                        "text-orange-500":
                          position.healthFactor.isGreaterThanOrEqualTo(1) &&
                          position.healthFactor.isLessThan(1.25),
                        "text-yellow-500":
                          position.healthFactor.isGreaterThanOrEqualTo(1.25) &&
                          position.healthFactor.isLessThan(1.5),
                        "text-green-500":
                          position.healthFactor.isGreaterThanOrEqualTo(1.5) &&
                          position.healthFactor.isLessThan(2),
                        "text-emerald-500":
                          position.healthFactor.isGreaterThanOrEqualTo(2),
                      })}
                    >
                      {position.healthFactor.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Amount</div>
                    <div title={position.suppliedAmount.toString()}>
                      {position.suppliedAmount.decimalPlaces(6).toString()} ($
                      {position.suppliedUsd.toFixed(2)})
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Total debt</div>
                    <div className="flex gap-1">
                      <span title={position.debt.toString()}>
                        ~{formatTokenAmount(position.debt)}
                      </span>
                      <span title={position.debtUsd?.toString()}>
                        (~ ${position.debtUsd?.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div>Accrued interest</div>
                    <div className="flex gap-1">
                      <span title={position.accruedInterestAmount?.toString()}>
                        ~{formatTokenAmount(position.accruedInterestAmount)}
                      </span>
                      <span title={position.accruedInterestUsd?.toString()}>
                        (~ ${position.accruedInterestUsd?.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  {position.maxAmount.isGreaterThan(0) && (
                    <div className="flex items-center gap-1">
                      <span>Auto-refill to</span>
                      <span title={position.maxAmount.toString()}>
                        {position.maxAmount.decimalPlaces(6).toString()}
                      </span>
                      <span>when balance drops to</span>
                      <span title={position.minAmount.toString()}>
                        {position.minAmount.decimalPlaces(6).toString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-[14px]">
                  <Button
                    type="button"
                    onClick={() => {
                      handleRepayFullLoan(position);
                    }}
                    variant={ButtonVariants.SECONDARY}
                    className="h-[36px] max-[510px]:h-[36px] rounded-[9px] text-[14px] min-[410px]:text-[16px]"
                    // TODO: disabled={isRepayLoading}
                  >
                    Repay full loan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {agentInfo?.isDisabled && (
          <div className="mt-4 text-[#6F6F6F] text-[14px] min-[410px]:text-[16px]">
            This agent is permanently disabled by you.
          </div>
        )}
      </section>
    </>
  );
}
