import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { Address, createPublicClient, erc20Abi, getContract, http } from "viem";
import { base } from "viem/chains";
import { normalizeAddress } from "./utils";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.PONDER_RPC_URL_8453),
});

const getTokenInfo = async (address: Address) => {
  const [symbolCall, nameCall, decimalsCall] = await publicClient.multicall({
    contracts: [
      { abi: erc20Abi, address, functionName: "symbol" },
      { abi: erc20Abi, address, functionName: "name" },
      { abi: erc20Abi, address, functionName: "decimals" },
    ],
    allowFailure: true,
  });

  return {
    address,
    symbol: symbolCall.status === "success" ? symbolCall.result : null,
    name: nameCall.status === "success" ? nameCall.result : null,
    decimals: decimalsCall.status === "success" ? decimalsCall.result : 18,
  };
};

ponder.on("TezoroLendingAgent:Borrowed", async ({ event, context }) => {
  const agent = normalizeAddress(event.log.address);
  const token = normalizeAddress(event.args.token);

  const borrowId = `${agent}-${token}-${event.args.marketId}-${event.transaction.hash}-${event.log.logIndex}`;

  await context.db.insert(schema.borrow).values({
    id: borrowId,
    agent,
    minAmount: event.args.minAmount,
    maxAmount: event.args.maxAmount ?? null,
    marketId: event.args.marketId,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("TezoroLendingAgent:Repaid", async ({ event, context }) => {
  const agent = normalizeAddress(event.log.address);
  const token = normalizeAddress(event.args.token);
  const repayId = `${agent}-${token}-${event.args.marketId}-${event.transaction.hash}-${event.log.logIndex}`;
  await context.db.insert(schema.repay).values({
    id: repayId,
    agent,
    amount: event.args.amount,
    marketId: event.args.marketId,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on(
  "TezoroLendingAgentFactory:AgentCreated",
  async ({ event, context }) => {
    await context.db.insert(schema.agent).values({
      id: event.args.agent,
      creator: normalizeAddress(event.args.creator),
      adapters: [...event.args.adapters.map(normalizeAddress)],
      createdAt: event.block.timestamp,
    });
  }
);

ponder.on("TezoroLendingAgent:AgentDeactivated", async ({ event, context }) => {
  await context.db
    .update(schema.agent, { id: event.log.address })
    .set({ disabledAt: event.block.timestamp });
});

ponder.on("TezoroLendingAgent:MarketRegistered", async ({ event, context }) => {
  const loanToken = normalizeAddress(event.args.market.loanToken);
  const collateralToken = normalizeAddress(event.args.market.collateralToken);

  // Check loan token exists
  const loanTokenExists = await context.db.find(schema.token, {
    address: loanToken,
  });
  if (!loanTokenExists) {
    // Fetch loan token details from the blockchain
    const { decimals, name, symbol } = await getTokenInfo(loanToken);

    // Insert loan token into the database
    await context.db
      .insert(schema.token)
      .values({
        address: loanToken,
        symbol: symbol,
        name: name,
        decimals: decimals,
      })
      .onConflictDoNothing();
  }

  // Check collateral token exists
  const collateralTokenExists = await context.db.find(schema.token, {
    address: collateralToken,
  });
  if (!collateralTokenExists) {
    // Fetch collateral token details from the blockchain
    const { decimals, name, symbol } = await getTokenInfo(collateralToken);
    // Insert collateral token into the database
    await context.db
      .insert(schema.token)
      .values({
        address: collateralToken,
        symbol: symbol,
        name: name,
        decimals: decimals,
      })
      .onConflictDoNothing();
  }

  await context.db
    .insert(schema.market)
    .values({
      id: event.args.marketId,
      agent: normalizeAddress(event.log.address),
      protocolCode: event.args.protocolCode,
      marketAddress: normalizeAddress(event.args.market.marketAddress),
      loanToken: loanToken,
      collateralToken: collateralToken,
      auxId: event.args.market.auxId,
      flags: event.args.market.flags,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoNothing();
});

ponder.on("TezoroLendingAgent:Supplied", async ({ event, context }) => {
  const agent = normalizeAddress(event.log.address);
  const token = normalizeAddress(event.args.token);
  const positionId = `${agent}-${token}`;
  const allocationId = `${positionId}-${
    event.args.marketId
  }-${event.args.nonce.toString()}`;

  // Check token exists
  const tokenExists = await context.db.find(schema.token, {
    address: token,
  });
  if (!tokenExists) {
    // Fetch token details from the blockchain
    const { decimals, name, symbol } = await getTokenInfo(token);

    // Insert token into the database
    await context.db
      .insert(schema.token)
      .values({
        address: token,
        symbol: symbol,
        name: name,
        decimals: decimals,
      })
      .onConflictDoNothing();
  }

  // upsert position
  await context.db
    .insert(schema.position)
    .values({
      id: positionId,
      agent,
      token: token,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoNothing();

  // allocation row
  await context.db.insert(schema.allocation).values({
    id: allocationId,
    positionId,
    marketId: event.args.marketId,
    amount: event.args.amount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on(
  "TezoroLendingAgent:RebalanceSupplied",
  async ({ event, context }) => {
    const agent = normalizeAddress(event.log.address);
    const token = normalizeAddress(event.args.token);
    const positionId = `${agent}-${token}`;
    const allocationId = `${positionId}-${
      event.args.toMarketId
    }-${event.args.allocationNonce.toString()}`;

    await context.db.insert(schema.allocation).values({
      id: allocationId,
      positionId,
      marketId: event.args.toMarketId,
      amount: event.args.amount,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
    });
  }
);

ponder.on("TezoroLendingAgent:Withdrawn", async ({ event, context }) => {
  const agent = normalizeAddress(event.log.address);
  const { marketId, nonce } = event.args;
  const token = normalizeAddress(event.args.token);
  const positionId = `${agent}-${token}`;

  const allocationId = `${positionId}-${marketId}-${nonce}`;

  await context.db.insert(schema.withdrawal).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    allocationId,
    marketId,
    amount: event.args.amount,
    managementFee: event.args.managementFee,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Remove position
  await context.db.delete(schema.position, { id: positionId });
});

ponder.on("TezoroLendingAgent:RewardsClaimed", async ({ event, context }) => {
  const agent = normalizeAddress(event.log.address);
  const token = normalizeAddress(event.args.token);
  const rewardToken = normalizeAddress(event.args.rewardToken);
  const positionId = `${agent}-${token}`;
  const allocationId = `${positionId}-${
    event.args.marketId
  }-${event.args.allocationNonce.toString()}`;

  // Check reward token exists
  const rewardTokenExists = await context.db.find(schema.token, {
    address: rewardToken,
  });
  if (rewardTokenExists === null) {
    // Fetch reward token details from the blockchain
    const { decimals, name, symbol } = await getTokenInfo(rewardToken);

    // Insert reward token into the database
    await context.db
      .insert(schema.token)
      .values({
        address: rewardToken,
        symbol: symbol,
        name: name,
        decimals: decimals,
      })
      .onConflictDoNothing();
  }

  await context.db.insert(schema.rewardClaim).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    allocationId,
    token: token,
    rewardToken: rewardToken,
    protocolCode: event.args.protocolCode,
    amount: event.args.amount,
    recipient: event.args.recipient,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});
