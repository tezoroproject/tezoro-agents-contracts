// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {TezoroYieldLib} from "../libs/TezoroYieldLib.sol";

interface IYieldAdapterWithRewards {
    // @notice Returns calldata needed to perform claim rewards via external agent
    // @dev Used in protocols like Aave that require rewards to be claimed by the depositor contract
    function getClaimRewardsCallData(
        TezoroYieldLib.Market[] memory markets,
        address user
    ) external view returns (address target, bytes memory callData);

    /// @notice Returns list of reward tokens for given asset
    function getRewardTokensForMarket(
        TezoroYieldLib.Market calldata market
    ) external view returns (address[] memory);

    function getRewardBalances(
        TezoroYieldLib.Market[] calldata markets,
        address user
    ) external view returns (TezoroYieldLib.RewardBalance[] memory rewards);
}
