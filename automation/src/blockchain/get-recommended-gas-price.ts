import { Block, PublicClient, Transaction } from "viem";

export interface GasPriceStats {
  minGwei: bigint;
  medianGwei: bigint;
  maxGwei: bigint;
  suggestedMaxFeePerGas: bigint;
  suggestedPriorityFeePerGas: bigint;
  txCount: number;
  avgGasUsedRatio: number;
}

export const DEFAULT_BUFFER_MULTIPLIER = 1.2;
export const MAX_GAS_MULTIPLIER = 3n;

const GWEI = 10n ** 9n;

/** Converts wei to gwei (rounded down). */
const weiToGwei = (wei: bigint): bigint => wei / GWEI;

/** Median of a **sorted** bigint array. */
const median = (arr: bigint[]): bigint => {
  const mid = arr.length >>> 1;

  const midValue = arr[mid];
  if (midValue === undefined) {
    throw new Error("Array is empty, cannot calculate median.");
  }
  const prevValue = arr[mid - 1];
  if (prevValue === undefined) {
    return midValue; // Only one element, return it
  }
  return arr.length & 1 ? midValue : (prevValue + midValue) / 2n;
};

/** Percentile (`0 ≤ p ≤ 1`) of a **sorted** bigint array. */
const percentile = (arr: bigint[], p: number): bigint => {
  const value = arr[Math.min(Math.floor(arr.length * p), arr.length - 1)];
  if (value === undefined) {
    throw new Error("Array is empty, cannot calculate percentile.");
  }
  return value;
};

/**
 * Collect blocks back from the tip until `minTxCount`
 * transactions gathered or `maxBlocks` exhausted.
 */
export async function getAdaptiveBlocks(
  client: PublicClient,
  {
    minTxCount = 1_000,
    maxBlocks = 50,
  }: { minTxCount?: number; maxBlocks?: number } = {}
): Promise<Block<bigint, true>[]> {
  const latest = await client.getBlockNumber();
  const blocks: Block<bigint, true>[] = [];

  let txs = 0;
  for (let i = 0; i < maxBlocks && txs < minTxCount; i++) {
    const block = await client.getBlock({
      blockNumber: latest - BigInt(i),
      includeTransactions: true,
    });
    blocks.push(block);
    txs += block.transactions.length;
  }
  return blocks;
}

interface AnalysisResult {
  heavyTxPrices: bigint[];
  gasRatios: number[];
  txGasLimits: bigint[];
  priorityFees: bigint[];
}

function analyzeBlocks(
  blocks: Block<bigint, true>[],
  { minGasUsed }: { minGasUsed: bigint }
): AnalysisResult {
  const result: AnalysisResult = {
    heavyTxPrices: [],
    gasRatios: [],
    txGasLimits: [],
    priorityFees: [],
  };

  for (const block of blocks) {
    const gasUsed = block.gasUsed ?? 0n;
    const gasLimit = block.gasLimit ?? 1n;
    result.gasRatios.push(Number(gasUsed) / Number(gasLimit));

    const base = block.baseFeePerGas ?? 0n;

    for (const tx of block.transactions as Transaction[]) {
      const gas = tx.gas ?? 0n;
      const price = tx.maxFeePerGas ?? tx.gasPrice ?? 0n;
      if (price === 0n) continue;

      result.txGasLimits.push(gas);

      if ("maxPriorityFeePerGas" in tx && tx.maxPriorityFeePerGas) {
        // EIP-1559 tx: real priority fee = min(maxPrio, maxFee – base)
        const prio =
          tx.maxPriorityFeePerGas < price - base
            ? tx.maxPriorityFeePerGas
            : price - base;
        if (prio > 0n) result.priorityFees.push(prio);
      }

      if (gas > minGasUsed) result.heavyTxPrices.push(price);
    }
  }
  return result;
}

/**
 * Calculates gas-price recommendations from recent blocks.
 */
export async function getRecommendedGasPrice(
  blocks: Block<bigint, true>[],
  {
    minGasUsed,
    buffer = DEFAULT_BUFFER_MULTIPLIER,
    client,
  }: {
    minGasUsed: bigint;
    buffer?: number;
    client?: PublicClient;
  }
): Promise<GasPriceStats | null> {
  const { heavyTxPrices, gasRatios, priorityFees } = analyzeBlocks(blocks, {
    minGasUsed,
  });

  if (!heavyTxPrices.length) {
    if (!client) return null;
    const network = await client.getGasPrice();
    return {
      minGwei: weiToGwei(network),
      medianGwei: weiToGwei(network),
      maxGwei: weiToGwei(network),
      suggestedMaxFeePerGas: network,
      suggestedPriorityFeePerGas: network / 10n,
      txCount: 0,
      avgGasUsedRatio: 0,
    };
  }

  heavyTxPrices.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));

  const med = median(heavyTxPrices);

  // --- buffer without BigInt→Number precision loss ---
  const bufMul = BigInt(Math.round(buffer * 1_000));
  let suggestedMax = (med * bufMul + 999n) / 1_000n; // ceil div
  const hardCap = med * MAX_GAS_MULTIPLIER;
  if (suggestedMax > hardCap) suggestedMax = hardCap;

  const dynMin = percentile(heavyTxPrices, 0.05); // 5-percentile floor
  if (suggestedMax < dynMin) suggestedMax = dynMin;

  if (suggestedMax === 0n && client) suggestedMax = await client.getGasPrice();

  let suggestedPrio: bigint;
  if (priorityFees.length) {
    priorityFees.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    suggestedPrio = median(priorityFees);
  } else {
    suggestedPrio = suggestedMax / 10n;
  }
  if (suggestedPrio > suggestedMax) suggestedPrio = suggestedMax;

  const avgRatio = gasRatios.reduce((s, r) => s + r, 0) / gasRatios.length;

  const [firstHeavyTx] = heavyTxPrices;

  if (!firstHeavyTx) {
    throw new Error("No heavy transactions found.");
  }
  const lastHeavyTx = heavyTxPrices[heavyTxPrices.length - 1];
  if (!lastHeavyTx) {
    throw new Error("No last heavy transaction found.");
  }
  return {
    minGwei: weiToGwei(firstHeavyTx),
    medianGwei: weiToGwei(med),
    maxGwei: weiToGwei(lastHeavyTx),
    suggestedMaxFeePerGas: suggestedMax,
    suggestedPriorityFeePerGas: suggestedPrio,
    txCount: heavyTxPrices.length,
    avgGasUsedRatio: avgRatio,
  };
}

/** Analyses tx gas-limits (helpful for overrides). */
export function analyzeGasLimits(blocks: Block<bigint, true>[]) {
  const { txGasLimits } = analyzeBlocks(blocks, { minGasUsed: 0n });
  if (!txGasLimits.length) throw new Error("No transactions found.");

  txGasLimits.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));

  const maxGasLimit = txGasLimits[txGasLimits.length - 1];
  if (maxGasLimit === undefined) {
    throw new Error("No maximum gas limit found.");
  }
  return {
    medianGasLimit: median(txGasLimits),
    maxGasLimit,
    txCount: txGasLimits.length,
  };
}
