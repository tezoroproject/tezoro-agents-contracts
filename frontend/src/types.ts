import { Address, Hex } from "viem";

export type MarketKey = {
  loanToken: Address;
  collateralToken: Address;
  marketAddress: Address;
  auxId: Hex; // bytes32
  flags: number; // uint16
};

export type PositionInfo = {
  metadata: {
    token: `0x${string}`;
    symbol?: string | null;
    decimals: number;
  };
  protocolCode: number;
  market: MarketKey;
  supplied: bigint;
  accumulatedAccruedInterest: bigint;
  currentMarketAccruedInterest: bigint;
  isClosed?: boolean;
};
