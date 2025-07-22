import { useState, useRef, useEffect } from "react";
import { cn } from "../utils/utils";
import { Button } from "../ui/button";
import { TokenIcon } from "@web3icons/react";
import { BORROW_ASSET_SYMBOL } from "../constants";
import { useActiveAllocation } from "../hooks/useActiveAllocation";
import { useBorrowableAmount } from "../hooks/useBorrowableAmout";

type RegularLoanProps = {
  clearError: () => void;
  onSubmit: () => void;
};

const GAP = import.meta.env.DEV ? 1 : 500;
const INITIAL_MIN = import.meta.env.DEV ? "1" : "1000";
const INITIAL_MAX = import.meta.env.DEV ? "2" : "3000";
const STEP = import.meta.env.DEV ? 1 : 100;

const MIN = 0;
const MAX = 10000;
const MIN_GAP = GAP;

export function RegularLoan({ clearError, onSubmit }: RegularLoanProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();

  const { borrowableAmount } = useBorrowableAmount();

  const initialMin = Number.parseFloat(
    activeAllocation?.borrowing?.token?.allocation.amount ?? INITIAL_MIN
  );

  const actualInitialMin = initialMin >= GAP ? initialMin : GAP;

  const initialMax = Number.parseFloat(
    activeAllocation?.borrowing?.token?.allocation.maxAmount ?? INITIAL_MAX
  );

  const [minVal, setMinVal] = useState(actualInitialMin);
  const [maxVal, setMaxVal] = useState(initialMax);
  const [minPos, setMinPos] = useState(0);
  const [maxPos, setMaxPos] = useState(0);
  // const [minBias, setMinBias] = useState(0);
  // const [maxBias, setMaxBias] = useState(0);

  const updatePosition = (
    value: number,
    setPosition: (v: number) => void
    // setBias: (v: number) => void
  ) => {
    const track = trackRef.current;
    if (!track) return;
    const percent = (value - MIN) / (MAX - MIN);
    const width = track.offsetWidth;
    const pos = percent * width;
    setPosition(pos);
    // const bias = (percent - 0.5) * 16;
    // setBias(bias);
  };

  useEffect(() => {
    updatePosition(minVal, setMinPos);
    updatePosition(maxVal, setMaxPos);
  }, [minVal, maxVal]);

  const handleSubmit = () => {
    updateActiveAllocation((draft) => {
      if (draft?.borrowing) {
        draft.borrowing.type = "regular";
        const allocation = draft.borrowing.token?.allocation;
        if (allocation) {
          allocation.amount = minVal.toString();
          allocation.maxAmount = maxVal.toString();
        }
      } else {
        draft.borrowing = {
          type: "regular",
          token: {
            symbol: BORROW_ASSET_SYMBOL,
            allocation: {
              amount: minVal.toString(),
              maxAmount: maxVal.toString(),
            },
          },
        };
      }
    });

    clearError();

    onSubmit();
  };

  return (
    <>
      {borrowableAmount !== undefined && (
        <div className="text-sm text-muted-foreground mb-2">
          You can borrow up to{" "}
          <span className="font-semibold cursor-pointer">
            {Math.floor(borrowableAmount).toString()} {BORROW_ASSET_SYMBOL}
          </span>
        </div>
      )}
      <div
        className={cn(
          "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px] w-full",
          "px-[10px] min-[540px]:px-[14px] flex flex-col relative self-start col-span-2"
        )}
      >
        <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4 flex items-center flex-wrap">
          Keep my balance between
        </div>
        <div className="mt-[27px] flex justify-between items-center">
          <div className="text-3xl min-[540px]:text-[40px]">
            {minVal} - {maxVal}
          </div>
          <div className="inline-flex items-center gap-1 pl-1 pt-[2px]">
            <div className="w-4 h-4 min-[540px]:w-6 min-[540px]:h-6 rounded-full flex items-center justify-center relative overflow-hidden">
              <TokenIcon
                symbol={BORROW_ASSET_SYMBOL}
                variant="background"
                className="w-4 h-4 min-[540px]:w-6 min-[540px]:h-6"
                fallback={
                  <div className="w-6 h-6 bg-gray-200 flex justify-center items-center text-[8px]">
                    {BORROW_ASSET_SYMBOL?.slice(0, 3)?.toUpperCase() ?? "?"}
                  </div>
                }
              />
            </div>
            <div className="text-[14px] min-[540px]:text-[18px]">
              {BORROW_ASSET_SYMBOL}
            </div>
          </div>
        </div>
        <div className="flex flex-col relative mt-8 min-[540px]:mt-[17px]">
          <div className="relative h-2 bg-gray-200 rounded-lg" ref={trackRef}>
            <div
              className="absolute h-2 bg-black rounded"
              style={{
                left: `${minPos}px`,
                width: `${maxPos - minPos}px`,
              }}
            />
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={minVal}
            onChange={(e) => {
              const newValue = Math.min(
                Number(e.target.value),
                maxVal - MIN_GAP
              );

              if (newValue >= GAP) {
                setMinVal(Math.min(Number(e.target.value), maxVal - MIN_GAP));
              }
            }}
            className="w-full h-2 appearance-none bg-transparent
           [&::-webkit-slider-thumb]:block
           [&::-webkit-slider-thumb]:relative
           [&::-webkit-slider-thumb]:-translate-y-1/2
           [&::-webkit-slider-thumb]:w-4
           [&::-webkit-slider-thumb]:h-4
           [&::-webkit-slider-thumb]:bg-black
           [&::-webkit-slider-thumb]:rounded-full
           [&::-webkit-slider-thumb]:appearance-none
           [&::-webkit-slider-thumb]:cursor-pointer
           [&::-webkit-slider-thumb]:border
          [&::-webkit-slider-thumb]:border-white
           [&::-moz-range-thumb]:cursor-pointer
           [&::-moz-range-thumb]:border
          [&::-moz-range-thumb]:border-white"
          />
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={maxVal}
            onChange={(e) =>
              setMaxVal(Math.max(Number(e.target.value), minVal + MIN_GAP))
            }
            className="w-full h-2 appearance-none bg-transparent
           [&::-webkit-slider-thumb]:block
           [&::-webkit-slider-thumb]:relative
           [&::-webkit-slider-thumb]:-translate-y-full
           [&::-webkit-slider-thumb]:w-4
           [&::-webkit-slider-thumb]:h-4
           [&::-webkit-slider-thumb]:bg-black
           [&::-webkit-slider-thumb]:rounded-full
           [&::-webkit-slider-thumb]:appearance-none
           [&::-webkit-slider-thumb]:cursor-pointer
           [&::-webkit-slider-thumb]:border
          [&::-webkit-slider-thumb]:border-white
           [&::-moz-range-thumb]:cursor-pointer
           [&::-moz-range-thumb]:border
          [&::-moz-range-thumb]:border-white"
          />
        </div>
      </div>
      <Button className="mt-auto" onClick={handleSubmit}>
        Ok
      </Button>
    </>
  );
}
