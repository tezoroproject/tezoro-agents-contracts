// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IInterestRateModel {
    function blocksPerYear() external view returns (uint256);
}
