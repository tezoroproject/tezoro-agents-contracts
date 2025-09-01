# TezoroYieldAgent

TezoroYieldAgent is a modular yield router that connects to multiple DeFi yield protocols through adapters.

## Core Features

**Multi-Protocol Support** - Works with different yield protocols via standardized adapters

**Dynamic Rebalancing** - Moves funds between protocols based on defined strategies

**Reward Collection** - Harvests protocol rewards and sends them to the owner

**Batch Operations** - Withdraws from multiple protocols in a single transaction

**Permission System** - Owner and keeper roles control critical functions

**Event Logging** - Comprehensive events for tracking and analytics

Deployment requires TezoroYieldAgentFactory. Protocol interactions happen through adapters implementing IYieldAdapter or IYieldAdapterWithRewards.

---

# TezoroYieldAgentFactory

Factory contract for deploying TezoroYieldAgent instances using EIP-1167 clones.

## Responsibilities

**Agent Deployment** - Creates lightweight agent clones from base implementation

**Adapter Setup** - Validates and configures protocol adapters during initialization

**Keeper Registry** - Manages authorized addresses for rebalancing and distributions

**Fee Management** - Sets yearly management fees (capped at 1%)

Single deployment per version. Agents reference the factory for permissions and configuration.

---

# IYieldAdapter Interface

Standardized interface for protocol adapters used by TezoroYieldAgent to interact with external yield protocols like Aave, Compound, Morpho, and Fluid.

## Core Methods

### Protocol Info
- `protocolCode()` - Unique identifier for the protocol
- `name()` - Human-readable adapter name

### Supply Operations
- `getSupplyCallData(market, amount, user)` - Returns calldata for supplying assets
- `getWithdrawCallData(market, user)` - Returns calldata for full withdrawal
- `getSupplyBalance(market, user)` - Current supplied balance

---

# Architecture Benefits

## Gas Optimization
Protocol-specific code lives in lightweight adapters, reducing main contract complexity. EIP-1167 clones enable cheap deployment of isolated agent instances.

## Modularity
Plug-and-play adapter system allows protocol integration without core contract changes. Cross-protocol operations work through unified interfaces.

## Security
Strict permission controls with owner and keeper roles. Reentrancy protection and fail-safe reward claiming prevent common attack vectors. Agent isolation eliminates shared state risks.

## Scalability
Agents coordinate without heavy on-chain storage. Off-chain strategies remain compatible through event monitoring. Supports automated vaults, custom strategies, and delegated management.

This framework enables efficient multi-protocol asset management in DeFi through standardized interfaces and isolated execution environments.
