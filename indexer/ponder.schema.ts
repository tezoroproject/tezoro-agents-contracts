import { onchainTable, relations } from "ponder";

/* ─────────── tables ─────────── */

export const token = onchainTable("token", (t) => ({
  address: t.hex().primaryKey(),
  symbol: t.text(),
  name: t.text(),
  decimals: t.integer().notNull(),
}));

export const agent = onchainTable("agent", (t) => ({
  id: t.hex().primaryKey(),
  creator: t.hex().notNull(),
  adapters: t.hex().array().notNull(),
  disabledAt: t.bigint(),
  createdAt: t.bigint().notNull(),
}));

export const market = onchainTable("market", (t) => ({
  id: t.hex().primaryKey(),
  protocolCode: t.integer().notNull(),
  loanToken: t.hex().notNull(),
  collateralToken: t.hex().notNull(),
  marketAddress: t.hex().notNull(),
  auxId: t.hex().notNull(),
  flags: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const position = onchainTable("position", (t) => ({
  id: t.text().primaryKey(),
  agent: t.hex().notNull(),
  token: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const allocation = onchainTable("allocation", (t) => ({
  id: t.text().primaryKey(),
  positionId: t.text().notNull(),
  marketId: t.hex().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const rewardClaim = onchainTable("rewardClaim", (t) => ({
  id: t.text().primaryKey(),
  allocationId: t.text().notNull(),
  token: t.hex().notNull(),
  rewardToken: t.hex().notNull(),
  amount: t.bigint().notNull(),
  recipient: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const withdrawal = onchainTable("withdrawal", (t) => ({
  id: t.text().primaryKey(),
  allocationId: t.text().notNull(),
  marketId: t.hex().notNull(),
  amount: t.bigint().notNull(),
  managementFee: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const borrow = onchainTable("borrow", (t) => ({
  id: t.text().primaryKey(),
  agent: t.hex().notNull(),
  marketId: t.hex().notNull(),
  minAmount: t.bigint().notNull(),
  maxAmount: t.bigint(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

export const repay = onchainTable("repay", (t) => ({
  id: t.text().primaryKey(),
  agent: t.hex().notNull(),
  marketId: t.hex().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

/* ─────────── relations ─────────── */

export const agentRelations = relations(agent, ({ many }) => ({
  positions: many(position),
  loans: many(borrow),
  repayments: many(repay),
}));

export const allocationRelations = relations(allocation, ({ one, many }) => ({
  position: one(position, {
    fields: [allocation.positionId],
    references: [position.id],
  }),
  market: one(market, {
    fields: [allocation.marketId],
    references: [market.id],
  }),
  withdrawal: one(withdrawal, {
    fields: [allocation.id],
    references: [withdrawal.allocationId],
  }),
  rewardClaims: many(rewardClaim),
}));

export const positionRelations = relations(position, ({ many, one }) => ({
  allocations: many(allocation),
  agent: one(agent, {
    fields: [position.agent],
    references: [agent.id],
  }),
  token: one(token, {
    fields: [position.token],
    references: [token.address],
  }),
}));

export const marketRelations = relations(market, ({ many, one }) => ({
  allocations: many(allocation),
  collateralToken: one(token, {
    fields: [market.collateralToken],
    references: [token.address],
  }),
  loanToken: one(token, {
    fields: [market.loanToken],
    references: [token.address],
  }),
}));

export const rewardRelations = relations(rewardClaim, ({ one }) => ({
  allocation: one(allocation, {
    fields: [rewardClaim.allocationId],
    references: [allocation.id],
  }),
}));

export const withdrawalRelations = relations(withdrawal, ({ one }) => ({
  allocation: one(allocation, {
    fields: [withdrawal.allocationId],
    references: [allocation.id],
  }),
}));

export const borrowRelations = relations(borrow, ({ one }) => ({
  agent: one(agent, {
    fields: [borrow.agent],
    references: [agent.id],
  }),
  market: one(market, {
    fields: [borrow.marketId],
    references: [market.id],
  }),
}));

export const repayRelations = relations(repay, ({ one }) => ({
  agent: one(agent, {
    fields: [repay.agent],
    references: [agent.id],
  }),
  market: one(market, {
    fields: [repay.marketId],
    references: [market.id],
  }),
}));
