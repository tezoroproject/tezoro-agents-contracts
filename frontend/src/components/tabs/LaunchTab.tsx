import {
  useAccount,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useTezoro } from "../../hooks";
import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { Button } from "../../ui/button";
import { config } from "../../blockchain/config";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, erc20Abi, Hash, maxUint256 } from "viem";
import TezoroLendingAgentFactoryAbi from "../../blockchain/abis/TezoroLendingAgentFactory.abi";
import { LoaderCircleIcon } from "lucide-react";
import { ExplorerLink } from "../ExplorerLink";
import { useAggregatedTokensStore } from "../../state";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import { cn } from "../../utils/utils";
import { TokenIcon } from "@web3icons/react";
import { iconsMapping } from "../../blockchain/mapping";
import { SuccessCheckIcon } from "../../ui/icons/success-check";
import BigNumber from "bignumber.js";
import { useActiveAgent } from "../../hooks/useActiveAgent";
import { format } from "date-fns";
import {
  getBestBorrowMarkets,
  getBestSupplyMarkets,
  Market,
} from "../../clients/tezoro-backend";
import { MarketKey } from "../../types";

type LaunchTabProps = {
  onComplete?: (agentAddress: Address) => void;
};

export function LaunchTab({ onComplete }: LaunchTabProps) {
  const [currentApprovalHash, setCurrentApprovalHash] = useState<Hash>();
  const [agentDeployTxHash, setAgentDeployTxHash] = useState<Hash>();
  const activeAgent = useActiveAgent();
  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();
  const [isConfirming, setIsConfirming] = useState(false);
  const { chain, address: accountAddress } = useAccount({ config });
  const {
    currentChainInfo,
    tokensInChain,
    chainMarkets,
    refetchAgents,
    refetchTokensBalances,
  } = useTezoro();
  const { writeContract } = useWriteContract({ config });

  const { aggregatedTokens } = useAggregatedTokensStore();

  const adaptersAddresses = useMemo(
    () => currentChainInfo?.protocols.map(({ adapter: address }) => address),
    [currentChainInfo]
  );

  const tokensForApproval = useMemo(() => {
    if (activeAllocation?.borrowing?.token) {
      const tokensForApprove = [
        {
          ...activeAllocation.borrowing.token,
          allocation: {
            ...activeAllocation.borrowing.token.allocation,
            amount: "-1", // Max amount for approval
          },
          isFull: true,
        },
        ...(activeAllocation.distributionTxConfirmedAt
          ? []
          : activeAllocation?.tokens ?? []
        ).map((token) => ({
          ...token,
          isFull: false,
        })),
      ];

      // If some tokens duplicated, leave only one instance with highest approve (isFull)
      const uniqueTokens = new Map<string, (typeof tokensForApprove)[number]>();
      tokensForApprove.forEach((token) => {
        if (!uniqueTokens.has(token.symbol)) {
          uniqueTokens.set(token.symbol, token);
        } else {
          const existingToken = uniqueTokens.get(token.symbol);
          if (existingToken && !existingToken.isFull && token.isFull) {
            uniqueTokens.set(token.symbol, token);
          }
        }
      });
      return Array.from(uniqueTokens.values());
    } else {
      return [
        ...(activeAllocation?.tokens ?? []).map((token) => ({
          ...token,
          isFull: false,
        })),
      ];
    }
  }, [activeAllocation]);

  const { data: allowances, refetch: refetchAllowances } = useReadContracts({
    contracts: tokensForApproval
      .map((token) => {
        const tokenInChain = tokensInChain?.find(
          (t) => t.symbol === token.symbol
        );
        if (!tokenInChain || !activeAgent) return undefined;

        return {
          address: tokenInChain?.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [accountAddress, activeAgent.address],
        } as const;
      })
      .filter((contract) => contract !== undefined),
    allowFailure: false,
  });

  const isTokenApproved = useCallback(
    (symbol: string) => {
      if (!tokensInChain) return false;

      const tokenInChainIndex = tokensInChain.findIndex(
        (t) => t.symbol === symbol
      );
      const tokenInFlowIndex = tokensForApproval.findIndex(
        (token) => token.symbol === symbol
      );

      const tokenInFlow = tokensForApproval[tokenInFlowIndex];

      // TODO: asset isApproved bug after distribution
      if (tokenInFlowIndex === -1) {
        return true;
      }

      if (
        tokenInChainIndex === undefined ||
        tokenInFlowIndex === undefined ||
        tokenInFlow === undefined
      )
        return false;

      const tokenInChain = tokensInChain?.[tokenInChainIndex];

      if (!tokenInChain) return false;

      const allowance = allowances?.[tokenInFlowIndex];
      if (allowance === undefined) return false;

      const allocation = new BigNumber(tokenInFlow.allocation.amount);
      let blockchainAmount;
      if (allocation.isPositive()) {
        blockchainAmount = allocation.multipliedBy(10 ** tokenInChain.decimals);
      } else {
        // Max approve
        const HALF = maxUint256 / 2n;
        blockchainAmount = new BigNumber(HALF.toString());
      }

      const allowanceAmount = new BigNumber(allowance.toString());
      const isApproved = allowanceAmount.gte(blockchainAmount);

      return isApproved;
    },
    [allowances, tokensForApproval, tokensInChain]
  );

  const currentApproveCandidate = useMemo(
    () => tokensForApproval.find((token) => !isTokenApproved(token.symbol)),
    [tokensForApproval, isTokenApproved]
  );

  const { data: deployReceipt, failureReason: deployFailureReason } =
    useWaitForTransactionReceipt({
      hash: agentDeployTxHash,
    });

  const {
    data: distributionReceipt,
    failureReason: distributionFailureReason,
  } = useWaitForTransactionReceipt({
    hash: activeAllocation?.distributionTx,
  });

  const { data: approveReceipt } = useWaitForTransactionReceipt({
    hash: currentApprovalHash,
  });

  const { data: borrowReceipt } = useWaitForTransactionReceipt({
    hash: activeAllocation?.borrowing?.tx,
  });

  if (deployFailureReason) {
    console.error("Error deploying agent", deployFailureReason);
  }

  useEffect(() => {
    if (deployFailureReason) {
      setAgentDeployTxHash(undefined);
    }
  }, [deployFailureReason]);

  useEffect(() => {
    if (distributionFailureReason) {
      updateActiveAllocation((draft) => {
        draft.distributionTx = undefined;
      });
      console.error("Error distributing tokens", distributionFailureReason);
    }
  }, [distributionFailureReason, updateActiveAllocation]);

  useEffect(() => {
    if (deployReceipt?.status === "success" && !activeAgent) {
      refetchAgents();
    }
  }, [activeAgent, deployReceipt, refetchAgents]);

  const handleDeploy = async () => {
    if (!currentChainInfo) {
      throw new Error("Tezoro contracts not found");
    }
    if (!adaptersAddresses) {
      throw new Error("Adapters addresses not found");
    }

    if (!accountAddress) {
      throw new Error("Account address not found");
    }

    setIsConfirming(true);

    writeContract(
      {
        abi: TezoroLendingAgentFactoryAbi,
        address: currentChainInfo.factoryAddress,
        functionName: "createAgent",
        args: [currentChainInfo.lensAddress, adaptersAddresses],
      },
      {
        onSuccess: setAgentDeployTxHash,
        onSettled: () => {
          setIsConfirming(false);
        },
      }
    );
  };

  useEffect(() => {
    if (approveReceipt) {
      refetchAllowances();
      setCurrentApprovalHash(undefined);
    }
  }, [approveReceipt, refetchAllowances]);

  const approveToken = useCallback(
    (symbol: string, amount: string, isFull: boolean) => {
      if (!activeAllocation || !activeAgent || !chain) return;

      const tokenInfo = aggregatedTokens?.find(
        (token) => token.symbol === symbol
      );

      if (!tokenInfo) return;

      if (!activeAllocation.chainId) {
        updateActiveAllocation((draft) => {
          console.log(`Chain for deployment ${draft.id} set to ${chain.id}`);
          draft.chainId = chain.id;
        });
      }

      const tokenInChain = tokenInfo.chains.find(
        (tokenChain) =>
          tokenChain.chainId === (activeAllocation.chainId ?? chain.id)
      );

      if (!tokenInChain) return;

      const blockchainAmount = new BigNumber(amount).multipliedBy(
        new BigNumber(10).pow(tokenInChain.decimals)
      );

      setIsConfirming(true);
      writeContract(
        {
          abi: erc20Abi,
          address: tokenInChain.address,
          functionName: "approve",
          args: [
            activeAgent.address,
            isFull ? maxUint256 : BigInt(blockchainAmount.toString()),
          ],
        },
        {
          onSuccess: setCurrentApprovalHash,
          onSettled: () => {
            setIsConfirming(false);
          },
        }
      );
    },
    [
      activeAgent,
      activeAllocation,
      aggregatedTokens,
      chain,
      updateActiveAllocation,
      writeContract,
    ]
  );

  const handleApprove = () => {
    if (!currentApproveCandidate || !aggregatedTokens) return;

    const {
      symbol,
      allocation: { amount },
      isFull,
    } = currentApproveCandidate;

    approveToken(symbol, amount, isFull);
  };

  const handleBorrow = () => {
    const borrowingToken = activeAllocation?.borrowing?.token;
    if (!activeAgent || !borrowingToken) return;

    const loanTokenMarket = chainMarkets?.find(
      (market) => market.loanAsset.token.symbol === borrowingToken.symbol
    );

    if (!loanTokenMarket) {
      throw new Error(
        `No loan token market found for ${
          borrowingToken.symbol
        }. Available markets: ${distributionPlan
          ?.map((market) => market.loanAsset.token.symbol)
          .join(", ")}`
      );
    }

    const loanTokenInChain = tokensInChain?.find(
      (token) => token.symbol === borrowingToken.symbol
    );
    if (!loanTokenInChain) {
      throw new Error(
        `No loan token found in chain for ${borrowingToken.symbol}`
      );
    }

    setIsConfirming(true);

    const minAmount = BigInt(
      new BigNumber(borrowingToken.allocation.amount)
        .multipliedBy(10 ** loanTokenInChain.decimals)
        .toString()
    );
    const maxAmount = borrowingToken.allocation.maxAmount
      ? BigInt(
          new BigNumber(borrowingToken.allocation.maxAmount)
            .multipliedBy(10 ** loanTokenInChain.decimals)
            .toString()
        )
      : 0n;

    writeContract(
      {
        abi: TezoroLendingAgentAbi,
        address: activeAgent.address,
        functionName: "borrow",
        args: [
          loanTokenMarket.protocol,
          {
            loanToken: loanTokenMarket.loanAsset.token.address,
            collateralToken: loanTokenMarket.collateralAsset.token.address,
            marketAddress: loanTokenMarket.marketAddress,
            auxId: loanTokenMarket.auxId,
            flags: loanTokenMarket.flags,
          },
          minAmount,
          maxAmount,
        ],
      },
      {
        onSuccess: (hash) => {
          updateActiveAllocation((draft) => {
            draft.borrowing = {
              ...draft.borrowing,
              tx: hash,
            };
          });
        },
        onError: (error) => {
          console.error("Error borrowing tokens", error);
        },
        onSettled: () => {
          setIsConfirming(false);
        },
      }
    );
  };

  useEffect(() => {
    if (
      distributionReceipt?.status === "success" &&
      !activeAllocation?.distributionTxConfirmedAt
    ) {
      updateActiveAllocation((draft) => {
        draft.distributionTxConfirmedAt = Date.now();
      });
    }
  }, [
    activeAllocation?.distributionTxConfirmedAt,
    distributionReceipt,
    updateActiveAllocation,
  ]);

  useEffect(() => {
    if (
      borrowReceipt?.status === "success" &&
      !activeAllocation?.borrowing?.txConfirmedAt
    ) {
      updateActiveAllocation((draft) => {
        draft.borrowing = {
          ...draft.borrowing,
          txConfirmedAt: Date.now(),
        };
      });
    }
  }, [
    activeAllocation?.borrowing?.txConfirmedAt,
    borrowReceipt,
    updateActiveAllocation,
  ]);

  const activeAllocationTokens = useMemo(
    () =>
      activeAllocation?.tokens
        .map((token) => {
          const tokenWithBalance = tokensInChain?.find(
            (tokenWithBalance) => tokenWithBalance.symbol === token.symbol
          );
          if (!tokenWithBalance) {
            return null;
          }

          const { decimals: tokenDecimals } = tokenWithBalance;
          const blockchainAmount = new BigNumber(token.allocation.amount)
            .multipliedBy(10 ** tokenDecimals)
            .toString();

          return {
            ...tokenWithBalance,
            amount: {
              raw: blockchainAmount.toLowerCase(),
              normalized: token.allocation.amount,
            },
          };
        })
        .filter((token) => token !== null),
    [activeAllocation?.tokens, tokensInChain]
  );

  const [distributionPlan, setDistributionPlan] = useState<Market[]>();

  useEffect(() => {
    if (!currentChainInfo || !activeAllocation) return;

    const protocolsAvailableForAllocation = currentChainInfo?.protocols
      .filter(({ risk }) =>
        activeAllocation.riskLevel !== undefined
          ? risk <= activeAllocation.riskLevel
          : true
      )
      .map(({ code }) => code);

    if (activeAllocation?.borrowing?.token) {
      const borrowAsset = tokensInChain?.find(
        (token) =>
          token.symbol.toLowerCase() ===
          activeAllocation.borrowing?.token?.symbol.toLowerCase()
      );
      if (borrowAsset) {
        console.log("Borrow asset for allocation", borrowAsset);

        const collateralAssets = activeAllocationTokens?.map((token) => ({
          address: token.address,
          amount: token.amount.normalized,
        }));
        getBestBorrowMarkets(
          currentChainInfo.internalChainId ?? currentChainInfo.chain.id,
          [
            {
              address: borrowAsset.address,
              amount: activeAllocation.borrowing.token.allocation.amount,
            },
          ],
          collateralAssets,
          protocolsAvailableForAllocation
        ).then(({ borrowMarkets, earningMarkets }) => {
          setDistributionPlan([
            ...borrowMarkets.map((m) => ({
              ...m,
              collateralAsset: {
                ...m.collateralAsset,
                type: "collateral" as const,
              },
            })),
            ...earningMarkets.map((m) => ({
              ...m,
              collateralAsset: {
                ...m.collateralAsset,
                type: "yield" as const,
              },
            })),
          ]);
        });
      }
    } else {
      const tokensForAllocation = activeAllocationTokens?.map(
        ({ address }) => address
      );

      if (tokensForAllocation) {
        getBestSupplyMarkets(
          currentChainInfo.internalChainId ?? currentChainInfo.chain.id,
          tokensForAllocation,
          protocolsAvailableForAllocation,
          import.meta.env.DEV
        ).then(setDistributionPlan);
      }
    }
  }, [
    activeAllocation,
    activeAllocationTokens,
    currentChainInfo,
    tokensInChain,
  ]);

  console.log("Distribution plan", distributionPlan);

  const handleDistribute = () => {
    if (!activeAgent) return;
    if (!activeAllocationTokens) return;
    if (!distributionPlan) return;

    const tokensAddresses: Address[] = [];
    const protocols: number[] = [];
    const markets: MarketKey[] = [];
    const amounts: bigint[] = [];

    activeAllocationTokens.forEach(({ address, symbol, amount }) => {
      tokensAddresses.push(address);
      const market = distributionPlan.find(
        (m) => m.collateralAsset.token.symbol === symbol
      );
      if (!market) {
        throw new Error(
          `No market found for token ${symbol}. Available markets: ${distributionPlan
            .map((m) => m.collateralAsset.token.symbol)
            .join(", ")}`
        );
      }

      protocols.push(market.protocol);
      markets.push({
        loanToken: market.loanAsset.token.address,
        collateralToken: market.collateralAsset.token.address,
        marketAddress: market.marketAddress,
        auxId: market.auxId,
        flags: market.flags,
      });
      amounts.push(BigInt(amount.raw));

      return [tokensAddresses, protocols, markets, amounts] as const;
    });

    setIsConfirming(true);

    console.log("Distributing tokens...", {
      tokensAddresses,
      protocols,
      markets,
      amounts,
      activeAgent: activeAgent.address,
    });

    writeContract(
      {
        abi: TezoroLendingAgentAbi,
        address: activeAgent.address,
        functionName: "distribute",
        args: [tokensAddresses, protocols, markets, amounts],
      },
      {
        onSuccess: (hash) => {
          updateActiveAllocation((draft) => {
            draft.distributionTx = hash;
          });
        },
        onError: (error) => {
          console.error("Error distributing tokens", error);
        },
        onSettled: () => {
          setIsConfirming(false);
        },
      }
    );
  };

  useEffect(() => {
    if (
      (activeAllocation?.borrowing
        ? activeAllocation.borrowing.txConfirmedAt
        : activeAllocation?.distributionTxConfirmedAt) &&
      activeAgent?.address
    ) {
      refetchTokensBalances();
      onComplete?.(activeAgent.address);
    }
  }, [activeAgent, activeAllocation, onComplete, refetchTokensBalances]);

  const isAllAssetsAmountsPositive = useMemo(() => {
    if (!activeAllocationTokens) return false;
    return activeAllocationTokens.every((token) =>
      new BigNumber(token.amount.normalized).isGreaterThan(0)
    );
  }, [activeAllocationTokens]);

  const isBorrowTokenApproved = useMemo(() => {
    if (!activeAllocation?.borrowing?.token) return false;
    return isTokenApproved(activeAllocation.borrowing.token.symbol);
  }, [activeAllocation?.borrowing?.token, isTokenApproved]);

  return (
    <div className="flex flex-col gap-4 w-full flex-[1_1_0%] min-h-0">
      <div className="flex-[1_1_0%] overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x:hidden scrollbar-none">
          <div className="flex flex-col gap-2 min-[540px]:grid min-[540px]:grid-cols-2 min-[540px]:gap-3">
            <div
              className={cn(
                "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
                "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative self-start"
              )}
            >
              {activeAgent ? (
                <SuccessCheckIcon className="absolute top-[13.5px] right-[10px]" />
              ) : null}
              <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
                Deploy AI agent
              </div>
              <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                AI agent is a non-custodial smart contract that is owned only by
                you
              </div>
            </div>
            <div
              className={cn(
                "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
                "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative"
              )}
            >
              {activeAgent && !currentApproveCandidate ? (
                <SuccessCheckIcon className="absolute top-[13.5px] right-[10px]" />
              ) : null}
              <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
                Approve tokens
              </div>
              <ul className="text-[#6F6F6F] flex flex-col gap-1">
                {distributionPlan?.map(({ collateralAsset, protocol }) => {
                  const isApproved = isTokenApproved(
                    collateralAsset.token.symbol
                  );

                  const iconSymbol =
                    iconsMapping[collateralAsset.token.symbol.toLowerCase()] ??
                    collateralAsset.token.symbol;

                  const protocolInfo = currentChainInfo?.protocols.find(
                    (p) => p.code === protocol
                  );
                  if (!protocolInfo) {
                    return undefined;
                  }

                  const amount = activeAllocationTokens?.find(
                    (t) => collateralAsset.token.address === t.address
                  )?.amount?.normalized;

                  // const ProtocolIcon = protocolInfo.icon;

                  if (!amount || amount === "0") {
                    return null;
                  }

                  return (
                    <li
                      key={collateralAsset.token.symbol}
                      className="flex items-center gap-1"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          isApproved && "text-[#02BDA7]"
                        )}
                      >
                        <div>{amount}</div>
                        <div className="flex items-center gap-1">
                          <div className="shrink-0 w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 rounded-full flex items-center justify-center relative overflow-hidden">
                            <TokenIcon
                              symbol={iconSymbol}
                              variant="background"
                              className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5"
                              fallback={
                                <div className="w-5 h-5 bg-gray-200 flex justify-center items-center text-[8px]">
                                  {iconSymbol?.slice(0, 3)?.toUpperCase() ??
                                    "?"}
                                </div>
                              }
                            />
                          </div>
                          <div className="text-[14px] min-[540px]:text-[16px]">
                            {collateralAsset.token.symbol} (
                            {collateralAsset.type === "collateral"
                              ? "collateral"
                              : "yield"}
                            )
                          </div>
                        </div>
                      </div>
                      {/* <ArrowRightIcon className="shrink-0 w-4 h-4" />
                      <div className="relative pl-[18px] min-[540px]:pl-[24px] text-[14px] min-[540px]:text-[16px]">
                        <ProtocolIcon className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 absolute top-1/2 left-0 -translate-y-1/2" />
                        {protocolInfo.name}
                      </div> */}
                    </li>
                  );
                })}
              </ul>
              {/* {distributionPlan ? (
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  This is an initial allocation, the agent will continually
                  reallocate assets to maximize yield
                </div>
              ) : null} */}
              {activeAllocation?.borrowing?.token && (
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  <div
                    className={cn(
                      "flex items-center gap-2",

                      isBorrowTokenApproved && "text-[#02BDA7]"
                    )}
                  >
                    {/* <div>
                      {activeAllocation?.borrowing?.token.allocation.amount}
                    </div> */}
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 rounded-full flex items-center justify-center relative overflow-hidden">
                        <TokenIcon
                          symbol={activeAllocation.borrowing.token.symbol}
                          variant="background"
                          className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5"
                          fallback={
                            <div className="w-5 h-5 bg-gray-200 flex justify-center items-center text-[8px]">
                              {activeAllocation.borrowing.token.symbol
                                ?.slice(0, 3)
                                ?.toUpperCase() ?? "?"}
                            </div>
                          }
                        />
                      </div>
                      <div className="text-[14px] min-[540px]:text-[16px]">
                        {activeAllocation.borrowing.token.symbol} (borrow)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto shrink-0 flex flex-col gap-4">
        {activeAgent ? (
          <>
            <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px] break-all">
              <div className="flex items-center gap-1">
                <div>Agent:</div>
                <ExplorerLink
                  address={activeAgent.address}
                  className="underline break-all"
                />
              </div>
              <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                Deployed{" "}
                {format(
                  Number.parseInt(activeAgent.deploymentTimestamp) * 1000,
                  "MMMM dd, yyyy"
                )}
              </div>
            </div>

            {currentApproveCandidate ? (
              <>
                {currentApprovalHash ? (
                  <Button
                    className="flex items-center gap-2 justify-center"
                    isPositiveLoading
                  >
                    <LoaderCircleIcon className="inline w-4 h-4 animate-spin align-middle" />{" "}
                    Approving {currentApproveCandidate.symbol}...
                  </Button>
                ) : (
                  <Button onClick={handleApprove} disabled={isConfirming}>
                    {isConfirming
                      ? "Signing..."
                      : `Approve ${currentApproveCandidate.symbol}`}
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Distribution step - comes first */}
                {activeAllocation?.distributionTxConfirmedAt ? (
                  // After distribution is confirmed, show borrow step if borrowing exists
                  activeAllocation?.borrowing ? (
                    activeAllocation.borrowing.txConfirmedAt ? (
                      <div className="text-[#02BDA7] text-[14px] min-[540px]:text-[16px]">
                        Token borrowed successfully
                      </div>
                    ) : activeAllocation.borrowing.tx ? (
                      <Button
                        className="flex items-center gap-2 justify-center"
                        isPositiveLoading
                      >
                        <LoaderCircleIcon className="inline w-4 h-4 animate-spin align-middle" />{" "}
                        Borrowing...
                      </Button>
                    ) : (
                      <Button onClick={handleBorrow} disabled={isConfirming}>
                        {isConfirming ? "Signing..." : "Borrow"}
                      </Button>
                    )
                  ) : (
                    <div className="text-[#02BDA7] text-[14px] min-[540px]:text-[16px]">
                      Tokens distributed successfully
                    </div>
                  )
                ) : activeAllocation?.distributionTx ? (
                  <Button
                    className="flex items-center gap-2 justify-center"
                    isPositiveLoading
                  >
                    <LoaderCircleIcon className="inline w-4 h-4 animate-spin align-middle" />{" "}
                    Distributing...
                  </Button>
                ) : (
                  <Button onClick={handleDistribute} disabled={isConfirming}>
                    {isConfirming ? "Signing..." : "Distribute"}
                  </Button>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-[16px] max-[540px]:text-[14px] max-[391px]:text-[12px]">
              This is a beta version - it has not been security audited yet
            </div>
            {deployReceipt ? (
              <Button disabled>Loading...</Button>
            ) : agentDeployTxHash ? (
              <>
                {/* <div className="text-yellow-500 text-[14px] min-[540px]:text-[16px]"> */}
                {/* <LoaderCircleIcon className="inline w-4 h-4 animate-spin align-middle" />{" "}
                  Deploying...
                  <br /> */}
                {/* <span className="break-all">
                    {activeDeployment.agentDeployTx}
                  </span>
                </div> */}
                <Button
                  className="flex items-center gap-2 justify-center"
                  isPositiveLoading
                >
                  <LoaderCircleIcon className="inline w-4 h-4 animate-spin align-middle" />{" "}
                  Deploying...
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDeploy}
                disabled={
                  isConfirming ||
                  !chain ||
                  !activeAllocation ||
                  !isAllAssetsAmountsPositive
                }
              >
                {isConfirming ? "Signing..." : "Deploy"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
