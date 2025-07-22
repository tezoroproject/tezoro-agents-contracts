import { Button } from "../../ui/button";
import { useTezoro } from "../../hooks";
import { useState } from "react";
import article1 from "../../assets/article1.png";
import article2 from "../../assets/article2.png";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { chains } from "../../blockchain/config";
import { base } from "viem/chains";

const config = {
  loader: { load: ["input/tex", "output/chtml"] },
};

type PriorityTabProps = {
  onNext: () => void;
};

export function PriorityTab({ onNext }: PriorityTabProps) {
  const { currentChainInfo } = useTezoro();

  const [isArticleShown, setIsArticleShown] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto scrollbar-none">
        {isArticleShown ? (
          <MathJaxContext config={config}>
            <div className="flex flex-col gap-4">
              <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                Lending APR Forecast
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                Lending pool rates change quickly with market demand and shifts
                in liquidity. Forecasting these rates helps investors anticipate
                higher yields and reallocate assets in advance, instead of
                chasing past performance. This proactive strategy maximizes
                returns, reduces idle capital, and avoids frequent reallocations
                that incur transaction fees. Accurate rate forecasting is
                crucial for optimizing on-chain lending strategies.
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                All investment strategies rely on predictions – investors choose
                pools expecting favorable outcomes. The simplest method is to
                join the pool with the highest current APR, assuming it remains
                highest. While this can work sometimes, it often fails.
                Introducing AI models can improve forecast accuracy and yield
                better results.
              </div>
              <div className="max-w-[80%] min-[540px]:max-w-[60%] mx-auto">
                <img
                  src={article1}
                  alt="1"
                  className="w-full h-auto aspect-[382/377] block object-contain"
                />
              </div>
              <div className="pt-3" />
              <div className="mt-2 text-[16px] min-[540px]:text-[18px] font-medium">
                Prediction Methodology
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                We use an ensemble of models trained separately for each lending
                market. These models predict short-term APR changes across
                available lending pools, focusing on selecting the best option.
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                Models use historical subgraph data – APR trends, TVL,
                utilization, volatility, and other metrics. We regularly retrain
                them to adapt to market changes and maintain accuracy.
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                Our ensemble includes Gradient Boosting Regressors (GBR) for
                forecasting change magnitude and LightGBM classifiers for
                directional predictions (up, down, or flat). The classifiers
                help position capital early for favorable rate shifts. By
                combining regression estimates with directional signals, we
                improve allocation confidence and reduce variance.
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                Below you can see backtest simulation of AI powered allocation
                strategy compared to single protocols yields (using subgraph
                hourly snapshot data).
              </div>
              <div className="max-w-[80%] min-[540px]:max-w-[80%] mx-auto">
                <img
                  src={article2}
                  alt="2"
                  className="w-full h-auto aspect-[960/550] block object-contain"
                />
              </div>
              <div className="pt-3" />
              <div className="mt-2 text-[16px] min-[540px]:text-[18px] font-medium">
                Risk evaluation
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                Even pure lending faces risks like liquidity crises, sudden
                drops in utilization, protocol upgrades, or governance changes –
                any of which can affect yields and fund access.
              </div>
              <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                To manage these risks, we go beyond APR optimization by adding
                classifiers that detect anomalous patterns and estimate latent
                risk. This layered evaluation helps balance yield pursuit with
                risk avoidance. Our allocation logic penalizes pools with high
                yields but elevated risk, using learned indicators and
                volatility profiles.
              </div>
              <div className="pt-2" />
              <div className="mt-2 text-[14px] min-[540px]:text-[16px] font-medium">
                Value at Risk (VaR)
              </div>
              <div className="flex flex-col gap-2">
                <div className="py-2 overflow-hidden">
                  <MathJax>
                    {String.raw`\[\mathrm{VaR}_{\alpha}(X) = -\inf\{x \mid P(X \le x) > 1 - \alpha\}\]`}
                  </MathJax>
                </div>
                <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  We calculate VaR to understand the maximum expected APR drop
                  in a lending pool over a chosen time horizon (e.g. one day or
                  one week) at a given confidence level (usually 95% or 99%).
                </div>
                <ul className="pl-5 flex flex-col gap-2">
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    1. We build the empirical distribution of historical daily
                    APR changes for the pool.
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    2. For α = 0.95, we find the 5th percentile drop.
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    3. We report VaR₀.₉₅ as the absolute value of that
                    percentile.
                  </li>
                  <li className="pl-4 text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    Example: VaR₀.₉₅ = 2% per day means that, statistically, in
                    5% of days pool APR could drop at least 2%.
                  </li>
                </ul>
              </div>
              <div className="pt-2" />
              <div className="mt-2 text-[14px] min-[540px]:text-[16px] font-medium">
                Conditional Value at Risk (CVaR)
              </div>
              <div className="flex flex-col gap-2">
                <div className="py-2 overflow-hidden">
                  <MathJax>
                    {String.raw`\[\mathrm{CVaR}_{\alpha}(X) = E\bigl[X \mid X \le -\mathrm{VaR}_{\alpha}(X)\bigr]\]`}
                  </MathJax>
                </div>
                <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  We compute CVaR to quantify average APR drops in the worst
                  α-tail beyond VaR, giving a fuller picture of tail risk.
                </div>
                <ul className="pl-5 flex flex-col gap-2">
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    1. After VaR₀.₉₅ is determined, we select all days with APR
                    drops worse than that threshold.
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    2. Then we average those tail values.
                  </li>
                  <li className="pl-4 text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    Example: CVaR₀.₉₅ = 3% means that on average, in the worst
                    5% of days, APR drops at 3%.
                  </li>
                </ul>
              </div>
              <div className="pt-2" />
              <div className="mt-2 text-[14px] min-[540px]:text-[16px] font-medium">
                Utilization Volatility
              </div>
              <div className="flex flex-col gap-2">
                <div className="py-2 overflow-hidden">
                  <MathJax>
                    {String.raw`\[\sigma_u^2 = \mathrm{Var}\left(\Delta u\right)\]`}
                  </MathJax>
                </div>
                <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  We monitor how much the pool’s utilization ratio fluctuates
                  over time. High fluctuations can signal unstable liquidity and
                  sudden APR swings.
                </div>
                <ul className="pl-5 flex flex-col gap-2">
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    1. We record pool utilization daily for N days:
                    <div className="mt-1">
                      <MathJax inline>
                        {String.raw`\[ u_t = \frac{\text{total borrowed}}{\text{total supplied}} \]`}
                      </MathJax>
                    </div>
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    2. We compute utilization volatility σ_u as standard
                    deviation of daily utilization changes.
                  </li>
                  <li className="pl-4 text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    Usage: Pools with lower σ_u get priority in our allocations,
                    since they offer steadier utilization and more predictable
                    yields.
                  </li>
                </ul>
              </div>
              <div className="pt-2" />
              <div className="mt-2 text-[14px] min-[540px]:text-[16px] font-medium">
                Z-Score for Anomaly Detection
              </div>
              <div className="flex flex-col gap-2">
                <div className="py-2 overflow-hidden leading-none flex flex-col items-center">
                  <MathJax>
                    {String.raw`\[Z_t = \frac{x_t - \mu}{\sigma}\]`}
                  </MathJax>
                </div>
                <div className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                  We apply a rolling Z-Score to key metrics – TVL, APR,
                  utilization – to flag unusual events in real time.
                </div>
                <ul className="pl-5 flex flex-col gap-2">
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    1. For each metric x_t, we maintain a rolling mean μ and
                    rolling standard deviation σ over a chosen window (e.g. 7
                    days).
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    2. Each new observation yields corresponding value Z_t.
                  </li>
                  <li className="text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    3. If |Z_t| exceeds a threshold (e.g. 2 or 3), we trigger an
                    alert or automatically reduce exposure to that pool.
                  </li>
                  <li className="pl-4 text-[14px] min-[540px]:text-[16px] text-[#6f6f6f]">
                    Benefit: Early detection of on-chain stresses (liquidations
                    spikes, mass redemptions, protocol issues) so you can
                    rebalance or exit before large drawdowns.
                  </li>
                </ul>
              </div>
              <div className="mt-2 text-[14px] min-[540px]:text-[16px] text-[#6f6f6f] flex gap-1">
                <div className="text-[18px] min-[540px]:text-[20px] font-medium">
                  🕵️
                </div>
                <div className="pt-[2px]">
                  And a few more technologies that we prefer to keep secret.
                </div>
              </div>
            </div>
          </MathJaxContext>
        ) : (
          <>
            <ul className="flex flex-col gap-2 min-[540px]:grid min-[540px]:grid-cols-2 min-[540px]:gap-3">
              <li
                className="border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]
                    px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2"
                // px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 hover:shadow transition cursor-pointer"
                // onClick={() => {
                //   setIsArticleShown(true);
                // }}
              >
                <div className="flex items-center gap-2">
                  <div className="text-[18px] min-[540px]:text-[24px] font-medium leading-[27px]">
                    🤹
                  </div>
                  <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                    Yield Farming
                  </div>
                </div>
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  Agent monitors APY shifts across lending protocols and
                  autonomously rebalance assets to capture the best rates
                </div>
              </li>
              <li
                className="border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]
                    px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[18px] min-[540px]:text-[24px] font-medium leading-[27px]">
                    💰
                  </div>
                  <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                    Credit Management
                  </div>
                </div>
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  Agent finds the best loan terms, borrows and autonomously
                  manages the credit line to avoid liquidation
                </div>
              </li>
              <li
                className="border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]
                    px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[18px] min-[540px]:text-[24px] font-medium leading-[27px]">
                    🦑
                  </div>
                  <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                    Supported Protocols
                  </div>
                </div>
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  <ul>
                    {currentChainInfo ?? chains[base.id] ? (
                      <li className="mt-1 flex flex-wrap gap-1 text-[14px] min-[540px]:text-[16px]">
                        {(currentChainInfo ?? chains[base.id]).protocols.map(
                          ({ name, icon: Icon }, i) => (
                            <div
                              key={`adapter-${name}`}
                              className="relative pl-[22px]"
                            >
                              <Icon className="w-[18px] h-[18px] absolute top-1/2 left-0 -translate-y-1/2" />
                              {name}
                              {(currentChainInfo ?? chains[base.id]).protocols
                                .length -
                                1 ===
                              i
                                ? null
                                : ", "}
                            </div>
                          )
                        )}
                      </li>
                    ) : null}
                  </ul>
                </div>
              </li>
              <li
                className="border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]
                    px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[18px] min-[540px]:text-[24px] font-medium leading-[27px]">
                    🤝
                  </div>
                  <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                    Fees
                  </div>
                </div>
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  Agent covers all gas costs and charges a 0.9% annual
                  management fee
                </div>
              </li>
              <li
                className="border border-[#F4F4F4] rounded-[12px] py-[6px] min-[540px]:py-[10px]
                    px-[10px] min-[540px]:px-[14px] flex flex-col gap-1 min-[540px]:gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[18px] min-[540px]:text-[24px] font-medium leading-[27px]">
                    👀
                  </div>
                  <div className="text-[16px] min-[540px]:text-[18px] font-medium">
                    Dashboard
                  </div>
                </div>
                <div className="text-[#6F6F6F] text-[14px] min-[540px]:text-[16px]">
                  You see all your positions in a single dashboard and can
                  withdraw assets at any time
                </div>
              </li>
            </ul>
          </>
        )}
      </div>
      <div className="mt-auto pt-5 flex flex-col gap-3 shrink-0">
        {isArticleShown ? (
          <Button
            onClick={() => {
              setIsArticleShown(false);
            }}
            type="button"
          >
            Cool
          </Button>
        ) : (
          <Button onClick={onNext} type="button">
            Awesome
          </Button>
        )}
      </div>
    </div>
  );
}
