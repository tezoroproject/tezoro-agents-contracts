import { useQuery } from "@tanstack/react-query";
import { indexerSDK } from "../../clients/indexer";
import { Address } from "abitype";

import { z } from "zod";
import { addressSchema, hexSchema } from "../../schemas/common";

const TokenSchema = z.object({
  address: addressSchema,
  symbol: z.string().nullable(),
  name: z.string().nullable(),
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

const WithdrawalSchema = z.object({
  id: z.string(),
  amount: z.string(),
  managementFee: z.string(),
  timestamp: z.string(),
});

const AllocationSchema = z.object({
  id: z.string(),
  amount: z.string(),
  timestamp: z.string(),
  market: MarketSchema,
  withdrawal: WithdrawalSchema.nullable(),
});

const AgentPositionSchema = z.object({
  id: z.string(),
  token: TokenSchema,
  timestamp: z.string(),
  allocations: z.object({
    totalCount: z.number().int(),
    items: z.array(AllocationSchema),
  }),
});

export function useAgentPositionsQuery(agentAddress?: Address) {
  console.log("Fetching agent positions for:", agentAddress);
  return useQuery({
    queryKey: ["agentPositions", agentAddress],
    queryFn: async () => {
      if (!agentAddress) {
        throw new Error("User address is required");
      }
      const rawData = await indexerSDK.agentPositionsQuery({ agentAddress });
      const parsedData = z
        .object({
          positions: z.object({
            totalCount: z.number().int(),
            items: z.array(AgentPositionSchema),
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
      return parsedData.data.positions;
    },
    enabled: !!agentAddress,
  });
}
