import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { useEffect, useState } from "react";
import { iconsMapping } from "../../blockchain/mapping";
import { cn } from "../../utils/utils";
import { Asset } from "../Asset";
import { Button } from "../../ui/button";
import { useAccount } from "wagmi";
import { PlusIcon } from "../../ui/icons/plus";
import { useTezoro } from "../../hooks";
// import { useActiveAgent } from "../../hooks/useActiveAgent";
import BigNumber from "bignumber.js";

type AssetsTabProps = {
  setSelectToken: (token: string | null | undefined) => void;
  onNext: () => void;
  onConnectWallet: () => void;
};

export function AssetsTab({
  setSelectToken,
  onNext,
  onConnectWallet,
}: AssetsTabProps) {
  const { activeAllocation } = useActiveAllocation();

  const { address: accountAddress } = useAccount();
  const { tokensInChain } = useTezoro();
  // const activeAgent = useActiveAgent();

  const [isAllocationError, setIsAllocationError] = useState(false);

  const [needShake, setNeedShake] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleNewToken = () => {
    setSelectToken(null);
  };

  const handleNext = () => {
    if (!activeAllocation || !tokensInChain?.length) return;
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
      onNext();
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
        {accountAddress ? (
          <Button onClick={handleNext} type="button">
            Next
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
