import { base } from "viem/chains";
import { chains } from "../../blockchain/config";
import { useTezoro } from "../../hooks";
import { useActiveAgent } from "../../hooks/useActiveAgent";
import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { Button } from "../../ui/button";
import { PolygonIcon } from "../../ui/icons/polygon";
import { cn } from "../../utils/utils";
import { useState, useRef, useEffect, FC, SVGProps } from "react";

type RiskTabProps = {
  onNext: () => void;
  onYieldBacktest: () => void;
  onRiskManagement: () => void;
};

export function RiskTab({
  onNext,
  onYieldBacktest,
  onRiskManagement,
}: RiskTabProps) {
  const { currentChainInfo } = useTezoro();

  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();

  const activeAgent = useActiveAgent();

  const [value, setValue] = useState(activeAllocation?.riskLevel ?? 50);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState(0);

  useEffect(() => {
    updateActiveAllocation((draft) => {
      draft.riskLevel = value;
    });
  }, [updateActiveAllocation, value]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const min = Number(slider.min);
    const max = Number(slider.max);
    const percent = (value - min) / (max - min);
    const sliderWidth = slider.offsetWidth;
    const offset = percent * sliderWidth;

    setPosition(offset);

    const bias = (percent - 0.5) * 16;
    setAdjustment(bias);
  }, [value]);

  const [protocolsByLevel, setProtocolsByLevel] = useState<Record<
    1 | 2 | 3,
    { name: string; icon: FC<SVGProps<SVGSVGElement>> }[]
  > | null>(null);

  useEffect(() => {
    let newProtocolsByLevel = protocolsByLevel;

    if (protocolsByLevel) {
      return;
    }

    (currentChainInfo ?? chains[base.id])?.protocols?.forEach(
      ({ name, icon, risk }) => {
        newProtocolsByLevel ??= { 1: [], 2: [], 3: [] };

        let level: 1 | 2 | 3 = 1;

        if (risk >= 50 && risk < 100) {
          level = 2;
        } else if (risk === 100) {
          level = 3;
        }

        newProtocolsByLevel[level].push({ name, icon });
      }
    );

    setProtocolsByLevel(newProtocolsByLevel);
  }, [currentChainInfo, currentChainInfo?.protocols, protocolsByLevel]);

  return (
    <div className="flex flex-col h-full overflow-y-hidden">
      <div className="overflow-y-auto scrollbar-none">
        <div className="flex flex-col gap-2 min-[540px]:grid min-[540px]:grid-cols-2 min-[540px]:gap-3">
          <div
            className={cn(
              "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
              "px-[10px] min-[540px]:px-[14px] flex flex-col gap-[10px] min-[540px]:col-span-2",
              activeAgent && "opacity-50 pointer-events-none"
            )}
          >
            <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
              Select Protocols to Aggregate
            </div>
            <div className="text-[#6F6F6F] px-5 text-[14px] min-[540px]:text-[16px]">
              <div className="w-full mt-4 relative">
                {position !== null ? (
                  <div
                    className="absolute -top-6 left-0 text-[12px] text-gray-700"
                    style={{
                      left: `${position}px`,
                      transform: `translateX(calc(-50% - ${adjustment}px))`,
                    }}
                  >
                    <div className="relative whitespace-nowrap bg-[#F5F5F5] rounded-full py-[2px] px-[6px]">
                      {value < 50
                        ? "Low risk"
                        : value >= 50 && value < 100
                        ? "Medium risk"
                        : "High risk"}
                      <PolygonIcon className="absolute top-full left-1/2 -translate-x-1/2" />
                    </div>
                  </div>
                ) : null}
                <input
                  ref={sliderRef}
                  type="range"
                  min={1}
                  max={100}
                  value={value}
                  onChange={(e) => {
                    if (!activeAgent) {
                      setValue(Number(e.target.value));
                    }
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer
                    bg-gradient-to-r from-black to-gray-200
                    accent-black
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:relative
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-black
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:border
                  [&::-webkit-slider-thumb]:border-white
                    [&::-webkit-slider-thumb]:outline
                  [&::-webkit-slider-thumb]:outline-white
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:bg-black
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border
                  [&::-moz-range-thumb]:border-white"
                  style={{
                    background: `linear-gradient(to right, black ${
                      ((value - 1) / 99) * 100
                    }%, #e5e7eb ${((value - 1) / 99) * 100}%)`,
                  }}
                />
              </div>
              <div className="mt-[10px] flex justify-between w-full">
                <div className="flex flex-col gap-[10px] w-max">
                  {protocolsByLevel?.[1]?.map(({ name, icon: Icon }) => (
                    <div
                      key={name}
                      className="flex items-center gap-1 text-[12px] min-[410px]:text-sm font-medium text-gray-700"
                    >
                      <Icon className="w-[16px] h-[16px]" />
                      <span className="whitespace-nowrap">{name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-[10px] w-max">
                  {protocolsByLevel?.[2]?.map(({ name, icon: Icon }) => (
                    <div
                      key={name}
                      className={cn(
                        "flex items-center gap-1 text-[12px] min-[410px]:text-sm font-medium text-gray-700",
                        value < 50 && "opacity-50"
                      )}
                    >
                      <Icon className="w-[16px] h-[16px]" />
                      <span className="whitespace-nowrap">{name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-[10px] w-max">
                  {protocolsByLevel?.[3]?.map(({ name, icon: Icon }) => (
                    <div
                      key={name}
                      className={cn(
                        "flex items-center gap-1 text-[12px] min-[410px]:text-sm font-medium text-gray-700",
                        value < 100 && "opacity-50"
                      )}
                    >
                      <Icon className="w-[16px] h-[16px]" />
                      <span className="whitespace-nowrap">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
              "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative cursor-pointer"
            )}
            onClick={onYieldBacktest}
          >
            <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
              Yield Farming
            </div>
            <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px] leading-[22.4px]">
              Agent monitors APY shifts across multiple protocols and
              autonomously rebalance assets to capture the best rates –
              delivering ~2x higher APY p.a. than the top-five protocols average
            </div>
          </div>
          <div
            className={cn(
              "border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]",
              "px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2 relative cursor-pointer"
            )}
            onClick={onRiskManagement}
          >
            <div className="text-[16px] min-[540px]:text-[18px] font-medium pr-4">
              AI-powered Risk Management
            </div>
            <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px] leading-[22.4px]">
              Agent uses a proprietary AI engine to analyze pools and predict
              critical events and will immediately withdraw your assets if
              something goes wrong
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto shrink-0 flex gap-2 pt-[15px]">
        <Button onClick={onNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}
