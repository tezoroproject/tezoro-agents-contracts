import { keccak256, encodeAbiParameters } from "viem";
import { MarketKey } from "../types";

const isUint16 = (value: number | bigint): value is number => {
  const num = typeof value === "bigint" ? Number(value) : value;
  return Number.isInteger(num) && value >= 0 && value <= 65535;
};

export function toMarketId(protocolCode: number | bigint, k: MarketKey) {
  if (!isUint16(protocolCode)) {
    throw new Error(`Invalid protocolCode: ${protocolCode}`);
  }
  return keccak256(
    encodeAbiParameters(
      [
        { name: "protocolCode", type: "uint16" },
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "marketAddress", type: "address" },
        { name: "auxId", type: "bytes32" },
        { name: "flags", type: "uint16" },
      ],
      [
        protocolCode,
        k.loanToken,
        k.collateralToken,
        k.marketAddress,
        k.auxId,
        k.flags,
      ]
    )
  );
}
