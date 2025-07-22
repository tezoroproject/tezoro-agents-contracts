import { Address, erc20Abi, getContract, Hex, PrivateKeyAccount } from "viem";
import { Config } from "../../chain";
import { indexerSDK } from "../../clients/indexer";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import { MarketKey } from "../../types";
import ILendingAdapterAbi from "../../blockchain/abis/ILendingAdapter.abi";
import { BigNumber } from "bignumber.js";
import { isMarketUsedAsCollateral } from "../../utils";

const DANGER_HEALTH_FACTOR = 1.1; // Below this value, we consider the position at risk of liquidation

export async function protectFromLiquidation(
  config: Config,
  account: PrivateKeyAccount
) {
  const { publicClient, walletClient, chain } = config;

  const {
    agents: { items: agents },
  } = await indexerSDK.allAgentsQuery();

  console.log(
    `${new Date().toUTCString()}: [Liquidation Protection]: On ${
      publicClient.chain?.name
    } found ${agents.length} agents.`
  );

  // 1. Repay
  // 2. Add a little collateral
  for (const agent of agents) {
    const { positions } = await indexerSDK.agentPositionsQuery({
      agentAddress: agent.id,
    });

    if (positions.items.length === 0) {
      console.log(
        `${new Date().toUTCString()}: [Liquidation Protection] No positions found for agent ${
          agent.id
        }. Skipping.`
      );
      continue;
    }

    console.log(
      `${new Date().toUTCString()}: [Liquidation Protection] Found ${
        positions.items.length
      } positions for agent ${agent.id}`
    );

    const { borrows } = await indexerSDK.agentLoansQuery({
      agentAddress: agent.id,
    });

    if (borrows.items.length === 0) {
      console.log(
        `${new Date().toUTCString()}: [Liquidation Protection] No borrows found for agent ${
          agent.id
        }. Skipping.`
      );
      continue;
    }

    console.log(
      `${new Date().toUTCString()}: [Liquidation Protection] Found ${
        borrows.items.length
      } borrows for agent ${agent.id}`
    );

    // Define collaterals
    const collaterals: {
      protocol: number;
      market: MarketKey;
    }[] = [];
    for (const position of positions.items) {
      if (position.allocations?.items === undefined) {
        throw new Error(
          `Allocations not found for position ${position.id} of agent ${agent.id}`
        );
      }
      const sortedAllocations = position.allocations.items.sort(
        (a, b) => Number.parseInt(a.timestamp) - Number.parseInt(b.timestamp)
      );

      const lastAllocation = sortedAllocations[sortedAllocations.length - 1];
      if (!lastAllocation) {
        throw new Error(
          `No last allocation found for token ${position.token?.address} of agent ${agent.id}`
        );
      }

      const market = lastAllocation.market;
      if (market === undefined || market === null) {
        throw new Error(
          `Last allocation for token ${position.token?.address} of agent ${agent.id} has no market`
        );
      }

      const protocolCode = market.protocolCode;
      if (protocolCode === undefined) {
        throw new Error(
          `Last allocation for token ${position.token?.address} of agent ${agent.id} has no protocol code`
        );
      }

      const collateralTokenAddress = market.collateralToken?.address;
      if (collateralTokenAddress === undefined) {
        throw new Error(
          `Last allocation for token ${position.token?.address} of agent ${agent.id} has no collateral token address`
        );
      }

      const loanTokenAddress = market.loanToken?.address;
      if (loanTokenAddress === undefined) {
        throw new Error(
          `Last allocation for token ${position.token?.address} of agent ${agent.id} has no loan token address`
        );
      }
      const isCollateralized = await isMarketUsedAsCollateral(
        agent.id as Address,
        protocolCode,
        {
          auxId: market.auxId as Hex,
          collateralToken: collateralTokenAddress as Address,
          flags: market.flags,
          loanToken: loanTokenAddress as Address,
          marketAddress: market.marketAddress as Address,
        },
        publicClient,
        account
      );

      if (isCollateralized) {
        collaterals.push({
          protocol: protocolCode,
          market: {
            auxId: market.auxId as Hex,
            collateralToken: collateralTokenAddress as Address,
            flags: market.flags,
            loanToken: loanTokenAddress as Address,
            marketAddress: market.marketAddress as Address,
          },
        });
      }
    }

    // Define borrows and their health ratio
    const borrowsInfo: {
      market: MarketKey;
      protocol: number;
      healthFactor: number;
      adapter: Address;
      amount: string;
    }[] = [];

    for (const borrow of borrows.items) {
      if (borrow.market === undefined || borrow.market === null) {
        throw new Error(
          `Borrow ${borrow.id} of agent ${agent.id} has no market`
        );
      }

      const adapter = await publicClient.readContract({
        abi: TezoroLendingAgentAbi,
        address: agent.id as Address,
        functionName: "protocolToAdapter",
        args: [borrow.market.protocolCode],
      });

      const loanTokenAddress = borrow.market.loanToken?.address;
      if (loanTokenAddress === undefined) {
        throw new Error(
          `Borrow ${borrow.id} of agent ${agent.id} has no loan token address`
        );
      }

      const collateralTokenAddress = borrow.market.collateralToken?.address;
      if (collateralTokenAddress === undefined) {
        throw new Error(
          `Borrow ${borrow.id} of agent ${agent.id} has no collateral token address`
        );
      }

      const healthFactor = await publicClient.readContract({
        abi: ILendingAdapterAbi,
        address: adapter,
        functionName: "getHealthFactor",
        args: [
          {
            loanToken: loanTokenAddress as Address,
            collateralToken: collateralTokenAddress as Address,
            marketAddress: borrow.market.marketAddress as Address,
            auxId: borrow.market.auxId as Hex,
            flags: borrow.market.flags,
          },
          agent.id as Address,
        ],
      });

      const amount = borrow.maxAmount ?? borrow.minAmount;

      borrowsInfo.push({
        market: {
          auxId: borrow.market.auxId as Hex,
          collateralToken: collateralTokenAddress as Address,
          flags: borrow.market.flags,
          loanToken: loanTokenAddress as Address,
          marketAddress: borrow.market.marketAddress as Address,
        },
        healthFactor: Number(healthFactor.toString()) / 1e18,
        protocol: borrow.market.protocolCode,
        adapter,
        amount,
      });
    }

    // Check if any borrow is at risk of liquidation
    const atRiskBorrows = borrowsInfo.filter(
      (borrow) => borrow.healthFactor < DANGER_HEALTH_FACTOR
    );

    if (atRiskBorrows.length === 0) {
      console.log(
        `${new Date().toUTCString()}: [Liquidation Protection] No borrows at risk of liquidation for agent ${
          agent.id
        }.`
      );
      continue;
    }

    console.log(
      `${new Date().toUTCString()}: [Liquidation Protection] Found ${
        atRiskBorrows.length
      } borrows at risk of liquidation for agent ${agent.id}.`
    );

    const tezoroAgentContract = getContract({
      abi: TezoroLendingAgentAbi,
      address: agent.id as Address,
      client: walletClient,
    });

    for (const borrow of atRiskBorrows) {
      console.log(
        `${new Date().toUTCString()}: [Liquidation Protection] Borrow at risk: ${JSON.stringify(
          borrow
        )}`
      );

      // How much token approved by user to agent?
      const borrowAssetAllowance = await publicClient.readContract({
        abi: erc20Abi,
        address: borrow.market.loanToken,
        functionName: "allowance",
        args: [agent.creator as Address, agent.id as Address],
      });
      const borrowAssetDecimals = await publicClient.readContract({
        abi: erc20Abi,
        address: borrow.market.loanToken,
        functionName: "decimals",
      });

      const borrowBalance = await publicClient.readContract({
        abi: ILendingAdapterAbi,
        address: borrow.adapter,
        functionName: "getBorrowBalance",
        args: [
          {
            loanToken: borrow.market.loanToken,
            collateralToken: borrow.market.collateralToken,
            marketAddress: borrow.market.marketAddress,
            auxId: borrow.market.auxId,
            flags: borrow.market.flags,
          },
          agent.id as Address,
        ],
      });

      const availableToRepay = new BigNumber(
        borrowAssetAllowance.toString()
      ).dividedBy(new BigNumber(10).pow(borrowAssetDecimals));

      const debt = new BigNumber(borrowBalance.toString() ?? "0").dividedBy(
        new BigNumber(10).pow(borrowAssetDecimals)
      );
      const loanAmount = new BigNumber(borrow.amount.toString()).dividedBy(
        new BigNumber(10).pow(borrowAssetDecimals)
      );
      const accruedInterestAmount = debt.minus(loanAmount);

      if (accruedInterestAmount.isLessThanOrEqualTo(0)) {
        console.log(
          `${new Date().toUTCString()}: [Liquidation Protection] No accrued interest for borrow ${
            borrow.market.marketAddress
          } of agent ${agent.id}. Skipping.`
        );
        continue;
      }

      if (availableToRepay.gte(accruedInterestAmount)) {
        console.log(
          `${new Date().toUTCString()}: [Liquidation Protection] Repaying borrow ${
            borrow.market.marketAddress
          } of agent ${
            agent.id
          } with amount ${accruedInterestAmount.toString()}`
        );

        const blockchainAmount = accruedInterestAmount
          .multipliedBy(new BigNumber(10).pow(borrowAssetDecimals))
          .toFixed(0, BigNumber.ROUND_DOWN);

        const hash = await tezoroAgentContract.write.repay(
          [borrow.protocol, borrow.market, BigInt(blockchainAmount.toString())],
          {
            account: account.address,
            chain,
          }
        );

        console.log(
          `${new Date().toUTCString()}: [Liquidation Protection] Repay transaction sent: ${hash}`
        );
      } else {
        console.log(
          `${new Date().toUTCString()}: [Liquidation Protection] Not enough allowance to repay borrow ${
            borrow.market.marketAddress
          } of agent ${
            agent.id
          }. Available: ${availableToRepay.toString()}, required: ${accruedInterestAmount.toString()}. Try to add more collateral.`
        );

        // Try to add collateral
        if (collaterals.length === 0) {
          console.log(
            `${new Date().toUTCString()}: [Liquidation Protection] No collaterals found for agent ${
              agent.id
            }. Cannot add collateral.`
          );
          continue;
        }

        for (const collateral of collaterals) {
          console.log(
            `${new Date().toUTCString()}: [Liquidation Protection] Adding collateral ${
              collateral.market.marketAddress
            } to agent ${agent.id}`
          );

          const collateralBalance = await publicClient.readContract({
            abi: erc20Abi,
            address: collateral.market.collateralToken,
            functionName: "balanceOf",
            args: [agent.creator as Address],
          });

          const collateralAllowance = await publicClient.readContract({
            abi: erc20Abi,
            address: collateral.market.collateralToken,
            functionName: "allowance",
            args: [agent.creator as Address, agent.id as Address],
          });

          const availableCollateral =
            collateralBalance > collateralAllowance
              ? collateralAllowance
              : collateralBalance;

          const forDistribute = availableCollateral / 10n;

          const hash = await tezoroAgentContract.write.distribute(
            [
              [collateral.market.collateralToken],
              [collateral.protocol],
              [collateral.market],
              [forDistribute],
            ],
            {
              account: account.address,
              chain,
            }
          );

          console.log(
            `${new Date().toUTCString()}: [Liquidation Protection] Add collateral transaction sent: ${hash}`
          );

          console.log(
            `${new Date().toUTCString()}: [Liquidation Protection] Added collateral ${
              collateral.market.collateralToken
            } to agent ${agent.id} with amount ${forDistribute}`
          );
        }
      }
    }
  }
}
