import { useQuery } from "@tanstack/react-query";
import { indexerSDK } from "../../clients/indexer";
import { Address } from "abitype";

import { z } from "zod";
import { addressSchema, hexSchema } from "../../schemas/common";

const TokenSchema = z.object({
  address: addressSchema,
  symbol: z.string().nullable(),
  decimals: z.number().int(),
});

const MarketSchema = z.object({
  id: hexSchema,
  protocolCode: z.number().int(),
  loanToken: TokenSchema,
  collateralToken: TokenSchema,
  marketAddress: addressSchema,
  auxId: hexSchema,
  flags: z.number().int(),
});

const AgentBorrowSchema = z.object({
  id: z.string(),
  minAmount: z.string(),
  maxAmount: z.string().nullable(),
  timestamp: z.string(),
  blockNumber: z.string(),
  market: MarketSchema,
});

export function useAgentLoansQuery(agentAddress?: Address) {
  console.log("Fetching agent loans for:", agentAddress);
  return useQuery({
    queryKey: ["agentLoans", agentAddress],
    queryFn: async () => {
      if (!agentAddress) {
        throw new Error("User address is required");
      }
      const rawData = await indexerSDK.agentLoansQuery({ agentAddress });
      const parsedData = z
        .object({
          borrows: z.object({
            totalCount: z.number().int(),
            items: z.array(AgentBorrowSchema),
          }),
        })
        .safeParse(rawData);
      console.debug("Agent positions:", parsedData);
      if (!parsedData.success) {
        console.error("Failed to parse agent positions:", parsedData.error);
        throw new Error(
          `Failed to parse agent positions: ${parsedData.error.message}`
        );
      }
      return parsedData.data.borrows;
    },
    enabled: !!agentAddress,
  });
}
