// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {SafeERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

import "./interfaces/IComptroller.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/ICToken.sol";
import "./interfaces/IInterestRateModel.sol";

import {IYieldAdapter} from "../../interfaces/IYieldAdapter.sol";
import {IYieldAdapterWithRewards} from "../../interfaces/IYieldAdapterWithRewards.sol";
import {TezoroYieldLib} from "../../libs/TezoroYieldLib.sol";

// Compound V2 mapping to Market:
// - loanToken = Underlying asset of the cToken (e.g. DAI for cDAI)
// - collateralToken = any value (not used in Compound V2)
// - marketAddress = cToken address (e.g. cDAI)
// - auxId = 0x0 (no auxiliary ID needed)
// - flags = 0x0 (no special flags needed for Compound V2)

contract CompoundV2Adapter is ERC165, IYieldAdapter, IYieldAdapterWithRewards {
    using SafeERC20 for IERC20;

    error CTokenNotFound(address token);
    error ArrayLengthsMismatch();
    error MintFailed();
    error MarketValidationFailed(string reason);

    address public immutable comptroller;
    string public name;
    uint16 public immutable protocolCode;
    uint256 public immutable blocksPerYearFallback;

    uint256 internal constant EXCHANGE_RATE_SCALE = 1e18;

    constructor(
        address _comptroller,
        string memory _name,
        uint16 _protocolCode,
        uint256 _blocksPerYearFallback
    ) {
        comptroller = _comptroller;
        name = _name;
        blocksPerYearFallback = _blocksPerYearFallback;
        protocolCode = _protocolCode;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IYieldAdapter).interfaceId ||
            interfaceId == type(IYieldAdapterWithRewards).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _getBlocksPerYear(address cToken) internal view returns (uint256) {
        try
            IInterestRateModel(ICToken(cToken).interestRateModel())
                .blocksPerYear()
        returns (uint256 bpy) {
            return bpy;
        } catch {
            return blocksPerYearFallback;
        }
    }

    function _validateMarket(
        TezoroYieldLib.Market memory market
    ) internal view {
        address underlying;
        try ICToken(market.supply.market).underlying{gas: 50_000}() returns (
            address token
        ) {
            underlying = token;
        } catch {
            revert MarketValidationFailed(
                "Invalid cToken address or underlying token not found"
            );
        }

        if (underlying != market.supply.token)
            revert MarketValidationFailed(
                "supply.token does not match underlying of cToken"
            );
        if (market.supply.auxId != bytes32(0))
            revert MarketValidationFailed("supply.auxId should be zero");
        if (market.flags != 0)
            revert MarketValidationFailed("flags should be zero");
    }

    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address /* user */
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);

        target = market.supply.market; // cToken contract

        callData = abi.encodeWithSelector(ICToken.mint.selector, amount);
    }

    // function getRepaySequenceCallData(
    //     TezoroYieldLib.Market calldata market,
    //     uint256 amount,
    //     address user
    // )
    //     external
    //     view
    //     override
    //     returns (address[] memory targets, bytes[] memory callDatas)
    // {
    //     _validateMarket(market);

    //     targets = new address[](1);
    //     callDatas = new bytes[](1);

    //     targets[0] = market.marketAddress; // cToken contract
    //     callDatas[0] = abi.encodeWithSelector(
    //         ICToken.repayBorrowBehalf.selector,
    //         user,
    //         amount
    //     );
    // }

    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view override returns (uint256) {
        address cToken = market.supply.token;
        if (cToken == address(0)) revert CTokenNotFound(address(0));

        uint256 cTokenBalance = ICToken(cToken).balanceOf(user);
        uint256 exchangeRate = ICToken(cToken).exchangeRateStored();

        return (cTokenBalance * exchangeRate) / EXCHANGE_RATE_SCALE;
    }

    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);

        address cToken = market.supply.market;
        if (cToken == address(0)) revert CTokenNotFound(address(0));

        uint256 cTokenBalance = ICToken(cToken).balanceOf(user);
        if (cTokenBalance == 0) {
            return (address(0), "");
        }

        target = cToken;
        callData = abi.encodeWithSelector(
            ICToken.redeem.selector,
            cTokenBalance
        );
    }

    function getBorrowSequenceCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address
    )
        external
        view
        returns (address[] memory targets, bytes[] memory callDatas)
    {
        _validateMarket(market);

        targets = new address[](2);
        callDatas = new bytes[](2);

        // 1. enterMarkets
        address[] memory cTokens = new address[](1);
        cTokens[0] = market.supply.market;

        targets[0] = comptroller;
        callDatas[0] = abi.encodeWithSelector(
            IComptroller.enterMarkets.selector,
            cTokens
        );

        // 2. borrow
        targets[1] = market.supply.market;
        callDatas[1] = abi.encodeWithSelector(ICToken.borrow.selector, amount);
    }

    // function getBorrowBalance(
    //     TezoroYieldLib.Market calldata market,
    //     address user
    // ) external view override returns (uint256) {
    //     _validateMarket(market);

    //     return ICToken(market.marketAddress).borrowBalanceStored(user);
    // }

    function getRewardTokensForMarket(
        TezoroYieldLib.Market calldata market
    ) external view override returns (address[] memory) {
        _validateMarket(market);
        if (market.supply.market == address(0))
            revert CTokenNotFound(address(0));

        address compAddress = getCompToken();
        if (compAddress == address(0)) {
            return new address[](0);
        }

        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = compAddress;
        return rewardTokens;
    }

    function getCompToken() internal view returns (address compToken) {
        try IComptroller(comptroller).getCompAddress() returns (address addr) {
            compToken = addr;
        } catch {
            compToken = address(0);
        }
    }

    function getClaimRewardsCallData(
        TezoroYieldLib.Market[] calldata markets,
        address user
    ) external view override returns (address target, bytes memory callData) {
        address compToken = getCompToken();
        if (compToken == address(0)) {
            return (address(0), "");
        }
        ICToken[] memory cTokens = new ICToken[](markets.length);
        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i].supply.market == address(0)) {
                revert CTokenNotFound(address(0));
            }
            cTokens[i] = ICToken(markets[i].supply.market);
        }

        target = comptroller;
        callData = abi.encodeWithSelector(
            IComptroller.claimComp.selector,
            user,
            cTokens
        );
    }

    function getRewardBalances(
        TezoroYieldLib.Market[] calldata markets,
        address user
    ) external view returns (TezoroYieldLib.RewardBalance[] memory rewards) {
        address compToken = getCompToken();
        rewards = new TezoroYieldLib.RewardBalance[](markets.length);

        if (compToken == address(0)) {
            for (uint256 i = 0; i < markets.length; i++) {
                rewards[i] = TezoroYieldLib.RewardBalance({
                    market: markets[i],
                    rewardTokens: new address[](0),
                    amounts: new uint256[](0)
                });
            }
            return rewards;
        }

        uint256 accrued = IComptroller(comptroller).compAccrued(user);
        for (uint256 i = 0; i < markets.length; i++) {
            address[] memory rewardTokens = new address[](1);
            rewardTokens[0] = compToken;

            uint256[] memory amounts = new uint256[](1);
            // NOTE: COMP is accrued globally per user; not per market
            // So same value for all markets
            amounts[0] = accrued;

            rewards[i] = TezoroYieldLib.RewardBalance({
                market: markets[i],
                rewardTokens: rewardTokens,
                amounts: amounts
            });
        }
    }

    // function getUserPosition(
    //     address user,
    //     TezoroYieldLib.Market[] calldata markets
    // ) external view override returns (UserPosition memory position) {
    //     UserDebt[] memory debts = new UserDebt[](markets.length);
    //     UserCollateral[] memory collaterals = new UserCollateral[](
    //         markets.length
    //     );

    //     uint256 debtCount = 0;
    //     uint256 collateralCount = 0;

    //     for (uint256 i = 0; i < markets.length; i++) {
    //         TezoroYieldLib.Market calldata market = markets[i];
    //         ICToken cToken = ICToken(market.marketAddress);

    //         // ---------- Debt ----------
    //         uint256 borrowBalance = cToken.borrowBalanceStored(user);
    //         if (borrowBalance > 0) {
    //             debts[debtCount++] = UserDebt({
    //                 token: market.loanToken,
    //                 amount: borrowBalance
    //             });
    //         }

    //         // ---------- Collateral ----------
    //         uint256 cTokenBalance = cToken.balanceOf(user);
    //         if (cTokenBalance > 0) {
    //             uint256 exchangeRate = cToken.exchangeRateStored(); // scaled by 1e18
    //             uint256 suppliedAmount = (cTokenBalance * exchangeRate) / 1e18;

    //             // Fetch collateral factor (as proxy for liquidation threshold)
    //             (, uint256 collateralFactorMantissa) = IComptroller(comptroller)
    //                 .markets(address(cToken));
    //             uint256 liquidationThresholdBps = collateralFactorMantissa /
    //                 1e14; // 1e18 -> bps

    //             collaterals[collateralCount++] = UserCollateral({
    //                 token: market.loanToken,
    //                 amount: suppliedAmount,
    //                 liquidationThresholdBps: liquidationThresholdBps
    //             });
    //         }
    //     }

    //     // Trim arrays
    //     UserDebt[] memory finalDebts = new UserDebt[](debtCount);
    //     for (uint256 i = 0; i < debtCount; i++) {
    //         finalDebts[i] = debts[i];
    //     }

    //     UserCollateral[] memory finalCollaterals = new UserCollateral[](
    //         collateralCount
    //     );
    //     for (uint256 i = 0; i < collateralCount; i++) {
    //         finalCollaterals[i] = collaterals[i];
    //     }

    //     position.debts = finalDebts;
    //     position.collaterals = finalCollaterals;
    // }

    // function getHealthFactor(
    //     TezoroYieldLib.Market calldata /* market */,
    //     address
    // ) external pure override returns (uint256) {
    //     return 0; // TODO: Implement health factor calculation
    // }
}
