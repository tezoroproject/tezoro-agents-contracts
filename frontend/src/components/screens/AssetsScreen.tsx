import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { iconsMapping } from "../../blockchain/mapping";
import { cn } from "../../utils/utils";
import { Asset } from "../Asset";
import { Button } from "../../ui/button";
import {
  useAccount,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { PlusIcon } from "../../ui/icons/plus";
import { useTezoro } from "../../hooks";
import BigNumber from "bignumber.js";
import { useActiveAgent } from "../../hooks/useActiveAgent";
import { Address, erc20Abi, Hash, parseEventLogs } from "viem";
import { LoaderCircleIcon } from "lucide-react";
import { useAggregatedTokensStore } from "../../state";
import { config } from "../../blockchain/config";
import { getBestSupplyMarkets, Market } from "../../clients/tezoro-backend";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import TezoroLendingAgentFactoryAbi from "../../blockchain/abis/TezoroLendingAgentFactory.abi";
import { INDEXER_DELAY_MS } from "../../constants";

type AssetsTabProps = {
  setSelectToken: (token: string | null | undefined) => void;
  onComplete: (agentAddress: Address) => void;
  onConnectWallet: () => void;
};

export function AssetsScreen({
  setSelectToken,
  onConnectWallet,
  onComplete,
}: AssetsTabProps) {
  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();

  const { chain, address: accountAddress } = useAccount({ config });
  const {
    tokensInChain,
    currentChainInfo,
    refetchTokensBalances,
    refetchAgents,
  } = useTezoro();

  const [isAllocationError, setIsAllocationError] = useState(false);

  const [needShake, setNeedShake] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [areAssetsAdded, setAreAssetsAdded] = useState(false);

  const [currentApprovalHash, setCurrentApprovalHash] = useState<Hash>();

  const [isConfirming, setIsConfirming] = useState(false);

  const [agentDeployTxHash, setAgentDeployTxHash] = useState<Hash>();

  const { writeContract } = useWriteContract({ config });

  const handleNewToken = () => {
    setSelectToken(null);
  };

  const handleNext = () => {
    if (!activeAllocation) return;
    const isAmountZero = activeAllocation.tokens.some(
      (token) => token.allocation.amount === "0"
    );
    const isAmountMoreThanBalance = activeAllocation.tokens.some((token) => {
      const tokenInChain = tokensInChain?.find(
        (t) => t.symbol === token.symbol
      );
      if (!tokenInChain) return false;
      const tokenBalance = tokenInChain.balance.normalized;
      return new BigNumber(token.allocation.amount).isGreaterThan(tokenBalance);
    });
    const isAllocationValid = !isAmountZero && !isAmountMoreThanBalance;
    if (isAllocationValid) {
      setAreAssetsAdded(true);
    } else {
      setIsAllocationError(true);
    }
  };

  useEffect(() => {
    if (needShake) {
      setIsShaking(true);

      setTimeout(() => {
        setIsShaking(false);
        setNeedShake(false);
      }, 300);
    }
  }, [needShake]);

  const activeAgent = useActiveAgent();

  const { data: allowances, refetch: refetchAllowances } = useReadContracts({
    contracts: activeAllocation?.tokens
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

  useEffect(() => {
    if (approveReceipt) {
      refetchAllowances();
      setCurrentApprovalHash(undefined);
    }
  }, [approveReceipt, refetchAllowances]);

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
      const { logs } = deployReceipt;
      const parsedEventLogs = parseEventLogs({
        abi: TezoroLendingAgentFactoryAbi,
        logs,
      });

      const deployedEvent = parsedEventLogs.find(
        (event) => event.eventName === "AgentCreated"
      );

      if (deployedEvent && deployedEvent.args?.agent) {
        // Here we should fetch new agent from chain
        refetchAgents();
      }
    }
  }, [activeAgent, deployReceipt, refetchAgents]);

  const isTokenApproved = useCallback(
    (symbol: string) => {
      if (!activeAllocation) return false;
      if (!tokensInChain) return false;

      const tokenInChainIndex = tokensInChain.findIndex(
        (t) => t.symbol === symbol
      );
      const tokenInActiveDeploymentIndex = activeAllocation.tokens.findIndex(
        (token) => token.symbol === symbol
      );
      if (
        tokenInChainIndex === undefined ||
        tokenInActiveDeploymentIndex === undefined
      )
        return false;

      const tokenInChain = tokensInChain?.[tokenInChainIndex];

      if (!tokenInChain) return false;

      const allowance = allowances?.[tokenInActiveDeploymentIndex];
      if (allowance === undefined) return false;

      const activeAllocationToken =
        activeAllocation.tokens[tokenInActiveDeploymentIndex];
      if (!activeAllocationToken) return false;

      const allocation = new BigNumber(activeAllocationToken.allocation.amount);
      const blockchainAmount = allocation.multipliedBy(
        10 ** tokenInChain.decimals
      );
      const allowanceAmount = new BigNumber(allowance.toString());
      const isApproved = allowanceAmount.gte(blockchainAmount);

      return isApproved;
    },
    [activeAllocation, allowances, tokensInChain]
  );

  const currentApproveCandidate = useMemo(
    () =>
      activeAllocation?.tokens.find((token) => {
        return !isTokenApproved(token.symbol);
      }),
    [activeAllocation?.tokens, isTokenApproved]
  );

  const { aggregatedTokens } = useAggregatedTokensStore();

  const approveToken = useCallback(
    (symbol: string) => {
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

      const tokenInActiveDeployment = activeAllocation.tokens.find(
        (token) => token.symbol === symbol
      );

      if (!tokenInActiveDeployment) return;

      const {
        allocation: { amount: amountAllocation },
      } = tokenInActiveDeployment;

      const blockchainAmount = new BigNumber(amountAllocation).multipliedBy(
        new BigNumber(10).pow(tokenInChain.decimals)
      );

      setIsConfirming(true);
      writeContract(
        {
          abi: erc20Abi,
          address: tokenInChain.address,
          functionName: "approve",
          args: [activeAgent.address, BigInt(blockchainAmount.toString())],
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

    const { symbol } = currentApproveCandidate;

    approveToken(symbol);
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

  const tokensForAllocation = useMemo(
    () => activeAllocationTokens?.map(({ address }) => address),
    [activeAllocationTokens]
  );

  const protocolsAvailableForAllocation = useMemo(
    () => currentChainInfo?.protocols.map(({ code }) => code),
    [currentChainInfo]
  );

  useEffect(() => {
    if (
      !currentChainInfo ||
      !tokensForAllocation ||
      !protocolsAvailableForAllocation
    )
      return;

    getBestSupplyMarkets(
      currentChainInfo.internalChainId ?? currentChainInfo.chain.id,
      tokensForAllocation,
      protocolsAvailableForAllocation
    ).then(setDistributionPlan);
  }, [
    activeAllocation,
    currentChainInfo,
    protocolsAvailableForAllocation,
    tokensForAllocation,
  ]);

  const handleDistribute = () => {
    if (!activeAgent) return;
    if (!activeAllocationTokens) return;
    if (!distributionPlan) return;

    const tokensAddresses = activeAllocationTokens.map(
      ({ address }) => address
    );

    const protocols = distributionPlan.map((market) => market.protocol);

    const markets = distributionPlan.map((market) => ({
      loanToken: market.loanAsset.token.address,
      collateralToken: market.collateralAsset.token.address,
      marketAddress: market.marketAddress,
      auxId: market.auxId,
      flags: market.flags,
    }));

    const tokenAmounts = activeAllocationTokens.map(({ amount }) =>
      BigInt(amount.raw)
    );

    // const args = [tokensAddresses, adapters, amounts] as const;

    setIsConfirming(true);

    console.log("Distributing tokens...");

    writeContract(
      {
        abi: TezoroLendingAgentAbi,
        address: activeAgent.address,
        functionName: "distribute",
        args: [tokensAddresses, protocols, markets, tokenAmounts],
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
      setTimeout(() => {
        refetchTokensBalances();
        onComplete?.(activeAgent.address);
      }, INDEXER_DELAY_MS);
    }
  }, [activeAgent, activeAllocation, onComplete, refetchTokensBalances]);

  return (
    <div className="flex flex-col gap-5 w-full flex-[1_1_0%] min-h-0">
      <div className="flex-[1_1_0%] overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x:hidden scrollbar-none">
          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-col gap-3">
              {activeAllocation?.tokens.map(({ symbol, allocation }, index) => {
                const iconSymbol = iconsMapping[symbol.toLowerCase()] ?? symbol;
                const tokenInChain = tokensInChain?.find(
                  (token) => token.symbol === symbol
                );

                return (
                  <Asset
                    symbol={symbol}
                    balance={tokenInChain?.balance.normalized}
                    iconSymbol={iconSymbol}
                    allocation={allocation}
                    isFirst={index === 0}
                    key={symbol}
                    onOpenSelect={(symbol) => {
                      if (accountAddress) {
                        setSelectToken(symbol);
                      } else {
                        setNeedShake(true);
                      }
                    }}
                    chainId={activeAllocation?.chainId}
                    isAllocationError={isAllocationError}
                    onChangeCb={() => {
                      setIsAllocationError(false);
                    }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              className={cn(
                "bg-white h-[103px] rounded-md border transition duration-300 flex items-center justify-center border-neutral-100 cursor-pointer",
                "hover:bg-neutral-50"
              )}
              onClick={() => {
                if (accountAddress) {
                  handleNewToken();
                } else {
                  setNeedShake(true);
                }
              }}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-auto shrink-0">
        {areAssetsAdded ? (
          currentApproveCandidate ? (
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
              {activeAllocation?.distributionTxConfirmedAt ? (
                <div className="text-[#02BDA7] text-[14px] min-[540px]:text-[16px]">
                  Tokens distributed successfully
                </div>
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
                  {isConfirming ? "Signing..." : "Launch AI agent"}
                </Button>
              )}
            </>
          )
        ) : accountAddress ? (
          <Button onClick={handleNext} type="button">
            Add Funds
          </Button>
        ) : (
          <Button
            onClick={onConnectWallet}
            type="button"
            className={cn(
              "transition-all duration-300",
              isShaking && "animate-shake"
            )}
          >
            Connect wallet
          </Button>
        )}
      </div>
    </div>
  );
}
