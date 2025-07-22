import { MathJax, MathJaxContext } from "better-react-mathjax";
import util from "../../assets/util.png";
import impact from "../../assets/impact.png";
import impact2 from "../../assets/impact2.png";

const config = {
  loader: { load: ["input/tex", "output/chtml"] },
};

export function RiskManagementScreen() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">
      <MathJaxContext config={config}>
        <div className="flex flex-col gap-4">
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            1. Pools Utilization Rate
          </div>
          <ul className="pl-5 flex flex-col gap-2 list-disc">
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Pool utilization rate (or simply utilization) shows how much of
              the assets deposited to the pool are currently borrowed.
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              In order to balance supply with demand, most pools tight their
              APRs to this rate: the higher the utilization, the higher the
              rate:
            </li>
          </ul>
          <div className="max-w-[80%] min-[540px]:max-w-[60%] mx-auto">
            <img
              src={util}
              alt="1"
              className="w-full h-auto aspect-[512/179] block object-contain"
            />
          </div>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            2. Why Utilization Matters?
          </div>
          <div>
            <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              As a lender, we want two things:
            </div>
            <ul className="pl-5 flex flex-col gap-2 list-disc">
              <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                have our APR high: so{" "}
                <strong className="text-black">
                  we don’t want the utilization to drop
                </strong>
                .
              </li>
              <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                be able to withdraw our assets instantly when we need to:
                depending on the amount provided,{" "}
                <strong className="text-black">
                  we don’t want the utilization to be too high
                </strong>
              </li>
              <div className="py-2 overflow-hidden">
                <MathJax>
                  {String.raw`\[ U < 1 - \frac{\text{deposit amount}}{\text{TVL}} \]`}
                </MathJax>
              </div>
            </ul>
          </div>
          <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
            Thus, forecasting of utilization spikes is important part of a risk
            management framework.
          </div>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            3. What Can Impact Utilization?
          </div>
          <ul className="pl-5 flex flex-col gap-2 list-disc">
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              In normal situation, there is a market balance within a pool – and
              utilization rate tends to be close to the ‘optimal’ one.
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Utilization dynamic during sharp market dislocations is complex
              and usually has a massive exposure to the institutional factors
              like protocol-level or governance events.
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              However, some patterns could be quantified better and therefore
              could be included into the risk model.
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Such practices as looping and other complex constructions add more
              risk to the market and therefore more asymmetry towards the
              liquidation-aware behaviour of the investors during the high
              volatility periods.
            </li>
          </ul>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            4. Example of the Price Impact Reasoning
          </div>
          <ul className="pl-5 flex flex-col gap-2 list-disc">
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Consider loan position in USDT collateralized with WBTC while
              WBTC/USDT price <strong className="text-black">drops</strong>;
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Position becomes undercollateralized, so the borrower might:
              <ul className="pl-5 flex flex-col gap-1 list-disc">
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  add more collateral, possibly by borrowing it elsewhere.
                </li>
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  repay the loan (or part of it).
                </li>
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  if they fail to do any of it – then being liquidated.
                </li>
              </ul>
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              All these actions impact the utilization in pools where both
              tokens are lended: USDT utilization{" "}
              <strong className="text-black">decreases</strong>, WBTC
              utilization <strong className="text-black">increases</strong>.
            </li>
          </ul>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            5. Example of the Price Impact Reasoning
          </div>
          <div className="mx-auto flex gap-[2px] items-center justify-between">
            <div className="max-w-[70%] min-[540px]:max-w-[70%]">
              <img
                src={impact}
                alt="impact"
                className="w-full h-auto aspect-[664/290] block object-contain"
              />
            </div>
            <div className="max-w-[26%] min-[540px]:max-w-[26%]">
              <img
                src={impact2}
                alt="impact"
                className="w-full h-auto aspect-[290/290] block object-contain"
              />
            </div>
          </div>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            6. Forecasting: Features
          </div>
          <ul className="pl-5 flex flex-col gap-2 list-disc">
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Pools-wise local indicators (derived from TVL, APR, utilization
              itself):
              <ul className="pl-5 flex flex-col gap-1 list-disc">
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  realized volatility over the different time frames.
                </li>
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  Z-score over the different windows.
                </li>
                <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  distance from the MA / EMA / more complex moving averages.
                </li>
              </ul>
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Price dynamics features in terms of the volatility structure over
              the market.
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Protocols macroeconomic metrics (total volume borrowed, total
              deposits, etc): revealing deeper the structure of loans
              collateralization, volumes flows and other protocol-wise or
              token-wise patterns.
            </li>
          </ul>
          <div className="pt-3" />
          <div className="text-[18px] min-[540px]:text-[22px] font-medium">
            6. Forecasting: Models
          </div>
          <ul className="pl-5 flex flex-col gap-2 list-disc">
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Usually, ensemble models (such as LGBM or xgboost) are good for
              classification in a frameworks like this – they tend to
              demonstrate enough robustness, have enough flexibility (in terms
              of hyperparameters), work very fast and tend to be agnostic to
              amount of features (which should be selected carefully with
              cross-correlation pre-filtering).
            </li>
            <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
              Generally, we believe that finding patterns that precede drops
              should be made not only within ML framework, but also rely on the
              financial logic so that risk model becomes more transparent and
              interpretable.
            </li>
          </ul>
        </div>
      </MathJaxContext>
    </div>
  );
}
