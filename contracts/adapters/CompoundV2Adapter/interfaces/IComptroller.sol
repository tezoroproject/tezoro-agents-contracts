// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ICToken} from "./ICToken.sol";

/// @title IComptroller - Interface for Compound V2 Comptroller
interface IComptroller {
    /// @notice Returns the list of all cToken markets
    /// @return Array of cToken addresses
    function getAllMarkets() external view returns (address[] memory);

    /// @notice Returns the current price oracle address
    /// @return Address of the price oracle contract
    function oracle() external view returns (address);

    /// @notice Returns market data for a given cToken
    /// @param cToken Address of the cToken
    /// @return isListed Whether the market is listed
    /// @return collateralFactorMantissa Collateral factor (scaled by 1e18)
    function markets(
        address cToken
    ) external view returns (bool isListed, uint256 collateralFactorMantissa);

    /**
     * @notice Return the address of the COMP token
     * @return The address of COMP
     */
    function getCompAddress() external view returns (address);

    /// @notice The COMP accrued but not yet transferred to each user
    function compAccrued(address account) external view returns (uint256);

    /// @notice Claim COMP tokens for a specific holder
    function claimComp(address holder, ICToken[] memory cTokens) external;

    function enterMarkets(
        address[] calldata cTokens
    ) external returns (uint256[] memory);
}
