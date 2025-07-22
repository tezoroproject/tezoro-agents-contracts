import { Button } from "../../ui/button";
import { SuccessCheckIcon } from "../../ui/icons/success-check";
import { cn } from "../../utils/utils";
import { ButtonVariants } from "../../ui/button.types";
import { TokenIcon } from "@web3icons/react";
import { BORROW_ASSET_SYMBOL } from "../../constants";
import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { useBorrowableAmount } from "../../hooks/useBorrowableAmout";
import { useState } from "react";

type BorrowTabProps = {
  isBorrowError: boolean;
  // isCollateralError: boolean;
  // collaterals:
  //   | {
  //       symbol: string;
  //     }[]
  //   | null;
  // ltv: number;
  onNext: () => void;
  onSkip: () => void;
  setIsOneTimeLoanModalScreenOpen: (value: boolean) => void;
  setIsRegularLoanModalScreenOpen: (value: boolean) => void;
  // setIsCollateralModalScreenOpen: (value: boolean) => void;
};

export function BorrowTab({
  isBorrowError,
  // isCollateralError,
  // collaterals,
  // ltv,
  onNext,
  onSkip,
  setIsOneTimeLoanModalScreenOpen,
  setIsRegularLoanModalScreenOpen,
}: // setIsCollateralModalScreenOpen,
BorrowTabProps) {
  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();

  const borrowType = activeAllocation?.borrowing?.type;
  const borrowingToken = activeAllocation?.borrowing?.token;
  const allocation = borrowingToken?.allocation;

  const { borrowableAmount } = useBorrowableAmount();

  const [maxBorrowError, setMaxBorrowError] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto scrollbar-none">
        <div className="flex flex-col gap-2 min-[540px]:grid min-[540px]:grid-cols-2 min-[540px]:gap-3">
          <div
            className={cn(
              "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
              "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative cursor-pointer",
              borrowType === "oneTime" && "border-black",
              (isBorrowError || (maxBorrowError && borrowType === "oneTime")) &&
                "border-red-500"
            )}
            onClick={() => {
              setIsOneTimeLoanModalScreenOpen(true);
              setMaxBorrowError(false);
            }}
          >
            {borrowType === "oneTime" ? (
              <SuccessCheckIcon className="absolute top-[13.5px] right-[10px]" />
            ) : (
              <div
                className="absolute top-[13.5px] right-[10px] w-[18px] h-[18px] border border-black
                  rounded-full"
              />
            )}
            <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
              One-time loan
            </div>
            <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
              Agent will find the best credit rates across protocols based on
              your collateral, issue a one-time USDC loan, and autonomously
              avoid liquidation
            </div>
            {borrowingToken && borrowType === "oneTime" ? (
              <div className="flex items-center gap-1">
                <div className="text-[18px] pr-1">{allocation?.amount}</div>
                <div className="pt-[2px] flex items-center gap-1">
                  <div className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 rounded-full flex items-center justify-center relative overflow-hidden">
                    <TokenIcon
                      symbol={borrowingToken.symbol}
                      variant="background"
                      className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5"
                      fallback={
                        <div className="w-5 h-5 bg-gray-200 flex justify-center items-center text-[8px]">
                          {borrowingToken.symbol?.slice(0, 3)?.toUpperCase() ??
                            "?"}
                        </div>
                      }
                    />
                  </div>
                  <div className="text-[14px] min-[540px]:text-[16px]">
                    {borrowingToken.symbol}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
              "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative cursor-pointer",
              borrowType === "regular" && "border-black",
              (isBorrowError || (maxBorrowError && borrowType === "regular")) &&
                "border-red-500"
            )}
            onClick={() => {
              setIsRegularLoanModalScreenOpen(true);
              setMaxBorrowError(false);
            }}
          >
            {borrowType === "regular" ? (
              <SuccessCheckIcon className="absolute top-[13.5px] right-[10px]" />
            ) : (
              <div
                className="absolute top-[13.5px] right-[10px] w-[18px] h-[18px] border border-black
                  rounded-full"
              />
            )}
            <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
              Recurring loan
            </div>
            <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
              Agent will maintain your balance within the target range using
              your collateral and autonomously avoid liquidation
            </div>
            {borrowType === "regular" &&
            allocation?.amount !== undefined &&
            allocation.maxAmount !== undefined ? (
              <>
                <div className="mt-auto text-[14px] min-[540px]:text-[16px] font-medium pr-4 flex items-center flex-wrap">
                  {allocation?.amount} - {allocation?.maxAmount}
                  <div className="inline-flex items-center gap-1 pl-1 pt-[2px]">
                    <div className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 rounded-full flex items-center justify-center relative overflow-hidden">
                      <TokenIcon
                        symbol={BORROW_ASSET_SYMBOL}
                        variant="background"
                        className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5"
                        fallback={
                          <div className="w-5 h-5 bg-gray-200 flex justify-center items-center text-[8px]">
                            {BORROW_ASSET_SYMBOL?.slice(0, 3)?.toUpperCase() ??
                              "?"}
                          </div>
                        }
                      />
                    </div>
                    <div className="text-[14px] min-[540px]:text-[16px]">
                      {BORROW_ASSET_SYMBOL}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-auto shrink-0 pt-5">
        {maxBorrowError ? (
          <div className="text-red-500 text-sm leading-none">
            Amount cannot exceed your balance
          </div>
        ) : null}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => {
              if (
                activeAllocation?.borrowing?.token?.allocation.amount &&
                Number(activeAllocation?.borrowing?.token?.allocation.amount) >
                  (borrowableAmount ?? 0)
              ) {
                setMaxBorrowError(true);

                return;
              }

              onNext();
            }}
            type="button"
          >
            Next
          </Button>
          {borrowType ? (
            <Button
              onClick={() => {
                updateActiveAllocation((draft) => {
                  delete draft.borrowing;
                });

                setMaxBorrowError(false);
              }}
              type="button"
              variant={ButtonVariants.SECONDARY}
              className="shrink-[2]"
            >
              Clear
            </Button>
          ) : (
            <Button
              onClick={() => {
                onSkip();
                setMaxBorrowError(false);
              }}
              type="button"
              variant={ButtonVariants.SECONDARY}
              className="shrink-[2]"
            >
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
