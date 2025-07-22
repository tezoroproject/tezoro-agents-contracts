import { z } from "zod";

const coinInfoSchema = z.object({
  decimals: z.number().int(),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.number().int(),
  confidence: z.number(),
});

const llamaPriceSchema = z.object({
  coins: z.record(coinInfoSchema),
});

const CACHE_EXPIRATION = 60 * 1000; // 1 minute

type CachedCoin = {
  data: z.infer<typeof coinInfoSchema>;
  cachedAt: number;
};

const usdPriceCache = new Map<string, CachedCoin>();

export async function getUSDPriceFromLlama(chain: string, address: string) {
  const id = `${chain}:${address}`;
  const cached = usdPriceCache.get(id);
  if (cached && Date.now() - cached.cachedAt < CACHE_EXPIRATION) {
    return cached.data;
  }

  const response = await fetch(`https://coins.llama.fi/prices/current/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.statusText}`);
  }

  const rawData: unknown = await response.json();
  const parsedData = llamaPriceSchema.safeParse(rawData);
  if (!parsedData.success) {
    throw new Error(`Failed to parse price data: ${parsedData.error.message}`);
  }

  const data = parsedData.data;
  const coin = data.coins[id];
  if (!coin) {
    throw new Error(`No price data found for ${id}`);
  }

  usdPriceCache.set(id, {
    data: coin,
    cachedAt: Date.now(),
  });

  return coin;
}

export async function getTokenPriceInToken(
  baseChain: string,
  baseAddress: string,
  quoteChain: string,
  quoteAddress: string
): Promise<number> {
  if (
    baseChain === quoteChain &&
    baseAddress.toLowerCase() === quoteAddress.toLowerCase()
  ) {
    return 1; // Same token, ratio is 1
  }

  const [baseUSD, quoteUSD] = await Promise.all([
    getUSDPriceFromLlama(baseChain, baseAddress),
    getUSDPriceFromLlama(quoteChain, quoteAddress),
  ]);

  if (quoteUSD.price === 0) {
    throw new Error("Quote token has zero USD price, cannot compute ratio.");
  }

  return baseUSD.price / quoteUSD.price;
}
