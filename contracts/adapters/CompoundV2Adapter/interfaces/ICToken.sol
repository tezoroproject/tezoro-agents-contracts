// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ICToken - Interface for Compound V2 cTokens
interface ICToken {
    /// @notice Returns the supply rate per block (in 1e18 scale)
    function supplyRatePerBlock() external view returns (uint256);

    /// @notice Mints cTokens by supplying underlying asset
    /// @param mintAmount Amount of the underlying asset to supply
    /// @return Error code (0 = success)
    function mint(uint256 mintAmount) external returns (uint256);

    /// @notice Redeems specified amount of cTokens
    /// @param redeemTokens Amount of cTokens to redeem
    /// @return Error code (0 = success)
    function redeem(uint256 redeemTokens) external returns (uint256);

    /// @notice Redeems underlying tokens from specified amount
    /// @param redeemAmount Amount of underlying tokens to redeem
    /// @return Error code (0 = success)
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    /// @notice Returns the address of the underlying token
    function underlying() external view returns (address);

    /// @notice Returns the current balance in underlying for a user
    function balanceOfUnderlying(address owner) external returns (uint256);

    /// @notice Returns the current balance in cTokens for a user
    function getCash() external view returns (uint);

    /// @notice Returns the current balance in cTokens for a user
    function balanceOf(address owner) external view returns (uint256);

    /// @notice Returns the current cached exchange rate between cTokens and underlying
    function exchangeRateStored() external view returns (uint);

    /// @notice Returns the current exchange rate between cTokens and underlying
    function exchangeRateCurrent() external returns (uint);

    function transfer(address dst, uint256 amount) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool);

    function interestRateModel() external view returns (address);

    function borrowIndex() external view returns (uint256);

    function repayBorrowBehalf(
        address borrower,
        uint repayAmount
    ) external returns (uint256);

    function borrow(uint borrowAmount) external returns (uint256);

    function borrowBalanceStored(
        address account
    ) external view returns (uint256);
}
