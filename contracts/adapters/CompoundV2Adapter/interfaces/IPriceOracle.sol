// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IPriceOracle - Interface for Compound V2 price oracle
interface IPriceOracle {
    /// @notice Returns the price of the underlying asset for a given cToken
    /// @param cToken Address of the cToken
    /// @return Price of the underlying asset in USD, scaled by 1e18
    function getUnderlyingPrice(address cToken) external view returns (uint256);
}
