import { keccak256, toHex } from "viem";
import { PositionInfo } from "../types";

export function deduplicatePositions(
  positions: PositionInfo[]
): PositionInfo[] {
  const seen = new Set<string>();
  const result: PositionInfo[] = [];

  for (const pos of positions) {
    const market = pos.market;
    const key = keccak256(
      toHex(
        `${pos.protocolCode}-${market.loanToken}-${market.collateralToken}-${market.marketAddress}-${market.auxId}-${market.flags}`
      )
    );

    if (!seen.has(key)) {
      seen.add(key);
      result.push(pos);
    }
  }

  return result;
}
