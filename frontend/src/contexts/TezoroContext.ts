import BigNumber from "bignumber.js";
import { createContext } from "react";
import type { Address } from "viem";
import { Chain } from "../blockchain/config";
import { Market } from "../clients/tezoro-backend";

type Agent = {
  address: Address;
  isDisabled: boolean;
  adapters: Address[];
  deploymentTimestamp: string;
};

type TezoroContextType = {
  agents?: Agent[];
  chainMarkets?: Market[];
  tokensInChain?: {
    balance: {
      raw: bigint;
      normalized: BigNumber;
    };
    symbol: string;
    chainId: Chain["id"];
    address: Address;
    decimals: number;
    supplyRate: number;
  }[];
  refetchAgents: (cb?: (agents: Address[] | undefined) => void) => void;
  refetchTokensBalances: () => void;
};

export const TezoroContext = createContext<TezoroContextType>({
  refetchAgents: () => {
    throw new Error("TezoroContext not initialized yet");
  },
  refetchTokensBalances: () => {
    throw new Error("TezoroContext not initialized yet");
  },
});
