import { FC, SVGProps, useEffect, useState } from "react";
import { Connector } from "wagmi";
import { Button } from "../ui/button";
import { ButtonVariants } from "../ui/button.types";
import { WalletConnectIcon } from "../ui/icons/wallet-connect";
import { MetamaskIcon } from "../ui/icons/metamask";
import { ZerionIcon } from "../ui/icons/zerion";
import { PhantomIcon } from "../ui/icons/networks/phantom";
import { UniswapIcon } from "../ui/icons/networks/uniswap";
import { KeplrIcon } from "../ui/icons/networks/keplr";

type WalletOptionProps = {
  connector: Connector;
  onClick: () => void;
};

const walletIcons: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  walletConnect: WalletConnectIcon,
  metaMaskSDK: MetamaskIcon,
  "io.zerion.wallet": ZerionIcon,
  "app.phantom": PhantomIcon,
  "org.uniswap.app": UniswapIcon,
  "app.keplr": KeplrIcon,
};

export function WalletOption({ connector, onClick }: WalletOptionProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const provider = await connector.getProvider();
      setReady(!!provider);
    })();
  }, [connector]);

  const WalletIcon = walletIcons[connector.id];

  return (
    <Button
      type="button"
      disabled={!ready}
      onClick={onClick}
      variant={ButtonVariants.SECONDARY}
      data-id={connector.id}
    >
      <div className="flex items-center gap-2 w-full justify-center">
        {WalletIcon && <WalletIcon className="h-6 w-6" />}
        <span>{connector.name}</span>
      </div>
    </Button>
  );
}
