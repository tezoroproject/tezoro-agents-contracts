import weth from "../../assets/weth.png";
import usdt from "../../assets/usdt.png";
import usdc from "../../assets/usdc.png";
import wbtc from "../../assets/wbtc.png";
import wethM from "../../assets/weth-m.png";
import usdtM from "../../assets/usdt-m.png";
import usdcM from "../../assets/usdc-m.png";
import wbtcM from "../../assets/wbtc-m.png";

export function YieldBacktestScreen() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none">
      <div className="flex flex-col gap-4">
        <div className="text-[18px] min-[540px]:text-[22px] font-medium">
          Methodology
        </div>
        <div className="text-[16px] min-[540px]:text-[18px] font-medium">
          Data Sources
        </div>
        <ul className="pl-5 flex flex-col gap-2 list-disc">
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            We pull Subgraph data indexed on the Ethereum mainnet for the
            lending protocols with the highest TVL (subject to indexer
            availability).
          </li>
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            For each token, we select one market per protocol based on data
            completeness and volume.
          </li>
        </ul>
        <div className="text-[16px] min-[540px]:text-[18px] font-medium">
          Data Aggregation
        </div>
        <ul className="pl-5 flex flex-col gap-2 list-disc">
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            Raw data are consolidated into one‑hour intervals to standardize
            time slices across all markets.
          </li>
        </ul>
        <div className="text-[16px] min-[540px]:text-[18px] font-medium">
          Simulation
        </div>
        <ul className="pl-5 flex flex-col gap-2 list-disc">
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            An event‑driven simulation processes each hourly slice, applying our
            decision‑making logic to allocate assets dynamically.
          </li>
        </ul>
        <div className="text-[16px] min-[540px]:text-[18px] font-medium">
          Backtest Parameters
        </div>
        <ul className="pl-5 flex flex-col gap-2 list-disc">
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            The backtest measures only the pure return of the allocated asset.
          </li>
          <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            All rewards, incentives, and other external yield components are
            excluded from this analysis.
          </li>
        </ul>
        <div className="pt-3" />
        <div className="text-[18px] min-[540px]:text-[22px] font-medium">
          WETH
        </div>
        <div className="mx-auto flex gap-1 items-center justify-between">
          <div className="max-w-[60%] min-[540px]:max-w-[60%]">
            <img
              src={weth}
              alt="weth"
              className="w-full h-auto aspect-[589/350] block object-contain"
            />
          </div>
          <div className="max-w-[34%] min-[540px]:max-w-[34%]">
            <img
              src={wethM}
              alt="weth"
              className="w-full h-auto aspect-[268/271] block object-contain"
            />
          </div>
        </div>
        <div className="pt-3" />
        <div className="text-[18px] min-[540px]:text-[22px] font-medium">
          USDT
        </div>
        <div className="mx-auto flex gap-1 items-center justify-between">
          <div className="max-w-[60%] min-[540px]:max-w-[60%]">
            <img
              src={usdt}
              alt="usdt"
              className="w-full h-auto aspect-[589/350] block object-contain"
            />
          </div>
          <div className="max-w-[34%] min-[540px]:max-w-[34%]">
            <img
              src={usdtM}
              alt="usdt"
              className="w-full h-auto aspect-[274/271] block object-contain"
            />
          </div>
        </div>
        <div className="pt-3" />
        <div className="text-[18px] min-[540px]:text-[22px] font-medium">
          USDC
        </div>
        <div className="mx-auto flex gap-1 items-center justify-between">
          <div className="max-w-[60%] min-[540px]:max-w-[60%]">
            <img
              src={usdc}
              alt="usdc"
              className="w-full h-auto aspect-[589/350] block object-contain"
            />
          </div>
          <div className="max-w-[34%] min-[540px]:max-w-[34%]">
            <img
              src={usdcM}
              alt="usdc"
              className="w-full h-auto aspect-[268/271] block object-contain"
            />
          </div>
        </div>
        <div className="pt-3" />
        <div className="text-[18px] min-[540px]:text-[22px] font-medium">
          WBTC
        </div>
        <div className="mx-auto flex gap-1 items-center justify-between">
          <div className="max-w-[60%] min-[540px]:max-w-[60%]">
            <img
              src={wbtc}
              alt="wbtc"
              className="w-full h-auto aspect-[589/350] block object-contain"
            />
          </div>
          <div className="max-w-[34%] min-[540px]:max-w-[34%]">
            <img
              src={wbtcM}
              alt="wbtc"
              className="w-full h-auto aspect-[279/271] block object-contain"
            />
          </div>
        </div>
        <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
          * APR per annum is calculated on the largest time frame with all
          protocols considered available
        </div>
      </div>
    </div>
  );
}
