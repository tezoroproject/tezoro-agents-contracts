import "dotenv/config";

import { env } from "./env";
import { account, config } from "./chain";
import { protectFromLiquidation } from "./tasks/liquidation-protection/protect-from-liquidation";
import { keepBorrowAmount } from "./tasks/keep-borrow-amount";
import { rebalanceAllAgents } from "./tasks/supply-rebalance/rebalance-all-agents";

async function main() {
  console.log(`${new Date().toUTCString()}: Starting script...`);

  // Start rebalancing agents and protecting from liquidation
  config.forEach(async (config) => {
    console.log(
      `${new Date().toUTCString()}: Starting rebalancing on ${
        config.chain.name
      }...`
    );

    const execAutomation = async () => {
      console.log(`${new Date().toUTCString()}: Rebalancing all agents...`);
      await rebalanceAllAgents(config, account);
      console.log(
        `${new Date().toUTCString()}: Rebalancing completed on ${
          config.chain.name
        }.`
      );

      console.log(
        `${new Date().toUTCString()}: Protecting from liquidation...`
      );
      await protectFromLiquidation(config, account);
      console.log(
        `${new Date().toUTCString()}: Liquidation protection completed on ${
          config.chain.name
        }.`
      );

      console.log(`${new Date().toUTCString()}: Keeping borrow amounts...`);
      await keepBorrowAmount(config, account);
      console.log(
        `${new Date().toUTCString()}: Keeping borrow amounts completed on ${
          config.chain.name
        }.`
      );
    };

    await execAutomation();

    setInterval(execAutomation, env.INTERVAL_MS);
  });

  setInterval(() => {
    fetch(
      "https://tezoro-lending-subgraph-git-uni-tezoro.vercel.app/api/markets"
    )
      .catch((error) => {
        console.error(
          `${new Date().toUTCString()}: Failed to fetch markets:`,
          error
        );
      })
      .then(() => {
        console.log(
          `${new Date().toUTCString()}: Markets fetched successfully.`
        );
      });
  }, 15 * 60 * 1000); // Every 15 minutes
}

main().catch((error) => {
  console.error(`CRITICAL ERROR`, error);
  process.exit(1);
});
