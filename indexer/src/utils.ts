import { Address } from "viem";

export const normalizeAddress = (address: Address): Address => {
  return address.toLowerCase() as Address;
};
