# Tezoro Lending Automation

- Automate the rebalancing of lending positions based on calculated distributions.
- Protect against liquidation
- Maintaining a minimum balance.

## Installation
```pnpm i```

## Environment Variables
- `PRIVATE_KEY`: The private key of the wallet to use for transactions.
- `INTERVAL_MS`: The interval in milliseconds for checking the rebalancing condition.

## Build
```pnpm build```

## Run
```pnpm start``` (no need building) or ```node dist/index.js``` (after building)
