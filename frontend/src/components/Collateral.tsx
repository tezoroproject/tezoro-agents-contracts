import { useState, useRef, useEffect } from "react";
import { cn } from "../utils/utils";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { TokenIcon } from "@web3icons/react";
import { useActiveAllocation } from "../hooks/useActiveAllocation";

type CollateralProps = {
  ltv: number;
  collaterals:
    | {
        symbol: string;
      }[]
    | null;
  setCollaterals: (
    value:
      | {
          symbol: string;
        }[]
      | null
  ) => void;
  setLtv: (value: number) => void;
  onNext: () => void;
};

export function Collateral({
  ltv,
  collaterals,
  setCollaterals,
  setLtv,
  onNext,
}: CollateralProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState(0);
  const [adjustment, setAdjustment] = useState(0);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const min = Number(slider.min);
    const max = Number(slider.max);
    const percent = (ltv - min) / (max - min);
    const sliderWidth = slider.offsetWidth;
    const offset = percent * sliderWidth;

    setPosition(offset);

    const bias = (percent - 0.5) * 16;
    setAdjustment(bias);
  }, [ltv]);

  const [collateralBySymbol, setCollateralBySymbol] = useState<
    Record<string, boolean>
  >(collaterals?.reduce((acc, c) => ({ ...acc, [c.symbol]: true }), {}) ?? {});

  const { activeAllocation } = useActiveAllocation();

  const onSubmit = () => {
    setCollaterals(
      Object.keys(collateralBySymbol).reduce<typeof collaterals>((acc, c) => {
        if (collateralBySymbol[c]) {
          if (!acc) {
            acc = [];
          }

          acc?.push({
            symbol: c,
          });
        }

        return acc;
      }, null)
    );
    onNext();
  };

  return (
    <>
      <div className="overflow-y-auto scrollbar-none">
        <div
          className={cn(
            "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
            "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 min-[540px]:col-span-2"
          )}
        >
          <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
            Use as collateral
          </div>
          <div className="text-[14px] min-[540px]:text-[16px] flex flex-col gap-2">
            {activeAllocation?.tokens?.map((token) => (
              <div
                key={token.symbol}
                className="flex items-center gap-2 cursor-pointer w-max"
                onClick={() => {
                  setCollateralBySymbol((prev) => ({
                    ...prev,
                    [token.symbol]: !prev[token.symbol],
                  }));
                }}
              >
                <div>
                  <Checkbox
                    id={token.symbol}
                    checked={Boolean(collateralBySymbol[token.symbol])}
                    onChange={() => {
                      setCollateralBySymbol((prev) => ({
                        ...prev,
                        [token.symbol]: !prev[token.symbol],
                      }));
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5 rounded-full flex items-center justify-center relative overflow-hidden">
                      <TokenIcon
                        symbol={token.symbol}
                        variant="background"
                        className="w-4 h-4 min-[540px]:w-5 min-[540px]:h-5"
                        fallback={
                          <div className="w-5 h-5 bg-gray-200 flex justify-center items-center text-[8px]">
                            {token.symbol?.slice(0, 3)?.toUpperCase() ?? "?"}
                          </div>
                        }
                      />
                    </div>
                    <div className="text-[14px] min-[540px]:text-[16px]">
                      {token.symbol}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className={cn(
            "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px] mt-3",
            "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 min-[540px]:col-span-2"
          )}
        >
          <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
            LTV
          </div>
          <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px] px-3">
            <div className="w-full mt-8 relative">
              <div
                className="absolute -top-6 text-sm font-medium text-gray-700"
                style={{
                  left: `${position}px`,
                  transform: `translateX(calc(-50% - ${adjustment}px))`,
                }}
              >
                {ltv}%
              </div>
              <input
                ref={sliderRef}
                type="range"
                min={10}
                max={70}
                value={ltv}
                onChange={(e) => setLtv(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                   accent-black
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:bg-black
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-moz-range-thumb]:w-4
                   [&::-moz-range-thumb]:h-4
                   [&::-moz-range-thumb]:bg-black
                   [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:border-none"
              />
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mt-1 px-1">
              <span>10%</span>
              <span>70%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-5">
        <Button className="shrink-0" onClick={onSubmit}>
          Ok
        </Button>
      </div>
    </>
  );
}
