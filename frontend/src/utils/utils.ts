import BigNumber from "bignumber.js";
import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

BigNumber.config({ EXPONENTIAL_AT: 1e9 });

const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

const capitalize = (str: string) => {
  if (typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const round = (num: number, precision = 2) => {
  const factor = Math.pow(10, precision);

  return num ? Math.round((num + Number.EPSILON) * factor) / factor : 0;
};

export function formatTokenAmount(
  value: BigNumber.Value,
  {
    minSig = 2,
    minDecimals = 2,
    maxDecimals = 8,
  }: { minSig?: number; minDecimals?: number; maxDecimals?: number } = {}
) {
  const bn = new BigNumber(value);
  if (!bn.isFinite()) return "-";

  const sig = bn.sd(); // significant digits
  const adjustedValue =
    sig !== null && sig < minSig
      ? new BigNumber(bn.toPrecision(minSig, BigNumber.ROUND_FLOOR))
      : bn;

  // eslint-disable-next-line prefer-const
  let [int, frac = ""] = adjustedValue.toFixed(maxDecimals).split(".");
  frac = frac.replace(/0+$/, ""); // remove trailing zeros
  while (frac.length < minDecimals) frac += "0";

  return `${int}.${frac}`;
}

function isError(errorCandidate: unknown): errorCandidate is Error {
  return errorCandidate instanceof Error;
}

function assertError(errorCandidate: unknown): asserts errorCandidate is Error {
  if (!isError(errorCandidate)) {
    throw new Error("Expected an Error object");
  }
}

function shortenAddress(address: string, options?: { start?: number; end?: number }) {
  const start = options?.start ?? 6;
  const end = options?.end ?? 4;
  
  if (address.length <= 10) return address;

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}


export { cn, capitalize, round, isError, assertError, shortenAddress };
