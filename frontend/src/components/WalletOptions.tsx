import { useAccount, useConnect } from "wagmi";
import { WalletOption } from "./WalletOption";
import { useEffect } from "react";

type WalletOptionsProps = {
  onConnect?: () => void;
};

export function WalletOptions({ onConnect }: WalletOptionsProps) {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) {
      onConnect?.();
    }
  }, [isConnected, onConnect]);

  return (
    <div className="flex flex-col gap-4">
      {connectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => connect({ connector })}
        />
      ))}
    </div>
  );
}
