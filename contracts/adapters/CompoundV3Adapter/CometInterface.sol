// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface CometInterface {
    struct UserCollateral {
        uint128 balance;
        uint128 _reserved;
    }

    struct AssetInfo {
        uint8 offset;
        address asset;
        address priceFeed;
        uint64 scale;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    function supply(address asset, uint amount) external;

    function transfer(address dst, uint amount) external returns (bool);

    function withdraw(address asset, uint amount) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function baseToken() external view returns (address);

    function baseTrackingAccrued(
        address account
    ) external view returns (uint64);

    function baseTrackingSupplySpeed() external view returns (uint64);

    function baseAccrualScale() external pure returns (uint64);

    function accrueAccount(address account) external;

    function borrowBalanceOf(address account) external view returns (uint256);

    function userCollateral(
        address account,
        address asset
    ) external view returns (UserCollateral memory);

    function getAssetInfoByAddress(
        address asset
    ) external view returns (AssetInfo memory);
}
