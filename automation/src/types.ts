import { Address, Hex } from "viem";

export type MarketKey = {
  loanToken: Address;
  collateralToken: Address;
  marketAddress: Address;
  auxId: Hex; // bytes32
  flags: number; // uint16
};
