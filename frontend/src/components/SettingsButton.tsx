"use client";

import { useAccount } from "wagmi";
import { config } from "../blockchain/config";
import { IconWrapper } from "../ui/icons/wrapper";
import { SettingsIcon } from "../ui/icons/settings";
import { useTezoro } from "../hooks";

export function SettingsButton({ onClick }: { onClick: () => void }) {
  const { isConnected } = useAccount({ config });

  const { currentChainInfo } = useTezoro();

  if (!isConnected) {
    return null;
  }

  const ChainIcon = currentChainInfo?.icon;

  return (
    <IconWrapper
      onClick={onClick}
      className="relative translate-x-[2px] min-[410px]:translate-x-[6px] min-[540px]:translate-x-[11px] group"
    >
      <SettingsIcon
        className="absolute right-[3px] top-[5px] z-10 transition transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform
         group-hover:rotate-90 group-hover:scale-110 group-active:rotate-[180deg] group-active:scale-100"
      />
      {ChainIcon ? (
        <div
          className="absolute top-1/2 left-1/2 -translate-1/2 pointer-events-none w-[40px] h-[40px]
              flex justify-center items-center"
        >
          <ChainIcon width={30} height={30} />
        </div>
      ) : null}
    </IconWrapper>
  );
}
