// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {SafeERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

import {IYieldAdapter} from "../../interfaces/IYieldAdapter.sol";
import {TezoroYieldLib} from "../../libs/TezoroYieldLib.sol";

import {IFToken} from "./interfaces/IFToken.sol";

contract FluidAdapter is ERC165, IYieldAdapter, Ownable {
    using SafeERC20 for IERC20;

    string public override name;
    uint16 public override protocolCode;

    error MarketValidationFailed(string reason);

    constructor(string memory _name, uint16 _protocolCode) {
        name = _name;
        protocolCode = _protocolCode;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IYieldAdapter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _validateMarket(
        TezoroYieldLib.Market memory market
    ) internal pure {
        if (market.supply.market == address(0)) {
            revert MarketValidationFailed(
                "supply.market (fToken) must not be zero"
            );
        }
        if (market.flags != 0) {
            revert MarketValidationFailed(
                "flags must be zero for Fluid fToken"
            );
        }
    }

    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address user
    ) external pure override returns (address target, bytes memory callData) {
        _validateMarket(market);

        target = market.supply.market;
        callData = abi.encodeWithSelector(
            IFToken.deposit.selector,
            amount,
            user
        );
    }

    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address recipient
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);

        address fToken = market.supply.market;
        uint256 shares = IFToken(fToken).balanceOf(recipient); // assuming recipient == owner

        target = fToken;
        callData = abi.encodeWithSelector(
            IFToken.redeem.selector,
            shares,
            recipient,
            recipient
        );
    }

    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view override returns (uint256) {
        _validateMarket(market);

        return IFToken(market.supply.market).balanceOf(user);
    }
}
