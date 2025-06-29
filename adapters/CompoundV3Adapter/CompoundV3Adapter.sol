// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {SafeERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

import {ILendingAdapter} from "../../interfaces/ILendingAdapter.sol";
import {ILendingAdapterWithRewards} from "../../interfaces/ILendingAdapterWithRewards.sol";
import {TezoroLendingLib} from "../../libs/TezoroLendingLib.sol";

import {CometInterface} from "./CometInterface.sol";
import {CometRewardsInterface} from "./CometRewardsInterface.sol";

// Compound V3 (Comet) mapping to Market:
//
// - loanToken      = Base asset of the Comet
//                    (e.g. USDC for the main USDC Comet on Ethereum)
//
// - collateralToken = Collateral asset of the Comet
//
// - marketAddress  = Address of the Comet contract itself
//                    (e.g. 0xc3… for the USDC-ETH market).
//
// - auxId          = 0x0
//                    No auxiliary ID is needed for plain base-asset lending.
//
// - flags          = 0x0
//                    No special flags are required.

contract CompoundV3Adapter is
    ERC165,
    ILendingAdapter,
    ILendingAdapterWithRewards
{
    using SafeERC20 for IERC20;

    error CometNotFound(address comet);
    error ArrayLengthsMismatch();
    error MarketValidationFailed(string reason);
    error InvalidArrayLength();

    string public name;
    uint16 public immutable protocolCode;
    address public immutable cometRewards;

    constructor(
        string memory _name,
        uint16 _protocolCode,
        address _cometRewards
    ) {
        name = _name;
        protocolCode = _protocolCode;
        cometRewards = _cometRewards;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(ILendingAdapter).interfaceId ||
            interfaceId == type(ILendingAdapterWithRewards).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _validateMarket(
        TezoroLendingLib.Market memory market
    ) internal view {
        address comet = market.marketAddress;
        if (comet == address(0)) revert CometNotFound(address(0));

        address base;
        try CometInterface(comet).baseToken() returns (address b) {
            base = b;
        } catch {
            revert MarketValidationFailed("Invalid Comet address");
        }

        if (base != market.loanToken)
            revert MarketValidationFailed("loanToken mismatch");

        if (market.auxId != bytes32(0))
            revert MarketValidationFailed("auxId should be zero");
        if (market.flags != 0)
            revert MarketValidationFailed("flags should be zero");
    }

    function getSupplyBalance(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view override returns (uint256) {
        address comet = market.marketAddress;
        if (comet == address(0)) revert CometNotFound(address(0));
        return CometInterface(comet).balanceOf(user);
    }

    function getWithdrawCallData(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);

        address comet = market.marketAddress;
        CometInterface cometContract = CometInterface(comet);

        uint256 baseBalance = cometContract.balanceOf(user);
        if (baseBalance > 0) {
            // Case 1: user supplied loanToken → can withdraw base
            target = comet;
            callData = abi.encodeWithSelector(
                CometInterface.withdraw.selector,
                market.loanToken,
                baseBalance
            );
            return (target, callData);
        }

        // Case 2: user has collateral and no debt → can withdraw collateral
        uint256 debt = cometContract.borrowBalanceOf(user);
        if (debt == 0) {
            CometInterface.UserCollateral memory col = cometContract
                .userCollateral(user, market.collateralToken);

            if (col.balance > 0) {
                target = comet;
                callData = abi.encodeWithSelector(
                    CometInterface.withdraw.selector,
                    market.collateralToken,
                    col.balance
                );
                return (target, callData);
            }
        }

        // Nothing to withdraw
        return (address(0), "");
    }

    function getSupplyCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address /* user */
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);

        target = market.marketAddress;
        callData = abi.encodeWithSelector(
            CometInterface.supply.selector,
            market.collateralToken,
            amount
        );
    }

    function getRepaySequenceCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address /* user */
    )
        external
        view
        override
        returns (address[] memory targets, bytes[] memory callDatas)
    {
        _validateMarket(market);

        targets = new address[](1);
        callDatas = new bytes[](1);

        targets[0] = market.marketAddress;
        callDatas[0] = abi.encodeWithSelector(
            CometInterface.supply.selector,
            market.loanToken,
            amount
        );
    }

    function getBorrowSequenceCallData(
        TezoroLendingLib.Market calldata market,
        uint256 amount,
        address
    )
        external
        view
        override
        returns (address[] memory targets, bytes[] memory callDatas)
    {
        _validateMarket(market);

        targets = new address[](1);
        callDatas = new bytes[](1);

        targets[0] = market.marketAddress;
        callDatas[0] = abi.encodeWithSelector(
            CometInterface.withdraw.selector,
            market.loanToken,
            amount
        );
    }

    function getBorrowBalance(
        TezoroLendingLib.Market calldata market,
        address user
    ) external view override returns (uint256) {
        _validateMarket(market);

        return CometInterface(market.marketAddress).borrowBalanceOf(user);
    }

    function getRewardTokensForMarket(
        TezoroLendingLib.Market calldata market
    ) external view override returns (address[] memory tokens) {
        // Compound V3 rewards only one token per Comet (typically COMP or similar)
        tokens = new address[](1);

        CometRewardsInterface.RewardConfig
            memory rewardConfig = CometRewardsInterface(cometRewards)
                .rewardConfig(market.marketAddress);
        if (rewardConfig.token == address(0)) {
            return new address[](0); // No rewards for this market
        }
        tokens[0] = rewardConfig.token;
    }

    function getRewardBalances(
        TezoroLendingLib.Market[] calldata markets,
        address user
    )
        external
        view
        override
        returns (TezoroLendingLib.RewardBalance[] memory rewards)
    {
        uint256 len = markets.length;
        rewards = new TezoroLendingLib.RewardBalance[](len);

        for (uint256 i; i < len; ++i) {
            address comet = markets[i].marketAddress;

            CometRewardsInterface.RewardConfig
                memory rewardConfig = CometRewardsInterface(cometRewards)
                    .rewardConfig(comet);

            uint256 claimed = CometRewardsInterface(cometRewards)
                .rewardsClaimed(comet, user);
            uint256 accrued = CometInterface(comet).baseTrackingAccrued(user);

            if (rewardConfig.shouldUpscale) {
                accrued *= rewardConfig.rescaleFactor;
            } else {
                accrued /= rewardConfig.rescaleFactor;
            }

            uint256 rewardAmount = (accrued * rewardConfig.multiplier) / 1e18; // FACTOR_SCALE is 1e18

            uint256[] memory amounts = new uint256[](1);
            address[] memory rewardTokens = new address[](1);
            rewardTokens[0] = rewardConfig.token;
            amounts[0] = rewardAmount > claimed ? rewardAmount - claimed : 0;

            rewards[i] = TezoroLendingLib.RewardBalance({
                market: markets[i],
                rewardTokens: rewardTokens,
                amounts: amounts
            });
        }
    }

    function getClaimRewardsCallData(
        TezoroLendingLib.Market[] memory markets,
        address user
    ) external view override returns (address target, bytes memory callData) {
        if (markets.length != 1) revert ArrayLengthsMismatch();

        address comet = markets[0].marketAddress;
        if (comet == address(0)) revert CometNotFound(address(0));

        uint256 supplyBalance = CometInterface(comet).balanceOf(user);
        if (supplyBalance == 0) {
            return (address(0), "");
        }

        // CometInterface.claim(comet, src, shouldAccrue)
        target = cometRewards;
        callData = abi.encodeWithSelector(
            CometRewardsInterface.claim.selector,
            comet,
            user,
            true
        );
    }

    function getUserPosition(
        address user,
        TezoroLendingLib.Market[] calldata markets
    ) external view override returns (UserPosition memory position) {
        if (markets.length == 0) revert InvalidArrayLength();

        TezoroLendingLib.Market calldata market = markets[0];
        CometInterface comet = CometInterface(market.marketAddress);

        // ----------- Debt (borrowed base token) -----------
        uint256 borrowed = comet.borrowBalanceOf(user);
        UserDebt[] memory debts = borrowed > 0
            ? new UserDebt[](1)
            : new UserDebt[](0);

        if (borrowed > 0) {
            debts[0] = UserDebt({token: market.loanToken, amount: borrowed});
        }

        // ----------- Collaterals -----------
        UserCollateral[] memory tempCollaterals = new UserCollateral[](
            markets.length
        );
        uint256 count = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            address collateralToken = markets[i].collateralToken;

            CometInterface.UserCollateral memory userCol = comet.userCollateral(
                user,
                collateralToken
            );

            if (userCol.balance > 0) {
                CometInterface.AssetInfo memory assetInfo = comet
                    .getAssetInfoByAddress(collateralToken);

                uint256 liquidationThresholdBps = (uint256(
                    assetInfo.liquidationFactor
                ) * 1e4) / 1e18;

                tempCollaterals[count++] = UserCollateral({
                    token: collateralToken,
                    amount: userCol.balance,
                    liquidationThresholdBps: liquidationThresholdBps
                });
            }
        }

        // shrink
        UserCollateral[] memory collaterals = new UserCollateral[](count);
        for (uint256 i = 0; i < count; i++) {
            collaterals[i] = tempCollaterals[i];
        }

        position.debts = debts;
        position.collaterals = collaterals;
    }

    function getHealthFactor(
        TezoroLendingLib.Market calldata /* market */,
        address
    ) external pure override returns (uint256) {
        return 0; // TODO: Implement health factor calculation
    }
}
