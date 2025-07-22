import { WalletOptions } from "../WalletOptions";

type ConnectWalletScreenProps = {
  onConnect: () => void;
};

export function ConnectWalletScreen({ onConnect }: ConnectWalletScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">
      <WalletOptions onConnect={onConnect} />
    </div>
  );
}
