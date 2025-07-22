import { ChangeEvent, KeyboardEvent, useCallback } from "react";

type InputAmountProps = {
  amount: string;
  setAmount: (value: string) => void;
  maxDecimals?: number;
  isDisabled?: boolean;
};

export function InputAmount({
  amount,
  setAmount,
  isDisabled = false,
  maxDecimals = 6,
}: InputAmountProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(",", ".");

      if (value === "") {
        setAmount("");
        return;
      }

      if (!/^\d*(\.\d*)?$/.test(value)) return;

      if (value.startsWith(".")) {
        value = "0" + value;
      }

      const endsWithDot = value.endsWith(".");

      let [intPart = "", decPart = ""] = value.split(".");
      intPart = intPart.replace(/^0+(?=\d)/, "") || "0";

      if (decPart.length > maxDecimals) {
        decPart = decPart.slice(0, maxDecimals);
      }

      value = decPart ? `${intPart}.${decPart}` : intPart;

      if (endsWithDot && decPart === "") {
        value += ".";
      }

      setAmount(value);
    },
    [setAmount, maxDecimals]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleBlur = () => {
    if (amount.trim() === "") {
      setAmount("0");
    }
  };

  return (
    <input
      inputMode="decimal"
      type="text"
      name="amount"
      autoComplete="off"
      aria-label="Amount"
      value={amount}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      disabled={isDisabled}
      className="h-max pt-[32px] min-[360px]:pt-[24px] min-[410px]:pt-[18px] px-[13px] outline:none ring-0 outline-0 
        w-full disabled:cursor-not-allowed disabled:text-neutral-300 text-[24px]
        min-[360px]:text-[32px] min-[410px]:text-[40px] leading-none"
    />
  );
}
