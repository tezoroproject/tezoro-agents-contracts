import { useEffect, useRef, useState } from "react";
import { AssetInput } from "./AssetInput";
import { Button } from "../ui/button";
import { BORROW_ASSET_SYMBOL } from "../constants";
import { useActiveAllocation } from "../hooks/useActiveAllocation";
import { useBorrowableAmount } from "../hooks/useBorrowableAmout";

type OneTimeLoanProps = {
  clearError: () => void;
  onSubmit: () => void;
};

export function OneTimeLoan({ clearError, onSubmit }: OneTimeLoanProps) {
  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();

  const initialAmount = activeAllocation?.borrowing?.token?.allocation.amount;
  const [amount, setAmount] = useState<string>(initialAmount?.toString() ?? "");

  const { borrowableAmount } = useBorrowableAmount();

  const handleSubmit = () => {
    if (Number(amount) && Number(amount) > Number(borrowableAmount)) {
      return;
    } else if (Number(amount)) {
      updateActiveAllocation((draft) => {
        if (!draft.borrowing) {
          draft.borrowing = {
            type: "oneTime",
            token: {
              symbol: BORROW_ASSET_SYMBOL,
              allocation: {
                amount: amount.toString(),
              },
            },
          };
        } else {
          draft.borrowing.type = "oneTime";
          draft.borrowing.token = {
            symbol: BORROW_ASSET_SYMBOL,
            allocation: {
              amount: amount.toString(),
            },
          };
        }
      });

      clearError();
    }

    onSubmit();
  };

  const isBorrowableAmountCheckedRef = useRef(false);

  useEffect(() => {
    if (!borrowableAmount) {
      return;
    }

    if (isBorrowableAmountCheckedRef.current) {
      return;
    }

    isBorrowableAmountCheckedRef.current = true;

    if (borrowableAmount && Number(amount) > Math.floor(borrowableAmount)) {
      setAmount(Math.floor(borrowableAmount).toString());
    }
  }, [amount, borrowableAmount]);

  return (
    <>
      {borrowableAmount !== undefined && (
        <div className="text-sm text-muted-foreground mb-2">
          You can borrow up to{" "}
          <span
            className="font-semibold cursor-pointer"
            onClick={() => {
              setAmount(Math.floor(borrowableAmount).toString());
            }}
          >
            {Math.floor(borrowableAmount).toString()} {BORROW_ASSET_SYMBOL}
          </span>
        </div>
      )}
      <AssetInput
        symbol={BORROW_ASSET_SYMBOL}
        iconSymbol={BORROW_ASSET_SYMBOL}
        amount={amount}
        handleChangeAmount={(_, value) => {
          setAmount(value);
        }}
        // isDisabled={Number(amount) > Number(borrowableAmount)}
        error={
          Number(amount) > Number(borrowableAmount)
            ? "Amount cannot exceed your balance"
            : ""
        }
      />
      <Button className="mt-auto" onClick={handleSubmit}>
        Ok
      </Button>
    </>
  );
}
