import { useMemo, useState } from "react";
import { TokenIcon } from "@web3icons/react";
import { cn, shortenAddress } from "../utils/utils";
import { iconsMapping } from "../blockchain/mapping";
import { useActiveAllocation } from "../hooks/useActiveAllocation";
import { useAggregatedTokensStore } from "../state";
import { useAccount } from "wagmi";
import { config } from "../blockchain/config";
import { MAX_AMOUNT_DECIMALS, MAX_BALANCE_DECIMALS } from "../constants";
import BigNumber from "bignumber.js";
import { useTezoro } from "../hooks";
import { CloseIcon } from "../ui/icons/close";

type SelectTokenProps = {
  selectToken: string | null | undefined;
  setSelectToken: (token: string | null | undefined) => void;
};

export function SelectToken({ selectToken, setSelectToken }: SelectTokenProps) {
  const { chain } = useAccount({ config });

  const { activeAllocation, updateActiveAllocation } = useActiveAllocation();
  const { aggregatedTokens } = useAggregatedTokensStore();
  const [query, setQuery] = useState("");

  const { tokensInChain } = useTezoro();

  const handleChangeToken = (symbol: string) => {
    console.log("Selected token:", symbol);
    updateActiveAllocation((draft) => {
      const tokenInChain = tokensInChain?.find(
        (token) => token.symbol === symbol
      );

      if (selectToken === null) {
        const existingToken = draft.tokens.find((t) => t.symbol === symbol);
        if (!existingToken && tokenInChain) {
          draft.tokens.push({
            symbol,
            allocation: {
              amount: tokenInChain.balance.normalized
                .dp(MAX_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
                .toString(),
            },
          });
        }
      } else if (selectToken) {
        const activeToken = draft.tokens.find((t) => t.symbol === selectToken);
        if (activeToken && tokenInChain) {
          activeToken.symbol = symbol;
          activeToken.allocation.amount = tokenInChain.balance.normalized
            .dp(MAX_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
            .toString();
        }
      }
    });
    setSelectToken(undefined);
  };

  const filteredTokens = useMemo(
    () =>
      aggregatedTokens
        ?.map((aggregatedToken) => {
          const tokenInChain = tokensInChain?.find(
            (token) => token.symbol === aggregatedToken.symbol
          );
          const isAvailableOnChain = chain
            ? aggregatedToken.chains.some(({ chainId }) => chainId === chain.id)
            : true;

          return {
            ...aggregatedToken,
            tokenInChain,
            isAvailableOnChain,
          };
        })
        .filter(({ symbol, isAvailableOnChain }) => {
          const isSymbolMatch = symbol
            .toLowerCase()
            .includes(query.toLowerCase());

          return isAvailableOnChain && isSymbolMatch;
        }),

    [aggregatedTokens, chain, query, tokensInChain]
  );

  return (
    <div
      className={cn(
        "absolute top-full left-0 z-100 w-full bottom-0 overflow-y-scroll scrollbar-none",
        "rounded-[20px] border border-[#f4f4f4] transition-all ease duration-300 bg-white",
        (Boolean(selectToken) || selectToken === null) && "top-4"
      )}
    >
      <div className="py-[14px] flex flex-col gap-5">
        <div
          className="flex items-center justify-between max-[410px]:pl-4
            max-[540px]:pl-5 pl-[25px] pr-[14px]"
        >
          <div className="text-[18px] max-[540px]:text-[16px]">Assets</div>
          <CloseIcon onClick={() => setSelectToken(undefined)} />
        </div>

        {activeAllocation && filteredTokens ? (
          <div className="flex flex-col gap-2">
            <div className="w-full max-[410px]:px-4 max-[540px]:px-5 px-[25px]">
              <input
                className="w-full h-[48px] rounded-[12px] px-4 py-2 bg-neutral-100 
                  border-none outline-none focus:ring-0 text-[18px] max-[540px]:text-[16px]"
                placeholder="Search assets"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
              />
            </div>
            <div>
              {filteredTokens.map(({ symbol, tokenInChain }) => {
                const isSelected = activeAllocation.tokens.some(
                  (t) => t.symbol === symbol
                );
                const iconSymbol = iconsMapping[symbol.toLowerCase()] ?? symbol;

                return (
                  <button
                    type="button"
                    key={symbol}
                    onClick={() => handleChangeToken(symbol)}
                    className={cn(
                      `bg-white max-[410px]:px-4 max-[540px]:px-5 px-[25px] h-[64px] max-[540px]:h-[58px] text-[18px] max-[540px]:text-[16px]
                         flex items-center justify-between gap-2 cursor-pointer w-full`,
                      `hover:bg-[#EEEEEE]`,
                      `disabled:cursor-not-allowed disabled:opacity-30`,
                      {
                        "opacity-30 pointer-events-none": isSelected,
                      }
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative rounded-full overflow-hidden w-9 h-9">
                        <TokenIcon
                          symbol={iconSymbol}
                          variant="background"
                          className="w-9 h-9"
                          fallback={
                            <div className="w-9 h-9 bg-gray-200 flex justify-center items-center text-[12px]">
                              {iconSymbol?.slice(0, 3)?.toUpperCase() ?? "?"}
                            </div>
                          }
                        />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <div className="text-left">{symbol}</div>
                        <div className="text-[14px] max-[540px]:text-[12px] text-[#6F6F6F]">
                          {tokenInChain?.address
                            ? shortenAddress(tokenInChain?.address)
                            : ""}
                        </div>
                      </div>
                      <div className="ml-auto">
                        {tokenInChain?.balance.normalized
                          .dp(MAX_BALANCE_DECIMALS, BigNumber.ROUND_FLOOR)
                          .toString()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4 text-center">Loading...</div>
        )}
      </div>
    </div>
  );
}
