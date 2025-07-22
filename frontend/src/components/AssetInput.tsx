import { ReactNode } from "react";
import { MAX_AMOUNT_DECIMALS } from "../constants";
import { InputAmount } from "./InputAmount";
import { cn } from "../utils/utils";
import { TokenIcon } from "@web3icons/react";
import { ChevronDown, XIcon } from "lucide-react";

type AssetInputProps = {
  symbol: string;
  iconSymbol: string;
  amount: string;
  isDisabled?: boolean;
  error?: string;
  isRemovable?: boolean;
  handleChangeAmount: (symbol: string, value: string) => void;
  renderCaption?: (() => ReactNode) | null;
  onTokenClick?: (symbol: string) => void;
  handleRemoveToken?: (symbol: string) => void;
};

export function AssetInput({
  symbol,
  iconSymbol,
  amount,
  isDisabled,
  error,
  isRemovable,
  handleChangeAmount,
  renderCaption,
  onTokenClick,
  handleRemoveToken,
}: AssetInputProps) {
  return (
    <div
      className="relative bg-white text-lg rounded-lg border transition duration-300 flex justify-between
        border-neutral-100 pr-2 h-[100px] hover:bg-neutral-50 group"
    >
      <div className="w-full flex-1 relative">
        <InputAmount
          amount={amount}
          setAmount={(value) => handleChangeAmount(symbol, value)}
          maxDecimals={MAX_AMOUNT_DECIMALS}
          isDisabled={isDisabled}
        />
        <div className="absolute bottom-[10px] left-[13px] text-[16px] max-[540px]:text-[14px] leading-none">
          {renderCaption ? renderCaption() : null}
        </div>
      </div>
      {error ? (
        <div className="text-red-500 absolute bottom-[10px] right-3 text-[11px] min-[410px]:text-sm leading-none">
          {error}
        </div>
      ) : null}
      <button
        className={cn(
          "bg-neutral-100 rounded-full pl-[5px] pr-[9px] py-[5px] flex items-center gap-1 cursor-pointer group-hover:bg-white transition",
          "h-max self-center",
          "disabled:hover:bg-neutral-100 disabled:cursor-not-allowed",
          !onTokenClick && "pr-3"
        )}
        type="button"
        disabled={isDisabled}
        onClick={() => onTokenClick?.(symbol)}
      >
        <div className="flex items-center gap-2 text-[18px] max-[540px]:text-[16px] max-[410px]:text-[14px]">
          <div className="w-6 h-6 rounded-full flex items-center justify-center relative overflow-hidden">
            <TokenIcon
              symbol={iconSymbol}
              variant="background"
              fallback={
                <div className="w-6 h-6 bg-gray-200 flex justify-center items-center text-[8px]">
                  {iconSymbol?.slice(0, 3)?.toUpperCase() ?? "?"}
                </div>
              }
            />
          </div>
          {symbol}
        </div>
        {onTokenClick ? <ChevronDown className="w-5" /> : null}
      </button>
      {isRemovable && (
        <button
          className={cn(
            "absolute -top-2 right-0 w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 transition cursor-pointer",
            "disabled:hover:bg-neutral-100 disabled:cursor-not-allowed"
          )}
          type="button"
          disabled={isDisabled}
          onClick={() => handleRemoveToken?.(symbol)}
        >
          <XIcon className="w-8/12 h-8/12 text-neutral-500" />
        </button>
      )}
    </div>
  );
}
