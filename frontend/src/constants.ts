export enum TabsEnum {
  ASSETS = "Assets",
  RISK = "Farm Yield",
  BORROW = "Borrow",
  AGENT = "AI agent",
  LAUNCH = "Review",
}

export const APP_ENV = import.meta.env.VITE_APP_ENV ?? "production";
export const MAIN_TEZORO_HOST = "https://tezoro.io/";

export const MAX_AMOUNT_DECIMALS = 5;
export const MAX_BALANCE_DECIMALS = 8;

export const INDEXER_DELAY_MS = 2_000;
export const INITIAL_SUPPLY_ASSET_SYMBOL = "WETH";
export const BORROW_ASSET_SYMBOL = "USDC";

export const CONFIRMATIONS = 3;
