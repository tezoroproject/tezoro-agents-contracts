import { Address } from "viem";
import { http, createConfig } from "wagmi";
import {
  base,
  // bsc, linea,
  // localhost
} from "wagmi/chains";
import { metaMask, walletConnect } from "wagmi/connectors";
import { AaveIcon } from "../ui/icons/aave";
// import { ZeroLendIcon } from "../ui/icons/zero-lend";
import {
  BaseIcon,
  // BSCIcon, LineaIcon
} from "../ui/icons/networks";
import { VenusIcon } from "../ui/icons/venus";
// import { CircleHelpIcon } from "lucide-react";
import { FC, SVGProps } from "react";
import { MorphoIcon } from "../ui/icons/morpho";
import { CometIcon } from "../ui/icons/compound-comet";

const WALLET_CONNECT_PROJECT_ID = import.meta.env
  .VITE_WALLET_CONNECT_PROJECT_ID;

export const config = createConfig({
  chains: [
    // localhost, bsc, linea,
    base,
  ],
  transports: {
    // [localhost.id]: http(undefined, { batch: true }),
    // [bsc.id]: http(undefined, { batch: true }),
    // [linea.id]: http(undefined, { batch: true }),
    [base.id]: http("https://rpc-proxy-blond.vercel.app/api/rpc"),
  },
  connectors: [
    metaMask(),
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
    }),
    // injected({
    //   target: "zerion",
    // }),
  ],
});

export function isValidChainId(
  chainId: number | undefined
): chainId is Chain["id"] {
  if (chainId === undefined) return false;
  if (Number.isNaN(chainId)) return false;
  if (chainId < 0) return false;
  if (chainId > 65535) return false;
  if (chainId === 0) return false;
  return config.chains.some((chain) => chain.id === chainId);
}

export function assertIsValidChainId(
  chainId: number | undefined
): asserts chainId is Chain["id"] {
  if (!isValidChainId(chainId)) {
    throw new Error(`Invalid chainId: ${chainId}`);
  }
}

export type Chain = (typeof config.chains)[number];

export type Protocol = {
  name: string;
  code: number;
  adapter: Address;
  icon: FC<SVGProps<SVGSVGElement>>;
  risk: number; // 0 - 100, 0 is the safest
};

type AvailableChain = {
  name: string;
  isDisabled: boolean;
  chain: Chain;
  internalChainId?: Chain["id"];
  factoryAddress: Address;
  lensAddress: Address;
  icon: FC<SVGProps<SVGSVGElement>>;
  protocols: Protocol[];
  llamaChainId: string;
  borrowOnly: Address[];
};

type AvailableChains = Record<Chain["id"], AvailableChain>;

export const chains: AvailableChains = {
  // [localhost.id]: {
  //   name: "Localhost",
  //   isDisabled: !import.meta.env.DEV,
  //   // isDisabled: true,
  //   chain: localhost,
  //   internalChainId: base.id,
  //   factoryAddress: "0x4e0E4E39f59f8AEd7372BCEdD03D99f92b5A6Bf0",
  //   lensAddress: "0x89197Cd6A909bAc91C72f146fa07c23A0CFB6959",
  //   borrowOnly: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  //   llamaChainId: "base",
  //   icon: CircleHelpIcon,
  //   protocols: [
  //     {
  //       name: "AAVE V3",
  //       code: 1,
  //       adapter: "0xed4A77d39c360469f4EEF8aF5Fa3D5B45C792ed3",
  //       icon: AaveIcon,
  //     },
  // {
  //   name: "Venus",
  //   code: 2,
  //   adapter: "0xFb6758C2382468707F3E111854CDA25d251f2AFb",
  //   icon: VenusIcon,
  // },
  // {
  //   name: "Morpho",
  //   code: 5,
  //   adapter: "0xD3B2bbBBBA844A911387569fAb3a565D7B58Bc8C",
  //   icon: MorphoIcon,
  // },
  // {
  //   name: "Compound V3",
  //   code: 6,
  //   adapter: "0x4f3cd9Ae4d990Eade7ba29c7d56328a89d3E4Cb6",
  //   icon: CometIcon,
  // },
  // ],
  // },
  // [bsc.id]: {
  //   name: "BSC",
  //   isDisabled: true,
  //   chain: bsc,
  //   factoryAddress: "0x00468737D4D5CD688F3D642554dDA2e59D7860a9",
  //   llamaChainId: "bsc",
  //   lensAddress: "0xAF303cdFeF2ac6d01AEC9f922bf8F7dA08971796",
  //   icon: BSCIcon,
  //   borrowOnly: ["0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"],
  //   protocols: [
  //     {
  //       name: "AAVE V3",
  //       code: 1,
  //       adapter: "0xa7a7BF1C40e8cD6E5BC6Ded271815b24964D1a6E",
  //       icon: AaveIcon,
  //     },
  //     {
  //       name: "Venus",
  //       code: 2,
  //       adapter: "0x016B2e601085dD75a28a894eaEDF27dFD0C995fC",
  //       icon: VenusIcon,
  //     },
  //   ],
  // },
  [base.id]: {
    name: "Base",
    isDisabled: false,
    chain: base,
    factoryAddress: "0x5e9fbEBAd0FDEF16124Dc11AAeA1476F936cc764",
    lensAddress: "0x89197Cd6A909bAc91C72f146fa07c23A0CFB6959",
    llamaChainId: "base",
    borrowOnly: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
    icon: BaseIcon,
    protocols: [
      {
        name: "AAVE V3",
        code: 1,
        adapter: "0xc22730dC6F0a556B5f96aa9C19963d0F7f4e7878",
        icon: AaveIcon,
        risk: 0,
      },
      {
        name: "Compound V3",
        code: 6,
        adapter: "0x95667E119A95ed57df0091021F47a2Fe51928428",
        icon: CometIcon,
        risk: 0,
      },
      {
        name: "Venus",
        code: 2,
        adapter: "0x0F1598563888A1187e4B5d63DdB11426045e2C81",
        icon: VenusIcon,
        risk: 50,
      },
      {
        name: "Morpho",
        code: 5,
        adapter: "0x31cEA1Ab7EcB493c92695F7Da731DE771b1FDd42",
        icon: MorphoIcon,
        risk: 100,
      },
    ],
  },
  // [linea.id]: {
  //   name: "Linea",
  //   isDisabled: true,
  //   chain: linea,
  //   factoryAddress: "0x8791FE7d77DAee1dBc4C2C5C9f3bCcfc15Fd9CE8",
  //   lensAddress: "0x8C021811e884a2465e3Db5e8748Fb5e22dA12Fb9",
  //   llamaChainId: "linea",
  //   icon: LineaIcon,
  //   borrowOnly: ["0x176211869cA2b568f2A7D4EE941E073a821EE1ff"],
  //   protocols: [
  //     {
  //       name: "AAVE V3",
  //       code: 1,
  //       adapter: "0x5baf04FA2B61642e235028C751077cd602882d0f",
  //       icon: AaveIcon,
  //     },
  //     {
  //       name: "ZeroLend",
  //       code: 3,
  //       adapter: "0x07e1777cA901F384ed53E6f7f2Ea3c8FdB41691b",
  //       icon: ZeroLendIcon,
  //     },
  // {
  //   name: "Malda",
  //   adapter: "0xddE63d47ca05643671267E4bA6581C6331F8f7EB",
  //   icon: MaldaIcon,
  // },
  // ],
  // },
} as const;

export const chainsList = Object.values(chains);

export const availableChains = chainsList.filter((chain) => !chain.isDisabled);
