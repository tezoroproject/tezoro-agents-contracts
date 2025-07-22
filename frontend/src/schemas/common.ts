import { isAddress, isHash, isHex } from "viem";
import { z } from "zod";

export const hashSchema = z.string().refine(isHash, (val) => ({
  message: `Invalid hash: ${val}`,
}));

export const hexSchema = z.string().refine(isHex, (val) => ({
  message: `Invalid hex: ${val}`,
}));

export const addressSchema = z.string().refine(isAddress, (val) => ({
  message: `Invalid address: ${val}`,
}));
