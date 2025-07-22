import { create } from "zustand";
import { AggregatedToken } from "../blockchain/utils/aggregate-supported-tokens";

type AggregatedTokensStore = {
  aggregatedTokens: AggregatedToken[] | undefined;
  setAggregatedTokens: (tokens: AggregatedToken[]) => void;
};

export const useAggregatedTokensStore = create<AggregatedTokensStore>(
  (set) => ({
    aggregatedTokens: undefined,
    setAggregatedTokens: (tokens: AggregatedToken[]) =>
      set(() => ({
        aggregatedTokens: tokens,
      })),
  })
);
