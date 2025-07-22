import BigNumber from "bignumber.js";
import { PositionInfo } from "./types";
// import { create, all } from "mathjs";
import { getUSDPriceFromLlama } from "./clients/llama";
import { Market } from "./clients/tezoro-backend";
import { toMarketId } from "./utils/to-market-id";

// if (!all) throw new Error("Math.js library is not loaded correctly");

// const math = create(all, {
//   number: "BigNumber",
//   precision: 64,
// });

export const calculateTotalAccruedUsd = async (
  positionsInfo: readonly PositionInfo[],
  llamaChain: string
) => {
  let totalAccruedAccumulatedUSD = new BigNumber(0);

  for (const position of positionsInfo) {
    const {
      accumulatedAccruedInterest,
      currentMarketAccruedInterest,
      metadata: { token },
    } = position;

    const { price: usdPrice } = await getUSDPriceFromLlama(llamaChain, token);
    const totalAccruedInterest =
      accumulatedAccruedInterest + currentMarketAccruedInterest;
    const totalAccruedInterestAmount = new BigNumber(
      totalAccruedInterest?.toString() ?? "0"
    ).dividedBy(new BigNumber(10).pow(position.metadata.decimals));
    const totalAccruedInterestUsd =
      totalAccruedInterestAmount.multipliedBy(usdPrice);
    totalAccruedAccumulatedUSD = totalAccruedAccumulatedUSD.plus(
      totalAccruedInterestUsd
    );
  }
  return totalAccruedAccumulatedUSD;
};

export async function calculateTotalSuppliedUsd(
  positions: readonly PositionInfo[],
  llamaChain: string
) {
  let totalSuppliedAccumulatedUSD = new BigNumber(0);
  for (const position of positions) {
    const { supplied, metadata } = position;
    const suppliedBN = new BigNumber(supplied.toString()).dividedBy(
      new BigNumber(10).pow(metadata.decimals)
    );
    const { price: usdPrice } = await getUSDPriceFromLlama(
      llamaChain,
      metadata.token
    );
    const suppliedUsd = suppliedBN.multipliedBy(usdPrice);
    totalSuppliedAccumulatedUSD = totalSuppliedAccumulatedUSD.plus(suppliedUsd);
  }
  return totalSuppliedAccumulatedUSD;
}

// export function calculateAPY(rate: bigint, rateDecimals: number): BigNumber {
//   const rateStr = rate.toString();
//   const scaleStr = new BigNumber(10).pow(rateDecimals).toString();

//   const apr = math.bignumber(rateStr).div(math.bignumber(scaleStr));
//   const apy = math.exp(apr).minus(1); // exact e^r - 1

//   const apyBPS = apy.mul(10000); // convert to bps
//   const apyPercent = apyBPS.div(100); // convert to percent

//   return new BigNumber(apyPercent.toString());
// }

export async function calculateWeightedAPY(
  positions: readonly PositionInfo[],
  totalSuppliedUsd: BigNumber,
  llamaChain: string,
  chainMarkets: Market[]
) {
  if (totalSuppliedUsd.isZero()) return new BigNumber(0);

  let weightedSum = new BigNumber(0);
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    if (!position)
      throw new Error(`Supply rate for position ${i} is undefined`);
    const {
      metadata,
      supplied: balance,
      market: positionMarket,
      protocolCode,
    } = position;
    const targetMarket = chainMarkets.find(
      (market) =>
        toMarketId(market.protocol, {
          auxId: market.auxId,
          collateralToken: market.collateralAsset.token.address,
          flags: market.flags,
          loanToken: market.loanAsset.token.address,
          marketAddress: market.marketAddress,
        }) === toMarketId(protocolCode, positionMarket)
    );
    if (!targetMarket) {
      throw new Error(
        `Market not found for position ${i} with protocolCode ${protocolCode}. Try to found: ${JSON.stringify(
          positionMarket
        )}`
      );
    }

    const supplied = new BigNumber(balance.toString()).dividedBy(
      new BigNumber(10).pow(metadata.decimals)
    );
    const { price: usdPrice } = await getUSDPriceFromLlama(
      llamaChain,
      metadata.token
    );
    const suppliedUsd = supplied.multipliedBy(usdPrice);
    const suppliedUsdAPY = suppliedUsd.multipliedBy(
      targetMarket.collateralAsset.supplyRate
    );
    weightedSum = weightedSum.plus(suppliedUsdAPY);
  }
  const weightedAPY = weightedSum.dividedBy(totalSuppliedUsd);
  return weightedAPY;
}
