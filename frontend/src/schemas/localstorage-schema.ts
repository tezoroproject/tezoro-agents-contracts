import { z } from "zod";
import { isValidChainId } from "../blockchain/config";
import { isAddress, isHash } from "viem";
import { TabsEnum } from "../constants";

// const hexSchema = z.string().refine(isHex, (val) => ({
//   message: `Invalid hex: ${val}`,
// }));

const txSchema = z.string().refine(isHash, (val) => ({
  message: `Invalid tx: ${val}`,
}));

const addressSchema = z.string().refine(isAddress, (val) => ({
  message: `Invalid address: ${val}`,
}));

const tokenSchema = z.object({
  allocation: z.object({
    amount: z.string(),
    maxAmount: z.string().optional(),
    // isFull: z.boolean(),
  }),
  symbol: z.string(),
  // decimals: z.number()
});

const chainSchema = z
  .number()
  .int()
  .refine(isValidChainId, (val) => ({
    message: `Invalid chainId: ${val}`,
  }));

const borrowingSchema = z.object({
  type: z.enum(["oneTime", "regular"]).optional(),
  token: tokenSchema.optional(),

  tx: txSchema.optional(),
  txConfirmedAt: z.number().int().nonnegative().optional(),
});

export const allocationSchema = z.object({
  id: z.string(),

  distributionTx: txSchema.optional(),
  distributionTxConfirmedAt: z.number().int().nonnegative().optional(),

  tokens: tokenSchema.array(),
  borrowing: borrowingSchema.optional(),

  walletAddress: addressSchema.optional(),
  chainId: chainSchema.optional(),

  agreementConfirmedAt: z.number().int().nonnegative().optional(),

  riskLevel: z.number().int().nonnegative().optional(),
});

const screenSchema = z.union([
  z.object({
    type: z.literal("home"),
    tab: z.nativeEnum(TabsEnum),
  }),
  z.object({ type: z.literal("settings") }),
  z.object({
    type: z.literal("dashboard"),
  }),
]);

export const modalScreenSchema = z.union([
  z.object({
    type: z.literal("connect_wallet"),
  }),
  z.object({
    type: z.literal("yieldBacktest"),
  }),
  z.object({
    type: z.literal("riskManagement"),
  }),
  z.object({
    type: z.literal("agent"),
    agentAddress: addressSchema.optional(),
  }),
  z.object({
    type: z.literal("agentToken"),
    agentAddress: addressSchema.optional(),
    tokenAddress: addressSchema.optional(),
  }),
  z.object({
    type: z.literal("addFunds"),
    agentAddress: addressSchema.optional(),
    typeBefore: z.enum(["dashboard", "agent"]).optional(),
  }),
]);

export const localStorageSchema = z.object({
  isInitialized: z.boolean(),
  allocations: allocationSchema.array(),
  screen: screenSchema,
  prevScreen: screenSchema.optional(),
});

export type ScreenType = z.infer<typeof screenSchema>;

export type ModalScreenType = z.infer<typeof modalScreenSchema>;

export type LocalStorageData = z.infer<typeof localStorageSchema>;

export type Allocation = LocalStorageData["allocations"][number];
