import { isAddress, isHex } from "viem";
import { z } from "zod";

const addressSchema = z.string().refine(isAddress, () => ({
  message: "Invalid address",
}));

const hexSchema = z.string().refine(isHex);

export const envSchema = z.object({
  PRIVATE_KEY: hexSchema,
  INTERVAL_MS: z.coerce.number().int(),
});
