// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

library TezoroYieldLib {
    struct MarketLeg {
        address token; // ERC-20 you interact with
        address market; // Pool / vault / silo contract
        bytes32 auxId; // Extra id (e.g. a cToken hash, tranche id)
    }

    struct Market {
        // leg you DEPOSIT into (may or may not earn yield)
        MarketLeg supply;
        // leg you DRAW a debt from (may be identical to `supply`)
        MarketLeg borrow;
        uint32 flags; // bitfield for traits (isolated, variable-rate only, …)
    }

    struct RewardBalance {
        Market market;
        address[] rewardTokens;
        uint256[] amounts;
    }

    struct RebalanceStep {
        Market fromMarket;
        Market toMarket;
        uint16 fromProtocolCode;
        uint16 toProtocolCode;
    }

    function toMarketId(
        uint16 protocolCode,
        Market memory k
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(protocolCode, k.supply, k.borrow, k.flags));
    }
}
