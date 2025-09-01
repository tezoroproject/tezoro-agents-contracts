// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";

import {TezoroYieldAgent} from "./TezoroYieldAgent.sol";

contract TezoroYieldAgentFactory is Ownable {
    using Clones for address;

    error NoAdaptersProvided();
    error ZeroAddressAdapter();
    error AgentIndexOutOfBounds();
    error FeeRateTooHigh();
    error RebalanceDeltaTooHigh();

    event FeeWithdrawn(address token, uint256 amount);
    event AgentCreated(
        address indexed agent,
        address indexed creator,
        address[] adapters
    );

    address public immutable implementation;
    address[] public keepers;
    uint256 public rebalanceThresholdBps = 0;
    uint256 public SUCCESS_FEE_BPS = 1000;

    address public immutable registry;
    uint256 public immutable deploymentTimestamp;
    uint8 public immutable version;
    address public treasury;

    constructor(
        address _implementation,
        address[] memory _keepers,
        uint8 _version,
        address _registry,
        address _treasury
    ) {
        implementation = _implementation;
        keepers = _keepers;
        version = _version;
        registry = _registry;
        treasury = _treasury;

        deploymentTimestamp = block.timestamp;
    }

    function setKeepers(address[] memory _keepers) external onlyOwner {
        for (uint256 i = 0; i < _keepers.length; ++i) {
            if (_keepers[i] == address(0)) revert ZeroAddressAdapter();
        }
        keepers = _keepers;
    }

    function isKeeper(address keeper) external view returns (bool) {
        for (uint256 i = 0; i < keepers.length; ++i) {
            if (keepers[i] == keeper) return true;
        }
        return false;
    }

    function createAgent(
        address[] memory adapters
    ) external returns (address agent) {
        if (adapters.length == 0) revert NoAdaptersProvided();

        for (uint256 i = 0; i < adapters.length; ++i) {
            if (adapters[i] == address(0)) revert ZeroAddressAdapter();
        }

        agent = implementation.clone();
        TezoroYieldAgent(agent).initialize(msg.sender, adapters, address(this));

        emit AgentCreated(agent, msg.sender, adapters);
    }

    function _setFeeRateBps(uint256 newFeeRateBps) internal {
        if (newFeeRateBps > 1000) revert FeeRateTooHigh(); // Max 10% fee
        SUCCESS_FEE_BPS = newFeeRateBps;
    }

    function setFeeRateBps(uint256 newFeeRateBps) external onlyOwner {
        _setFeeRateBps(newFeeRateBps);
    }

    function setRebalanceThresholdBps(
        uint256 newRebalanceDeltaBps
    ) external onlyOwner {
        if (newRebalanceDeltaBps > 10000) revert RebalanceDeltaTooHigh();
        rebalanceThresholdBps = newRebalanceDeltaBps;
    }

    function withdrawFee(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        if (amount == 0) revert NoAdaptersProvided();
        if (to == address(0)) revert ZeroAddressAdapter();

        IERC20(token).transfer(to, amount);
        emit FeeWithdrawn(token, amount);
    }
}
