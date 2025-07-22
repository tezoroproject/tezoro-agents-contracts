// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

library TezoroLendingLib {
    enum Flags {
        ISOLATED, // Risk-isolated market
        P2P, // Peer-to-peer matching overlay
        NFT_POS, // Position is represented by an NFT
        FIXED_RATE, // Fixed-rate / fixed-term market
        PERMISSION, // Permissioned / KYC pool
        META_VAULT, // Meta-vault (e.g. 4626 vaults over other markets)
        MARGIN // Margin / leverage position
    }

    // struct MarketLeg {
    //     address token; // ERC-20 you interact with
    //     address market; // Pool / vault / silo contract
    //     bytes32 auxId; // Extra id (e.g. a cToken hash, tranche id)
    // }

    // struct UniversalMarket {
    //     // leg you DEPOSIT into (may or may not earn yield)
    //     MarketLeg supply;
    //     // leg you DRAW a debt from (may be identical to `supply`)
    //     MarketLeg borrow;
    //     uint16 protocolCode; // compressed protocol + major-version tag
    //     uint32 flags; // bitfield for traits (isolated, variable-rate only, …)
    // }

    struct Market {
        address loanToken; // Asset a user receives / owes (e.g. DAI)
        address collateralToken; // Asset pledged as collateral (zero if N/A)
        address marketAddress; // Pool / vault / silo contract address
        bytes32 auxId; // Extra identifier when an address is insufficient
        // uint16 protocolCode; // Compact code for protocol & major version
        uint16 flags; // Bit-field for market traits
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
        TezoroLendingLib.Market memory k
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    protocolCode,
                    k.loanToken,
                    k.collateralToken,
                    k.marketAddress,
                    k.auxId,
                    k.flags
                )
            );
    }
}
