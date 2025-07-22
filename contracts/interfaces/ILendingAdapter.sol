// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "../libs/TezoroLendingLib.sol";

interface ILendingAdapter {
    struct UserCollateral {
        address token;
        uint256 amount;
        uint256 liquidationThresholdBps;
    }

    struct UserDebt {
        address token;
        uint256 amount;
    }

    struct UserPosition {
        UserDebt[] debts;
        UserCollateral[] collaterals;
    }

    function getUserPosition(
        address user,
        TezoroLendingLib.Market[] calldata markets
    ) external view returns (UserPosition memory);

    function protocolCode() external view returns (uint16);

    // -------- SUPPLY --------
    function getSupplyCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address user
    ) external view returns (address target, bytes memory callData);

    function getSupplyBalance(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view returns (uint256);

    function getWithdrawCallData(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view returns (address target, bytes memory callData);

    // -------- BORROW --------

    /// Returns current borrowed amount for the user in a market
    function getBorrowBalance(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view returns (uint256);

    function getRepaySequenceCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address user
    )
        external
        view
        returns (address[] memory targets, bytes[] memory callDatas);

    function getBorrowSequenceCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address user
    )
        external
        view
        returns (address[] memory targets, bytes[] memory callDatas);

    function getHealthFactor(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view returns (uint256);

    // -------- MISC --------
    function name() external view returns (string memory);
}
