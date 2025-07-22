import { HTMLAttributes } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { config } from "../blockchain/config";
import { cn, shortenAddress } from "../utils/utils";

type ExplorerLinkProps = {
  address: Address;
} & HTMLAttributes<HTMLElement>;

export function ExplorerLink({
  address,
  className = "",
  ...props
}: ExplorerLinkProps) {
  const { chain } = useAccount({ config });
  const explorerUrl = chain?.blockExplorers?.default?.url;
  const shortened = shortenAddress(address);

  if (explorerUrl) {
    return (
      <a
        href={`${explorerUrl}/address/${address}`}
        className={cn("break-all", className)}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {shortened}
      </a>
    );
  }

  return (
    <span className={cn("break-all text-neutral-400", className)} {...props}>
      {shortened}
    </span>
  );
}
