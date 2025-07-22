import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveAllocation } from "./useActiveAllocation";
import { useTezoro } from "./useTezoro";
import { BORROW_ASSET_SYMBOL } from "../constants";
import { Market } from "../clients/tezoro-backend";
import { getTokenPriceInToken } from "../clients/llama";

export function useBorrowableAmount() {
  const { activeAllocation } = useActiveAllocation();
  const { currentChainInfo, tokensInChain, chainMarkets } = useTezoro();

  const [borrowableAmount, setBorrowableAmount] = useState<number>();

  const borrowAssetInChain = useMemo(
    () =>
      tokensInChain?.find(
        (token) =>
          token.symbol.toLowerCase() === BORROW_ASSET_SYMBOL.toLowerCase()
      ),
    [tokensInChain]
  );

  const activeAllocationTokens = useMemo(
    () =>
      activeAllocation?.tokens
        .map((token) =>
          tokensInChain?.find(
            (tokenWithBalance) => tokenWithBalance.symbol === token.symbol
          )
        )
        .filter((token) => token !== undefined),
    [activeAllocation?.tokens, tokensInChain]
  );

  const protocolsAvailableForAllocation = useMemo(
    () => currentChainInfo?.protocols.map(({ code }) => code),
    [currentChainInfo]
  );

  const getBestBorrowMarket = useCallback(
    (markets: Market[], borrowAssetAddress: string) => {
      const targetMarkets = markets.filter((market) => {
        const isLoanAssetMatch =
          market.loanAsset.token.address.toLowerCase() ===
          borrowAssetAddress.toLowerCase();

        const isBorrowableProtocolMatch =
          protocolsAvailableForAllocation?.includes(market.protocol);

        const isActiveAllocationTokenMatch = activeAllocationTokens?.some(
          (token) =>
            token.symbol.toLowerCase() ===
            market.collateralAsset.token.symbol.toLowerCase()
        );

        return (
          isLoanAssetMatch &&
          isBorrowableProtocolMatch &&
          isActiveAllocationTokenMatch
        );
      });
      return targetMarkets[0];
    },
    [activeAllocationTokens, protocolsAvailableForAllocation]
  );

  useEffect(() => {
    // borrowable = collateral_amount * collateral_price * ltv
    // total_borrowable_value = Σ(borrowable_i)

    if (
      currentChainInfo &&
      activeAllocation &&
      chainMarkets &&
      borrowAssetInChain
    ) {
      Promise.all(
        activeAllocation.tokens
          .filter((token) => token.symbol !== BORROW_ASSET_SYMBOL) // Exclude the borrow asset itself
          .map(async (collateralToken) => {
            const bestMarket = getBestBorrowMarket(
              chainMarkets,
              borrowAssetInChain.address
            );
            if (!bestMarket) {
              throw new Error(
                `No market found for loan asset: ${BORROW_ASSET_SYMBOL}`
              );
            }

            const collateralTokenInChain = tokensInChain?.find(
              (token) => token.symbol === collateralToken.symbol
            );
            if (!collateralTokenInChain)
              throw new Error(
                `Collateral token not found: ${collateralToken.symbol}`
              );

            const loanTokenInChain = tokensInChain?.find(
              (token) => token.symbol === BORROW_ASSET_SYMBOL
            );
            if (!loanTokenInChain)
              throw new Error(`Loan token not found: ${BORROW_ASSET_SYMBOL}`);
            const collateralPriceInLoanToken = await getTokenPriceInToken(
              currentChainInfo.llamaChainId,
              collateralTokenInChain.address,
              currentChainInfo.llamaChainId,
              loanTokenInChain.address
            );
            const borrowable =
              Number.parseFloat(collateralToken.allocation.amount) *
              collateralPriceInLoanToken *
              bestMarket.collateralAsset.policy.ltv;
            return {
              asset: collateralToken.symbol,
              ltv: bestMarket.collateralAsset.policy.ltv,
              borrowableAmount: borrowable,
            };
          })
      ).then((borrowableResults) => {
        const totalBorrowableValue = borrowableResults.reduce(
          (sum, borrowableReult) => sum + borrowableReult.borrowableAmount,
          0
        );
        console.log(
          "Borrowable results:",
          borrowableResults,
          "Total borrowable value:",
          totalBorrowableValue
        );

        setBorrowableAmount(totalBorrowableValue);
      });
    }
  }, [
    activeAllocation,
    borrowAssetInChain,
    chainMarkets,
    currentChainInfo,
    getBestBorrowMarket,
    tokensInChain,
  ]);

  return { borrowableAmount };
}
