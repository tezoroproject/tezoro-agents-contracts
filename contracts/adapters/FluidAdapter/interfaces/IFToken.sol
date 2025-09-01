// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IFToken {
    function deposit(
        uint256 assets_,
        address receiver_
    ) external returns (uint256 shares_);

    function redeem(
        uint256 shares_,
        address receiver_,
        address owner_
    ) external returns (uint256 assets_);

    function balanceOf(address account) external view returns (uint256);
}
