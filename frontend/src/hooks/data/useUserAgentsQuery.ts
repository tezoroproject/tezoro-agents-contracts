import { useQuery } from "@tanstack/react-query";
import { indexerSDK } from "../../clients/indexer";
import { Address } from "abitype";

import { z } from "zod";
import { addressSchema } from "../../schemas/common";

const AgentItemSchema = z.object({
  id: addressSchema,
  creator: addressSchema,
  adapters: z.array(addressSchema),
  createdAt: z.string(),
  disabledAt: z.string().nullable(),
});

export function useUserAgentsQuery(userAddress?: Address) {
  return useQuery({
    queryKey: ["userAgents", userAddress],
    queryFn: async () => {
      if (!userAddress) {
        throw new Error("User address is required");
      }
      const rawData = await indexerSDK.userAgentsQuery({ userAddress });
      const parsedData = z
        .object({
          agents: z.object({
            totalCount: z.number().int(),
            items: z.array(AgentItemSchema),
          }),
        })
        .safeParse(rawData);
      if (!parsedData.success) {
        throw new Error(
          `Failed to parse user agents data: ${parsedData.error.message}`
        );
      }
      return parsedData.data.agents.items;
    },
    enabled: !!userAddress,
  });
}
