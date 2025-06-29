// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/// @title ArrayUtils
/// @notice Utility for creating single-element arrays for calldata/view logic
library ArrayUtils {
    function singletonAddressArray(
        address value
    ) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = value;
    }

    function singletonBytes32Array(
        bytes32 value
    ) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](1);
        arr[0] = value;
    }

    function singletonUint256Array(
        uint256 value
    ) internal pure returns (uint256[] memory arr) {
        arr = new uint256[](1);
        arr[0] = value;
    }

    function singletonBoolArray(
        bool value
    ) internal pure returns (bool[] memory arr) {
        arr = new bool[](1);
        arr[0] = value;
    }

    function singletonUint16Array(
        uint16 value
    ) internal pure returns (uint16[] memory arr) {
        arr = new uint16[](1);
        arr[0] = value;
    }
}
