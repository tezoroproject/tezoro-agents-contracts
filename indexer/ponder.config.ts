import { createConfig, factory } from "ponder";

import { TezoroLendingAgentAbi } from "./abis/TezoroLendingAgent";
import { TezoroLendingAgentFactoryAbi } from "./abis/TezoroLendingAgentFactory";

import { parseAbiItem } from "viem";

const BASE_FACTORY_ADDRESS = "0x5e9fbEBAd0FDEF16124Dc11AAeA1476F936cc764";
const BASE_START_BLOCK = 32331405;

const BASE_AGENTS_ADDRESSES = factory({
  address: BASE_FACTORY_ADDRESS,
  event: parseAbiItem(
    "event AgentCreated(address indexed agent, address indexed creator, address[] adapters)"
  ),
  parameter: "agent",
});

export default createConfig({
  chains: {
    base: {
      id: 8453,
      rpc: process.env.PONDER_RPC_URL_8453,
    },
  },
  contracts: {
    TezoroLendingAgentFactory: {
      chain: {
        base: {
          address: BASE_FACTORY_ADDRESS,
          startBlock: BASE_START_BLOCK,
        },
      },
      abi: TezoroLendingAgentFactoryAbi,
    },
    TezoroLendingAgent: {
      chain: {
        base: {
          address: BASE_AGENTS_ADDRESSES,
          startBlock: BASE_START_BLOCK,
        },
      },
      abi: TezoroLendingAgentAbi,
    },
  },
});
