import { useEffect } from "react";
import { useAggregatedTokensStore } from "../state";
import { aggregateSupportedTokens } from "../blockchain/utils/aggregate-supported-tokens";

const INTERVAL_TIME_MS = 30_000;

export function useAggregatedTokens() {
  const { setAggregatedTokens } = useAggregatedTokensStore();

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let interval: ReturnType<typeof setInterval>;

    const fetchData = async () => {
      try {
        const tokens = await aggregateSupportedTokens();
        setAggregatedTokens(tokens);
        clearInterval(interval);
      } catch (err) {
        console.error("Error fetching aggregated tokens:", err);
      }
    };
    interval = setInterval(fetchData, INTERVAL_TIME_MS);

    // initial fetch
    fetchData();

    return () => clearInterval(interval);
  }, [setAggregatedTokens]);
}
