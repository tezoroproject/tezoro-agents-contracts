// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface CometRewardsInterface {
    struct RewardOwed {
        address token;
        uint owed;
    }

    struct RewardConfig {
        address token;
        uint64 rescaleFactor;
        bool shouldUpscale;
        uint256 multiplier;
    }

    function getRewardOwed(
        address comet,
        address account
    ) external returns (RewardOwed memory);

    function rewardConfig(
        address comet
    ) external view returns (RewardConfig memory);

    function claim(address comet, address src, bool shouldAccrue) external;

    function rewardsClaimed(
        address comet,
        address user
    ) external view returns (uint256);
}
