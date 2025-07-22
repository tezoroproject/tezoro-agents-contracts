import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { linea, bsc, base } from "viem/chains";
import { env } from "./env";
import { estimateGas } from "viem/linea";

export const account = privateKeyToAccount(env.PRIVATE_KEY);

// const LINEA_RPC = "https://rpc.linea.build";
// const BSC_RPC = "https://bsc-dataseed.bnbchain.org";
const BASE_RPC = "https://mainnet.base.org";

// const lineaWalletClient = createWalletClient({
//   transport: http(LINEA_RPC),
//   account,
//   chain: linea,
// });

// const lineaPublicClient = createPublicClient({
//   chain: linea,
//   transport: http(LINEA_RPC),
// });

// const bscWalletClient = createWalletClient({
//   transport: http(BSC_RPC),
//   account,
//   chain: bsc,
// });

// const bscPublicClient = createPublicClient({
//   chain: bsc,
//   transport: http(BSC_RPC),
// });

const baseWalletClient = createWalletClient({
  transport: http(BASE_RPC),
  account,
  chain: base,
});

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

export const config: Config[] = [
  // {
  //   chainName: "Linea",
  //   chain: linea,
  //   publicClient: lineaPublicClient,
  //   walletClient: lineaWalletClient,
  //   estimateGas,
  // },
  // {
  //   chainName: "BSC",
  //   chain: bsc,
  //   publicClient: bscPublicClient,
  //   walletClient: bscWalletClient,
  // },
  {
    chainName: "Base",
    chain: base,
    // @ts-expect-error Strange
    publicClient: basePublicClient,
    walletClient: baseWalletClient,
  },
] as const;

export type Config = {
  chainName: string;
  chain: typeof linea | typeof bsc | typeof base;
  publicClient: PublicClient;
  walletClient: WalletClient;
  estimateGas?: typeof estimateGas;
};
