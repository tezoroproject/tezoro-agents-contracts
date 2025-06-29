// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {ILendingAdapter} from "./interfaces/ILendingAdapter.sol";
import {ILendingAdapterWithRewards} from "./interfaces/ILendingAdapterWithRewards.sol";
import {IDistributionStrategy} from "./interfaces/IDistributionStrategy.sol";

import {TezoroLendingAgent} from "./TezoroLendingAgent.sol";
import {TezoroLendingAgentFactory} from "./TezoroLendingAgentFactory.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

import {TezoroLendingLib} from "./libs/TezoroLendingLib.sol";

contract TezoroLendingLens {
    struct TokenMetadata {
        address token;
        string symbol;
        uint8 decimals;
    }

    struct ActiveAllocation {
        uint16 protocolCode;
        TezoroLendingLib.Market market;
        address token;
    }

    struct PositionInfo {
        TokenMetadata metadata;
        uint16 protocolCode;
        TezoroLendingLib.Market market;
        uint256 balance;
        TezoroLendingLib.RewardBalance[] rewards;
        uint256 accumulatedAccruedInterest;
        uint256 currentMarketAccruedInterest;
    }

    error TokenUnsupported(address token);
    error NoPriceAvailable(address token);

    function _getDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 0;
        try IERC20Metadata(token).decimals() returns (uint8 dec) {
            return dec;
        } catch {
            return 18;
        }
    }

    function _getSymbol(address token) internal view returns (string memory) {
        try IERC20Metadata(token).symbol() returns (string memory sym) {
            return sym;
        } catch {
            return "?";
        }
    }

    function _getRewards(
        address adapter,
        address user,
        TezoroLendingLib.Market memory market
    ) internal view returns (TezoroLendingLib.RewardBalance[] memory) {
        TezoroLendingLib.Market[]
            memory markets = new TezoroLendingLib.Market[](1);
        markets[0] = market;

        if (
            IERC165(adapter).supportsInterface(
                type(ILendingAdapterWithRewards).interfaceId
            )
        ) {
            TezoroLendingLib.RewardBalance[]
                memory rewards = ILendingAdapterWithRewards(adapter)
                    .getRewardBalances(markets, user);
            return rewards;
        } else {
            // If not, return an empty array
            return new TezoroLendingLib.RewardBalance[](0);
        }
    }

    function viewRewards(
        address agent,
        uint16 protocolCode,
        TezoroLendingLib.Market memory market
    ) external view returns (TezoroLendingLib.RewardBalance[] memory) {
        address adapter = TezoroLendingAgent(agent).protocolToAdapter(
            protocolCode
        );
        return _getRewards(adapter, agent, market);
    }
}
