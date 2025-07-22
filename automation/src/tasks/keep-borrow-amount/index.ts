import { Address, erc20Abi, getContract, Hex, PrivateKeyAccount } from "viem";
import { Config } from "../../chain";
import { indexerSDK } from "../../clients/indexer";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import ILendingAdapterAbi from "../../blockchain/abis/ILendingAdapter.abi";
import { getTokenPriceInToken } from "../../clients/llama";
import { BigNumber } from "bignumber.js";
import { isMarketUsedAsCollateral } from "../../utils";
import { getMarkets } from "../../clients/tezoro-subgraph";
import { AbiParametersToPrimitiveTypes, ExtractAbiFunction } from "abitype";
import superjson from "superjson";

// Refill to "maxAmount" borrow asset on agent's owner address
// When current borrow asset balance is less than "minAmount"

const BORROW_PROTOCOL = 1; // AAVE_V3

export async function keepBorrowAmount(
  config: Config,
  account: PrivateKeyAccount
) {
  const { publicClient, walletClient, chain } = config;

  const markets = await getMarkets();

  const marketsDataInChain = markets.find((m) => m.chainId === chain.id);

  if (!marketsDataInChain) {
    console.error(
      `${new Date().toUTCString()}: [Keep Borrow Amount] No markets found for chain ${
        chain.name
      } (${chain.id}).`
    );
    return;
  }

  const { markets: marketsInChain } = marketsDataInChain;

  const {
    agents: { items: agents },
  } = await indexerSDK.allAgentsQuery();

  console.log(
    `${new Date().toUTCString()}: [Keep Borrow Amount] Found ${
      agents.length
    } agents on ${publicClient.chain?.name}.`
  );

  for (const agent of agents) {
    const tezoroAgentContract = getContract({
      abi: TezoroLendingAgentAbi,
      address: agent.id as Address,
      client: walletClient,
    });
    const { positions } = await indexerSDK.agentPositionsQuery({
      agentAddress: agent.id,
    });

    if (positions.items.length === 0) {
      console.log(
        `${new Date().toUTCString()}: [Keep Borrow Amount] Agent ${
          agent.id
        } has no positions. Skipping.`
      );
      continue;
    }

    console.log(
      `${new Date().toUTCString()}: [Keep Borrow Amount] Agent ${
        agent.id
      } has ${positions.items.length} positions.`
    );

    type Position = NonNullable<(typeof positions.items)[number]>;
    type Allocation = NonNullable<Position["allocations"]>["items"][number];
    type Market = Allocation["market"];

    const assetsReserves: {
      protocol: number;
      market: Market;
      availableUserBalance: bigint;
      supplied: bigint;
      isUsedAsCollateral: boolean;
    }[] = [];

    for (const position of positions.items) {
      if (!position.allocations?.items?.length) {
        throw new Error(
          `No allocations found for position ${position.id} of agent ${agent.id}`
        );
      }

      const lastAllocation = position.allocations.items
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
        .at(-1);

      if (!lastAllocation) {
        console.error(
          `${new Date().toUTCString()}: [Keep Borrow Amount] No last allocation found for position ${
            position.id
          } of agent ${agent.id}. Skipping.`
        );
        continue;
      }

      if (lastAllocation.withdrawal) {
        console.warn(
          `${new Date().toUTCString()}: [Keep Borrow Amount] Skipping position ${
            position.id
          } of agent ${
            agent.id
          } due to withdrawal in last allocation (position closed).`
        );
        continue;
      }

      const { market } = lastAllocation;

      if (
        !market ||
        !market.protocolCode ||
        !market.collateralToken?.address ||
        !market.loanToken?.address
      ) {
        throw new Error(
          `Incomplete market data in allocation for agent ${agent.id}, token ${position.token?.address}`
        );
      }

      const supplied = BigInt(lastAllocation.amount);

      const isUsedAsCollateral = await isMarketUsedAsCollateral(
        agent.id as Address,
        market.protocolCode,
        {
          auxId: market.auxId as Hex,
          collateralToken: market.collateralToken.address as Address,
          flags: market.flags,
          loanToken: market.loanToken.address as Address,
          marketAddress: market.marketAddress as Address,
        },
        publicClient,
        account
      );

      const ownerAllowance = await publicClient.readContract({
        abi: erc20Abi,
        address: market.collateralToken.address as Address,
        functionName: "allowance",
        args: [agent.creator as Address, agent.id as Address],
      });

      const ownerBalance = await publicClient.readContract({
        abi: erc20Abi,
        address: market.collateralToken.address as Address,
        functionName: "balanceOf",
        args: [agent.creator as Address],
      });

      const availableUserBalance =
        ownerBalance < ownerAllowance ? ownerBalance : ownerAllowance;

      console.log(`[DEBUG] Owner balance: ${ownerBalance.toString()}`);
      console.log(`[DEBUG] Owner allowance: ${ownerAllowance.toString()}`);
      console.log(`[DEBUG] Supplied amount: ${supplied.toString()}`);

      assetsReserves.push({
        protocol: market.protocolCode,
        market,
        availableUserBalance,
        supplied,
        isUsedAsCollateral:
          isUsedAsCollateral || market.protocolCode === BORROW_PROTOCOL,
      });
    }

    console.log(
      `${new Date().toUTCString()}: [Keep Borrow Amount] Agent ${
        agent.id
      } has ${assetsReserves.length} asset reserves.`
    );

    const collateralReserves = assetsReserves.filter(
      (a) => a.isUsedAsCollateral
    );

    console.log(
      `${new Date().toUTCString()}: [Keep Borrow Amount] Agent ${
        agent.id
      } has ${collateralReserves.length} collateral reserves.`
    );
    // Ensure that all current collaterals in same protocol
    const collateralProtocolsSet = new Set(
      collateralReserves.map((c) => c.protocol)
    );

    if (collateralProtocolsSet.size > 1) {
      console.error(
        `${new Date().toUTCString()}: [Keep Borrow Amount]: Agent ${
          agent.id
        } has collateral reserves from different protocols: ${Array.from(
          collateralProtocolsSet
        ).join(", ")}. This is not supported yet.`
      );
      continue;
    }

    const collateralProtocol = collateralProtocolsSet.values().next().value;

    if (collateralProtocol === undefined) {
      console.error(
        `${new Date().toUTCString()}: [Keep Borrow Amount]: Agent ${
          agent.id
        } has no collateral reserves.`
      );
      continue;
    }

    if (assetsReserves.length === 0) {
      console.error(
        `${new Date().toUTCString()}: [Keep Borrow Amount]: Agent ${
          agent.id
        } has no supplied assets.`
      );
      continue;
    }

    const {
      borrows: { items: borrows },
    } = await indexerSDK.agentLoansQuery({ agentAddress: agent.id });

    if (borrows.length === 0) {
      console.log(
        `${new Date().toUTCString()}: [Keep Borrow Amount]: Agent ${
          agent.id
        } has no active borrows.`
      );
      continue;
    }

    for (const borrow of borrows) {
      const { market, maxAmount: targetAmount, minAmount } = borrow;

      if (!market) {
        console.log(
          `${new Date().toUTCString()}: [Keep Borrow Amount]: Missing market data for borrow ${
            borrow.id
          } on agent ${agent.id}.`
        );
        continue;
      }

      const { loanToken, collateralToken } = market;

      if (!loanToken || !collateralToken) {
        console.log(
          `${new Date().toUTCString()}: [Keep Borrow Amount]: Missing loan or collateral token data for borrow ${
            borrow.id
          } on agent ${agent.id}.`
        );
        continue;
      }

      if (!targetAmount || targetAmount === "0") {
        console.log(
          `${new Date().toUTCString()}: [Keep Borrow Amount]: Target amount set for borrow ${
            borrow.id
          } on agent ${agent.id} is ${targetAmount.toString()}. Skipping.`
        );
        continue;
      }

      const currentOwnerBalanceBigInt = await publicClient.readContract({
        abi: erc20Abi,
        address: loanToken.address as Address,
        functionName: "balanceOf",
        args: [agent.creator as Address],
      });

      if (currentOwnerBalanceBigInt >= minAmount) {
        console.log(
          `[Keep Borrow Amount]: No need to keep borrow amount for agent ${agent.id} on borrow ${borrow.id}. Current balance is ${currentOwnerBalanceBigInt} which is less than or equal to minAmount ${minAmount}.`
        );
        continue;
      }

      const adapter = await publicClient.readContract({
        abi: TezoroLendingAgentAbi,
        address: agent.id as Address,
        functionName: "protocolToAdapter",
        args: [market.protocolCode],
      });

      const borrowBalance = await publicClient.readContract({
        abi: ILendingAdapterAbi,
        address: adapter,
        functionName: "getBorrowBalance",
        args: [
          {
            loanToken: loanToken.address as Address,
            collateralToken: collateralToken.address as Address,
            marketAddress: market.marketAddress as Address,
            auxId: market.auxId as Hex,
            flags: market.flags,
          },
          agent.id as Address,
        ],
      });

      const currentDebt = new BigNumber(borrowBalance.toString()).div(
        new BigNumber(10).pow(loanToken.decimals)
      );

      if (currentDebt.isLessThanOrEqualTo(0)) {
        console.log(
          `[Keep Borrow Amount]: Agent ${agent.id} has no debt for borrow ${borrow.id}. Skipping.`
        );
        continue;
      }

      const missingLoanAmount =
        currentOwnerBalanceBigInt >= BigInt(targetAmount.toString())
          ? 0n
          : BigInt(targetAmount.toString()) - currentOwnerBalanceBigInt;

      const normalizedMissingAmount = new BigNumber(
        missingLoanAmount.toString()
      ).div(new BigNumber(10).pow(loanToken.decimals));

      console.log(
        `[Keep Borrow Amount]: Agent ${agent.id} has borrow ${
          borrow.id
        } with current debt ${currentDebt.toString()} ${
          loanToken.symbol
        }, target amount ${targetAmount}, and missing amount ${normalizedMissingAmount.toString()} ${
          loanToken.symbol
        }.`
      );

      const agentProtocols = await publicClient.multicall({
        contracts: agent.adapters.map(
          (adapter) =>
            ({
              abi: ILendingAdapterAbi,
              address: adapter as Address,
              functionName: "protocolCode",
            } as const)
        ),
        allowFailure: false,
      });

      if (normalizedMissingAmount.isPositive()) {
        let totalBorrowableNow = new BigNumber(0);
        const breakdown: { symbol: string; amount: string }[] = [];

        for (const c of collateralReserves) {
          console.log(
            `[Keep Borrow Amount]: Processing collateral reserve for agent ${agent.id} on borrow ${borrow.id}.`
          );
          const collateralMarket = c.market;
          if (!collateralMarket) {
            console.log(
              `[Keep Borrow Amount]: No market data for collateral reserve. Skipping.`
            );
            continue;
          }
          const collateralAddr =
            collateralMarket.collateralToken?.address.toLowerCase();
          const collateralSymbol =
            collateralMarket.collateralToken?.symbol ?? "UNKNOWN";

          const availableSupplied = new BigNumber(c.supplied.toString()).div(
            new BigNumber(10).pow(
              collateralMarket.collateralToken?.decimals ?? 0
            )
          );

          const bestMarket = marketsInChain.find(
            (m) =>
              m.collateralAsset.token.address.toLowerCase() ===
                collateralAddr &&
              m.loanAsset.token.address.toLowerCase() ===
                loanToken.address.toLowerCase() &&
              agentProtocols.includes(m.protocol)
          );

          if (!bestMarket) {
            console.log(
              `[Keep Borrow Amount]: No matching market found for ${collateralSymbol}. Skipping.`
            );
            continue;
          }

          const ltv = bestMarket.collateralAsset.policy.ltv;

          const price = await getTokenPriceInToken(
            "base",
            collateralMarket.collateralToken?.address as Address,
            "base",
            loanToken.address as Address
          );

          const borrowable = availableSupplied
            .multipliedBy(price)
            .multipliedBy(ltv);
          totalBorrowableNow = totalBorrowableNow.plus(borrowable);
          breakdown.push({
            symbol: collateralSymbol,
            amount: borrowable.toString(),
          });
        }

        console.log(
          `[Keep Borrow Amount]: Agent ${
            agent.id
          } can borrow TOTAL ${totalBorrowableNow.toString()} ${
            loanToken.symbol
          } using existing collateral: ${superjson.stringify(breakdown)}`
        );

        const maxAdditionalBorrow = totalBorrowableNow.minus(currentDebt);

        console.log(
          `[Keep Borrow Amount]: Agent ${
            agent.id
          } can additionally borrow ${maxAdditionalBorrow.toString()} ${
            loanToken.symbol
          }.`
        );

        // Step 1: Try to borrow with existing collateral
        if (
          maxAdditionalBorrow.isGreaterThanOrEqualTo(normalizedMissingAmount)
        ) {
          const amountToBorrow = normalizedMissingAmount
            .multipliedBy(new BigNumber(10).pow(loanToken.decimals))
            .toFixed(0, BigNumber.ROUND_UP);

          if (!borrow.market) {
            console.error(
              `[Keep Borrow Amount]: Missing market data for borrow ${borrow.id} on agent ${agent.id}. Skipping.`
            );
            continue;
          }

          const borrowArgs = [
            borrow.market.protocolCode,
            {
              loanToken: borrow.market.loanToken?.address as Address,
              collateralToken: borrow.market.collateralToken
                ?.address as Address,
              marketAddress: borrow.market.marketAddress as Address,
              auxId: borrow.market.auxId as Hex,
              flags: borrow.market.flags,
            },
            BigInt(amountToBorrow),
            0n,
          ] as const;

          try {
            const hash = await tezoroAgentContract.write.borrow(borrowArgs, {
              account,
              chain,
            });

            console.log(
              `[Keep Borrow Amount]: Agent ${agent.id} borrowed ${amountToBorrow} ${loanToken.symbol} for borrow ${borrow.id}. Tx hash: ${hash}`
            );
          } catch (error) {
            console.error(
              `[Keep Borrow Amount]: Agent ${agent.id} failed to borrow ${amountToBorrow} ${loanToken.symbol} for borrow ${borrow.id}. Attempting to simulate...`,
              error
            );
            const { request, result } = await publicClient.simulateContract({
              address: agent.id as Address,
              abi: TezoroLendingAgentAbi,
              functionName: "borrow",
              args: borrowArgs,
              account,
            });

            console.log(
              `[Keep Borrow Amount]: Simulation result for borrow: ${superjson.stringify(
                result
              )}`
            );
            console.log(
              `[Keep Borrow Amount]: Simulation request: ${superjson.stringify(
                request
              )}`
            );
          }
        } else {
          console.log(
            `[Keep Borrow Amount]: Agent ${
              agent.id
            } CANNOT cover missing amount ${normalizedMissingAmount.toString()} ${
              loanToken.symbol
            } using current collateral. Can borrow only ${maxAdditionalBorrow.toString()}. Proceeding to collateral reallocation...`
          );

          // Step 2: Try to convert other assets into collateral (put it to collateralProtocol)

          type Step = AbiParametersToPrimitiveTypes<
            ExtractAbiFunction<
              typeof TezoroLendingAgentAbi,
              "rebalance"
            >["inputs"]
          >[number][number];

          const unusedReserves = assetsReserves.filter(
            (r) => !r.isUsedAsCollateral
          );

          const steps: Step[] = [];

          for (const reserve of unusedReserves) {
            const fromMarket = reserve.market;

            if (!fromMarket) {
              console.log(
                `[Keep Borrow Amount]: No market data for reserve ${reserve.protocol} on agent ${agent.id}. Skipping.`
              );
              continue;
            }

            const toMarket = marketsInChain.find(
              (m) =>
                m.collateralAsset.token.address.toLowerCase() ===
                  fromMarket.collateralToken?.address.toLowerCase() &&
                m.protocol === collateralProtocol
            );

            if (!toMarket) {
              console.log(
                `[Keep Borrow Amount]: No destination market found to move ${fromMarket.collateralToken?.symbol}. Skipping.`
              );
              continue;
            }

            const fromProtocol = reserve.protocol;
            const toProtocol = collateralProtocol;

            steps.push({
              fromMarket: {
                collateralToken: fromMarket.collateralToken?.address as Address,
                loanToken: fromMarket.loanToken?.address as Address,
                marketAddress: fromMarket.marketAddress as Address,
                auxId: fromMarket.auxId as Hex,
                flags: fromMarket.flags,
              },
              toMarket: {
                collateralToken: toMarket.collateralAsset.token
                  .address as Address,
                loanToken: toMarket.loanAsset.token.address as Address,
                marketAddress: toMarket.marketAddress as Address,
                auxId: toMarket.auxId as Hex,
                flags: toMarket.flags,
              },
              fromProtocolCode: Number(fromProtocol),
              toProtocolCode: Number(toProtocol),
            });
          }

          if (steps.length > 0) {
            console.log(
              `[Keep Borrow Amount]: Agent ${agent.id} will perform ${steps.length} rebalance step(s) to convert unused assets into collateral.`
            );

            const hash = await tezoroAgentContract.write.rebalance([steps], {
              account: account.address,
              chain,
            });

            console.log(
              `[Keep Borrow Amount]: Agent ${agent.id} performed rebalance. Tx: ${hash}`
            );
          } else {
            console.log(
              `[Keep Borrow Amount]: Agent ${agent.id} has no unused reserves suitable for reallocation.`
            );
          }
        }
      }
    }
  }
}
