import { Address, isAddress, isHex } from "viem";
import { z } from "zod";

const API_URL =
  "https://tezoro-lending-subgraph-git-uni-tezoro.vercel.app/api/";

const MARKETS_URL = `${API_URL}markets`;
const BEST_SUPPLY_MARKETS_URL = `${API_URL}best-markets`;
const BEST_BORROW_MARKETS_URL = `${API_URL}best-borrow-markets`;

const addressSchema = z.string().refine(isAddress, {
  message: "Invalid address format",
});

const tokenSchema = z.object({
  address: addressSchema,
  symbol: z.string(),
  decimals: z.number().int(),
});

const marketSchema = z.object({
  loanAsset: z.object({
    token: tokenSchema,
    borrowRate: z.number(),
  }),

  collateralAsset: z.object({
    token: tokenSchema,
    policy: z.object({
      liqThreshold: z.number(),
      ltv: z.number(),
    }),
    supplyRate: z.number(),
    type: z.union([z.literal("collateral"), z.literal("yield")]).optional(),
  }),
  auxId: z.string().refine(isHex, {
    message: "Invalid auxId format",
  }),
  flags: z.number().int(),
  marketAddress: addressSchema,
  platform: z.string(),
  protocol: z.number().int(),
});

const chainSchema = z.object({
  chainId: z.number().int(),
  chainName: z.string(),
  markets: z.array(marketSchema),
});

export type Market = z.infer<typeof marketSchema>;

export type ChainMarkets = z.infer<typeof chainSchema>;

export async function getMarkets(collaterals: Address[] = []) {
  const url = new URL(MARKETS_URL);
  if (collaterals.length > 0) {
    url.searchParams.append("collaterals", collaterals.join(","));
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }

  const rawData: unknown = await response.json();
  const parsedData = z.array(chainSchema).safeParse(rawData);
  if (!parsedData.success) {
    throw new Error(
      `Failed to parse markets data: ${parsedData.error.message}`
    );
  }
  return parsedData.data;
}

export async function getBestSupplyMarkets(
  chainId: number,
  tokens: Address[],
  protocols: bigint[] = [],
  isSuboptimal: boolean = false
) {
  const url = new URL(BEST_SUPPLY_MARKETS_URL);
  url.searchParams.append("tokens", tokens.join(","));
  url.searchParams.append("chainId", chainId.toString());
  if (protocols.length > 0) {
    url.searchParams.append("protocols", protocols.join(","));
  }
  if (isSuboptimal) {
    url.searchParams.append("suboptimal", "true");
  }

  console.log("Fetching best markets from:", url.toString());
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch best markets: ${response.statusText}`);
  }
  const rawData: unknown = await response.json();
  const parsedData = z.array(marketSchema).safeParse(rawData);
  if (!parsedData.success) {
    throw new Error(
      `Failed to parse best markets data: ${parsedData.error.message}`
    );
  }
  return parsedData.data;
}

export async function getBestBorrowMarkets(
  chainId: number,
  loans: {
    address: Address;
    amount: string;
  }[],
  collaterals: {
    address: Address;
    amount: string;
  }[] = [],
  protocols: number[] = []
) {
  const url = new URL(BEST_BORROW_MARKETS_URL);
  url.searchParams.append("loans", loans.map((l) => l.address).join(","));
  url.searchParams.append(
    "loansAmount",
    loans.map((l) => l.amount.toString()).join(",")
  );
  url.searchParams.append(
    "collaterals",
    collaterals.map((c) => c.address).join(",")
  );
  url.searchParams.append(
    "collateralsAmount",
    collaterals.map((c) => c.amount.toString()).join(",")
  );
  url.searchParams.append("chainId", chainId.toString());
  if (protocols.length > 0) {
    url.searchParams.append("protocols", protocols.join(","));
  }

  console.log("Fetching best borrow markets from:", url.toString());
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Failed to fetch best borrow markets: ${response.statusText}`
    );
  }
  const rawData: unknown = await response.json();
  const parsedData = z
    .object({
      borrowMarkets: z.array(marketSchema),
      earningMarkets: z.array(marketSchema),
    })
    .safeParse(rawData);

  if (!parsedData.success) {
    throw new Error(
      `Failed to parse best borrow markets data: ${parsedData.error.message}`
    );
  }
  return parsedData.data;
}
