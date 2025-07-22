import { cn } from "../utils/utils";
import { useActiveAllocation } from "../hooks/useActiveAllocation";
// import { useAggregatedTokensStore } from "../state";
import { Chain } from "../blockchain/config";
import { useMemo } from "react";
import { MAX_AMOUNT_DECIMALS, MAX_BALANCE_DECIMALS } from "../constants";
import BigNumber from "bignumber.js";
import { useReadContract } from "wagmi";
import { useTezoro } from "../hooks";
import { erc20Abi } from "viem";
import { AssetInput } from "./AssetInput";

type AssetProps = {
  chainId: Chain["id"] | undefined;
  symbol: string;
  iconSymbol: string;
  allocation: {
    amount: string;
  };
  isFirst: boolean;
  balance?: BigNumber;
  isAllocationError: boolean;
  onChangeCb: () => void;
  onOpenSelect?: (symbol: string) => void;
};

export function Asset({
  // chainId,
  symbol,
  iconSymbol,
  allocation,
  isFirst,
  balance,
  isAllocationError,
  onChangeCb,
  onOpenSelect,
}: AssetProps) {
  const { updateActiveAllocation: updateActiveDeployment } =
    useActiveAllocation();
  // const { aggregatedTokens } = useAggregatedTokensStore();

  const { tokensInChain } = useTezoro();

  const tokenInChain = useMemo(
    () => tokensInChain?.find((token) => token.symbol === symbol),
    [tokensInChain, symbol]
  );
  const { data: tokenAllowance } = useReadContract({
    address: tokenInChain?.address,
    abi: erc20Abi,
    functionName: "allowance",
  });

  const isApproved = useMemo(() => {
    if (tokenInChain === undefined) return false;
    if (tokenAllowance === undefined) return false;
    const chainAmount = new BigNumber(allocation.amount).multipliedBy(
      10 ** tokenInChain.decimals
    );
    const allowance = new BigNumber(tokenAllowance.toString());
    return allowance.isGreaterThanOrEqualTo(chainAmount);
  }, [allocation, tokenInChain, tokenAllowance]);

  const handleChangeAmount = (symbol: string, value: string) => {
    onChangeCb();

    if (isApproved) return;
    updateActiveDeployment((draft) => {
      const activeToken = draft.tokens.find((t) => t.symbol === symbol);
      if (activeToken) {
        activeToken.allocation.amount = value;
      }
    });
  };

  const handleRemoveToken = (symbol: string) => {
    updateActiveDeployment((draft) => {
      const tokenIndex = draft.tokens.findIndex((t) => t.symbol === symbol);
      if (tokenIndex !== -1) {
        draft.tokens.splice(tokenIndex, 1);
      }
    });
  };

  // const tokenInfo = useMemo(
  //   () => aggregatedTokens?.find((token) => token.symbol === symbol),
  //   [aggregatedTokens, symbol]
  // );

  // const tokenInChain = useMemo(
  //   () => tokenInfo?.chains.find((token) => token.chainId === chainId),
  //   [tokenInfo, chainId]
  // );

  const isZeroAmount = useMemo(
    () => Number(allocation.amount) === 0,
    [allocation]
  );

  const isMoreThanBalance = useMemo(() => {
    if (!balance) return false;
    const amount = new BigNumber(allocation.amount);
    return amount.isGreaterThan(balance);
  }, [allocation, balance]);

  return (
    <AssetInput
      key={symbol}
      symbol={symbol}
      iconSymbol={iconSymbol}
      amount={allocation.amount}
      isDisabled={isApproved}
      error={
        isZeroAmount && isAllocationError
          ? "Enter amount to continue"
          : isMoreThanBalance && isAllocationError
          ? "Amount cannot exceed your balance"
          : ""
      }
      isRemovable={!isFirst}
      handleChangeAmount={handleChangeAmount}
      renderCaption={
        balance
          ? () => (
              <span
                onClick={() =>
                  handleChangeAmount(
                    symbol,
                    balance
                      .dp(MAX_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
                      .toString()
                  )
                }
                className={cn("cursor-pointer text-[#6f6f6f]", {
                  "cursor-not-allowed": isApproved,
                })}
              >
                {balance
                  .dp(MAX_BALANCE_DECIMALS, BigNumber.ROUND_FLOOR)
                  .toString()}
                <span className="hidden min-[410px]:inline"> available</span>
              </span>
            )
          : null
      }
      onTokenClick={onOpenSelect}
      handleRemoveToken={handleRemoveToken}
    />
  );
}
