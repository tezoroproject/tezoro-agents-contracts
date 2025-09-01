// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "../libs/TezoroYieldLib.sol";

interface IYieldAdapter {
    function protocolCode() external view returns (uint16);

    // -------- SUPPLY --------
    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address user
    ) external view returns (address target, bytes memory callData);

    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view returns (uint256);

    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view returns (address target, bytes memory callData);

    // -------- MISC --------
    function name() external view returns (string memory);
}
