// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

import {IPool} from "aave-v3-core/contracts/interfaces/IPool.sol";
import {IPoolDataProvider} from "aave-v3-core/contracts/interfaces/IPoolDataProvider.sol";
import {IPoolAddressesProvider} from "aave-v3-core/contracts/interfaces/IPoolAddressesProvider.sol";

import {IRewardsController} from "aave-v3-periphery/rewards/interfaces/IRewardsController.sol";

import {IYieldAdapterWithRewards} from "../../interfaces/IYieldAdapterWithRewards.sol";
import {IYieldAdapter} from "../../interfaces/IYieldAdapter.sol";

import {TezoroYieldLib} from "../../libs/TezoroYieldLib.sol";

// AAVE V3 mapping to Market:
// - loanToken = tokenAddress
// - collateralToken = any (AAVE have global supply and borrow markets, so collateralToken is not used)
// - marketAddress = aTokenAddress (AAVE's aToken is the market address)
// - auxId = bytes32(0) (AAVE does not use auxId)
// - flags = 0 (AAVE does not use flags)

contract AAVEV3Adapter is ERC165, IYieldAdapter, IYieldAdapterWithRewards {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error WithdrawUnderflow();
    error InvalidBaseUnit();
    error InvalidEthUsdPrice();
    error EthUsdFeedDecimalsTooHigh();
    error InvalidArrayLength();
    error TokenNotFound();
    error MarketValidationFailed(string reason);

    address public immutable lendingPool;
    address public immutable dataProvider;
    address public immutable addressesProvider;
    address public immutable fallbackRewardsController;
    uint16 public immutable protocolCode;

    uint256 internal constant VARIABLE_INTEREST_RATE_MODE = 2;

    string public name;

    constructor(
        address _addressesProvider,
        address _fallbackRewardsController,
        string memory _name,
        uint16 _protocolCode
    ) {
        addressesProvider = _addressesProvider;
        dataProvider = IPoolAddressesProvider(_addressesProvider)
            .getPoolDataProvider();
        lendingPool = IPoolAddressesProvider(_addressesProvider).getPool();

        fallbackRewardsController = _fallbackRewardsController;
        name = _name;
        protocolCode = _protocolCode;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IYieldAdapter).interfaceId ||
            interfaceId == type(IYieldAdapterWithRewards).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address user
    ) external view returns (address target, bytes memory callData) {
        _validateMarket(market);

        target = lendingPool;

        callData = abi.encodeWithSelector(
            IPool.supply.selector,
            market.supply.token,
            amount,
            user, // onBehalfOf is this contract
            0 // referralCode
        );
    }

    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address user
    ) external view override returns (address target, bytes memory callData) {
        target = lendingPool;
        callData = abi.encodeWithSelector(
            IPool.withdraw.selector,
            market.supply.token,
            type(uint256).max,
            user
        );
    }

    //--------------------------------------------------------------------------
    // Incentives logic
    //--------------------------------------------------------------------------

    function getRewardsController() public view returns (address) {
        address fromProvider = IPoolAddressesProvider(addressesProvider)
            .getAddress("REWARDS_CONTROLLER");
        return
            fromProvider != address(0)
                ? fromProvider
                : fallbackRewardsController;
    }

    function getClaimRewardsCallData(
        TezoroYieldLib.Market[] calldata markets,
        address user
    ) external view returns (address target, bytes memory callData) {
        address rewardsController = getRewardsController();
        if (rewardsController == address(0)) return (address(0), "");

        // Step 1: collect aTokens
        address[] memory aTokens = new address[](markets.length);
        uint256 count = 0;
        for (uint256 i = 0; i < markets.length; i++) {
            address aToken = markets[i].supply.market;

            if (aToken != address(0)) {
                aTokens[count++] = aToken;
            }
        }

        // Shrink to actual count
        address[] memory rewardAssets = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            rewardAssets[i] = aTokens[i];
        }

        // Step 2: collect rewardsByAsset once
        address[][] memory rewardsByAsset = new address[][](count);
        uint256 total = 0;
        for (uint256 i = 0; i < count; i++) {
            address[] memory rewards = IRewardsController(rewardsController)
                .getRewardsByAsset(rewardAssets[i]);
            rewardsByAsset[i] = rewards;
            total += rewards.length;
        }

        // Step 3: flatten into rewardTokens[]
        address[] memory rewardTokens = new address[](total);
        uint256 cursor = 0;
        for (uint256 i = 0; i < count; i++) {
            address[] memory rewards = rewardsByAsset[i];
            for (uint256 j = 0; j < rewards.length; j++) {
                rewardTokens[cursor++] = rewards[j];
            }
        }

        // Step 4: prepare calldata
        if (rewardAssets.length > 0 && rewardTokens.length > 0) {
            target = rewardsController;
            callData = abi.encodeWithSelector(
                IRewardsController.claimRewards.selector,
                rewardAssets,
                type(uint256).max,
                user,
                rewardTokens
            );
        } else {
            target = address(0);
            callData = "";
        }
    }

    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) public view override returns (uint256) {
        (uint256 aTokenBalance, , , , , , , , ) = IPoolDataProvider(
            dataProvider
        ).getUserReserveData(market.supply.token, user);
        return aTokenBalance;
    }

    function _validateMarket(TezoroYieldLib.Market memory key) internal view {
        (address aTokenAddress, , ) = IPoolDataProvider(dataProvider)
            .getReserveTokensAddresses(key.supply.token);
        if (aTokenAddress == address(0))
            revert MarketValidationFailed(
                "aTokenAddress not found for collateralToken"
            );
        if (aTokenAddress != key.supply.market)
            revert MarketValidationFailed(
                "supply.market should be aTokenAddress"
            );

        if (key.supply.auxId != bytes32(0))
            revert MarketValidationFailed("auxId should be zero");
        if (key.flags != 0)
            revert MarketValidationFailed("flags should be zero");
    }

    function getRewardTokensForMarket(
        TezoroYieldLib.Market calldata market
    ) public view returns (address[] memory) {
        address rewardsController = getRewardsController();

        if (rewardsController == address(0)) {
            return new address[](0);
        }
        return
            IRewardsController(rewardsController).getRewardsByAsset(
                market.supply.market
            );
    }

    function _asSingleton(
        address a
    ) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }

    function getRewardBalances(
        TezoroYieldLib.Market[] calldata markets,
        address user
    ) external view returns (TezoroYieldLib.RewardBalance[] memory rewards) {
        address rewardsController = getRewardsController();
        if (rewardsController == address(0)) {
            return new TezoroYieldLib.RewardBalance[](0);
        }

        rewards = new TezoroYieldLib.RewardBalance[](markets.length);

        for (uint256 i = 0; i < markets.length; i++) {
            address[] memory rewardTokens = IRewardsController(
                rewardsController
            ).getRewardsByAsset(markets[i].supply.market);

            uint256[] memory amounts = new uint256[](rewardTokens.length);

            for (uint256 j = 0; j < rewardTokens.length; j++) {
                amounts[j] = IRewardsController(rewardsController)
                    .getUserRewards(
                        _asSingleton(markets[i].supply.market),
                        user,
                        rewardTokens[j]
                    );
            }

            rewards[i] = TezoroYieldLib.RewardBalance({
                market: markets[i],
                rewardTokens: rewardTokens,
                amounts: amounts
            });
        }
    }

    // BORROW
    // function getBorrowBalance(
    //     TezoroYieldLib.Market calldata market,
    //     address user
    // ) external view override returns (uint256) {
    //     (
    //         ,
    //         uint256 stableDebt,
    //         uint256 variableDebt,
    //         ,
    //         ,
    //         ,
    //         ,
    //         ,

    //     ) = IPoolDataProvider(dataProvider).getUserReserveData(
    //             market.loanToken,
    //             user
    //         );
    //     return stableDebt + variableDebt;
    // }

    // function getBorrowSequenceCallData(
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

    //     targets[0] = lendingPool;
    //     callDatas[0] = abi.encodeWithSelector(
    //         IPool.borrow.selector,
    //         market.loanToken,
    //         amount,
    //         VARIABLE_INTEREST_RATE_MODE,
    //         0, // referralCode
    //         user
    //     );
    // }

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

    //     targets = new address[](2);
    //     callDatas = new bytes[](2);

    //     targets[0] = market.loanToken;
    //     callDatas[0] = abi.encodeWithSelector(
    //         IERC20.approve.selector,
    //         lendingPool,
    //         amount
    //     );

    //     targets[1] = lendingPool;
    //     callDatas[1] = abi.encodeWithSelector(
    //         IPool.repay.selector,
    //         market.loanToken,
    //         amount,
    //         VARIABLE_INTEREST_RATE_MODE,
    //         user
    //     );
    // }

    // function _gatherUserDebts(
    //     address user,
    //     TezoroYieldLib.Market[] calldata markets
    // ) internal view returns (UserDebt[] memory) {
    //     UserDebt[] memory debts = new UserDebt[](markets.length);
    //     uint256 count = 0;

    //     for (uint256 i = 0; i < markets.length; i++) {
    //         (
    //             ,
    //             uint256 stableDebt,
    //             uint256 variableDebt,
    //             ,
    //             ,
    //             ,
    //             ,
    //             ,

    //         ) = IPoolDataProvider(dataProvider).getUserReserveData(
    //                 markets[i].loanToken,
    //                 user
    //             );

    //         uint256 totalDebt = stableDebt + variableDebt;
    //         if (totalDebt > 0) {
    //             debts[count++] = UserDebt({
    //                 token: markets[i].loanToken,
    //                 amount: totalDebt
    //             });
    //         }
    //     }

    //     // shrink
    //     UserDebt[] memory trimmed = new UserDebt[](count);
    //     for (uint256 i = 0; i < count; i++) {
    //         trimmed[i] = debts[i];
    //     }

    //     return trimmed;
    // }

    // function _gatherUserCollaterals(
    //     address user,
    //     TezoroYieldLib.Market[] calldata markets
    // ) internal view returns (UserCollateral[] memory) {
    //     UserCollateral[] memory collaterals = new UserCollateral[](
    //         markets.length
    //     );
    //     uint256 collateralCount = 0;

    //     for (uint256 i = 0; i < markets.length; i++) {
    //         (
    //             uint256 aTokenBalance,
    //             ,
    //             ,
    //             ,
    //             ,
    //             ,
    //             ,
    //             ,
    //             bool usageAsCollateralEnabled
    //         ) = IPoolDataProvider(dataProvider).getUserReserveData(
    //                 markets[i].loanToken,
    //                 user
    //             );

    //         if (aTokenBalance > 0 && usageAsCollateralEnabled) {
    //             (
    //                 ,
    //                 ,
    //                 uint256 liquidationThreshold,
    //                 ,
    //                 ,
    //                 ,
    //                 ,
    //                 ,
    //                 ,

    //             ) = IPoolDataProvider(dataProvider).getReserveConfigurationData(
    //                     markets[i].loanToken
    //                 );

    //             collaterals[collateralCount++] = UserCollateral({
    //                 token: markets[i].loanToken,
    //                 amount: aTokenBalance,
    //                 liquidationThresholdBps: liquidationThreshold
    //             });
    //         }
    //     }

    //     // shrink
    //     UserCollateral[] memory trimmed = new UserCollateral[](collateralCount);
    //     for (uint256 i = 0; i < collateralCount; i++) {
    //         trimmed[i] = collaterals[i];
    //     }

    //     return trimmed;
    // }

    // function getUserPosition(
    //     address user,
    //     TezoroYieldLib.Market[] calldata markets
    // ) external view override returns (UserPosition memory position) {
    //     UserDebt[] memory debts = _gatherUserDebts(user, markets);
    //     UserCollateral[] memory collaterals = _gatherUserCollaterals(
    //         user,
    //         markets
    //     );

    //     position.debts = debts;
    //     position.collaterals = collaterals;
    // }

    // function getHealthFactor(
    //     TezoroYieldLib.Market calldata /* market */,
    //     address user
    // ) external view returns (uint256) {
    //     (, , , , , uint256 healthFactor) = IPool(lendingPool)
    //         .getUserAccountData(user);
    //     return healthFactor;
    // }
}
