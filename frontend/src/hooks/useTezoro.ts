import { useAccount } from "wagmi";
import { chains, config } from "../blockchain/config";
import { useContext } from "react";
import { TezoroContext } from "../contexts/TezoroContext";

export function useTezoro() {
  const { chain } = useAccount({ config });
  const currentChainInfo = chain ? chains[chain.id] : null;

  const tezoroContext = useContext(TezoroContext);

  return { currentChainInfo, ...tezoroContext };
}
