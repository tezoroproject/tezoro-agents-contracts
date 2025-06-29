// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {TezoroLendingLib} from "../libs/TezoroLendingLib.sol";

interface ILendingAdapterWithRewards {
    // @notice Returns calldata needed to perform claim rewards via external agent
    // @dev Used in protocols like Aave that require rewards to be claimed by the depositor contract
    function getClaimRewardsCallData(
        TezoroLendingLib.Market[] memory markets,
        address user
    ) external view returns (address target, bytes memory callData);

    /// @notice Returns list of reward tokens for given asset
    function getRewardTokensForMarket(
        TezoroLendingLib.Market calldata market
    ) external view returns (address[] memory);

    function getRewardBalances(
        TezoroLendingLib.Market[] calldata markets,
        address user
    ) external view returns (TezoroLendingLib.RewardBalance[] memory rewards);
}
