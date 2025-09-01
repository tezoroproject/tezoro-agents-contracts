// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {SafeERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IMorpho, IMorphoBase, MarketParams, Position, Id, Market} from "morpho-blue/src/interfaces/IMorpho.sol";
import {IOracle} from "morpho-blue/src/interfaces/IOracle.sol";
import {IIrm} from "morpho-blue/src/interfaces/IIrm.sol";
import {MarketParamsLib} from "morpho-blue/src/libraries/MarketParamsLib.sol";
import {UD60x18, exp} from "prb-math/UD60x18.sol";
import {mulDiv} from "prb-math/Common.sol";

import {IYieldAdapter} from "../../interfaces/IYieldAdapter.sol";
import {TezoroYieldLib} from "../../libs/TezoroYieldLib.sol";

// Morpho Blue mapping to Market:
// - loanToken = Underlying asset of the Morpho market (e.g. DAI for Morpho DAI)
// - collateralToken = collateral token (e.g. WETH for Morpho DAI)
// - marketAddress = 0x0 (Morpho Blue does not use marketAddress)
// - auxId = Morpho market ID (e.g. 0x123... for Morpho DAI)
// - flags = 0x0 (no special flags needed for Morpho Blue)

contract MorphoBlueAdapter is ERC165, IYieldAdapter, Ownable {
    using SafeERC20 for IERC20;
    using MarketParamsLib for MarketParams;

    uint256 internal constant VIRTUAL_ASSETS = 1;
    uint256 internal constant VIRTUAL_SHARES = 1e6;

    string public name;
    uint16 public immutable protocolCode;
    IMorpho public immutable morpho;

    error InvalidArrayLength();
    error UnknownMarket();
    error MarketValidationFailed(string reason);
    error NoAssetsToWithdraw();

    constructor(address _morpho, string memory _name, uint16 _protocolCode) {
        morpho = IMorpho(_morpho);
        name = _name;
        protocolCode = _protocolCode;
    }

    function supportsInterface(
        bytes4 id
    ) public view virtual override returns (bool) {
        return
            id == type(IYieldAdapter).interfaceId ||
            super.supportsInterface(id);
    }

    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address user
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);
        MarketParams memory mp = morpho.idToMarketParams(
            Id.wrap(market.supply.auxId)
        );

        target = address(morpho);
        callData = abi.encodeWithSelector(
            IMorphoBase.supply.selector,
            mp,
            amount,
            0,
            user,
            ""
        );
    }

    function getSupplyCollateralCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address user
    ) external view returns (address target, bytes memory callData) {
        _validateMarket(market);
        MarketParams memory mp = morpho.idToMarketParams(
            Id.wrap(market.supply.auxId)
        );

        target = address(morpho);
        callData = abi.encodeWithSelector(
            IMorphoBase.supplyCollateral.selector,
            mp,
            amount,
            user,
            ""
        );
    }

    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address recipient
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);
        Id id = Id.wrap(market.supply.auxId);

        MarketParams memory mp = morpho.idToMarketParams(id);
        Position memory p = morpho.position(id, recipient);
        Market memory m = morpho.market(id);

        if (p.supplyShares == 0) return (address(0), "");

        uint256 assets = _calculateWithdrawAssets(
            p.supplyShares,
            m.totalSupplyAssets,
            m.totalSupplyShares
        );

        callData = _buildWithdrawCallData(mp, assets, recipient);

        target = address(morpho);
    }

    function _validateMarket(TezoroYieldLib.Market memory key) internal view {
        if (key.supply.market != address(0)) {
            revert MarketValidationFailed(
                "supply.market must be zero in Morpho"
            );
        }
        if (key.flags != 0) {
            revert MarketValidationFailed("flags must be zero in Morpho");
        }

        Id id = Id.wrap(key.supply.auxId);
        MarketParams memory mp = morpho.idToMarketParams(id);

        if (mp.loanToken == address(0)) {
            revert MarketValidationFailed("Unknown market (zero loan token)");
        }

        // if (mp.collateralToken != key.supply.token) {
        //     revert MarketValidationFailed("supply.token mismatch");
        // }
    }

    function _mulDivDown(
        uint256 x,
        uint256 y,
        uint256 d
    ) internal pure returns (uint256) {
        return (x * y) / d;
    }

    function _calculateWithdrawAssets(
        uint256 supplyShares,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        // Morpho Blue uses virtual liquidity to prevent division by zero and smooth first-time deposits
        return
            _mulDivDown(
                supplyShares,
                totalAssets + VIRTUAL_ASSETS,
                totalShares + VIRTUAL_SHARES
            );
    }

    function _buildWithdrawCallData(
        MarketParams memory mp,
        uint256 assets,
        address recipient
    ) internal pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                IMorphoBase.withdraw.selector,
                mp,
                assets,
                0,
                recipient,
                recipient
            );
    }

    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) public view override returns (uint256) {
        Id id = Id.wrap(market.supply.auxId);

        Position memory position = morpho.position(id, user);
        Market memory m = morpho.market(id);
        if (m.totalSupplyShares == 0) return 0;

        return
            (position.supplyShares * m.totalSupplyAssets) / m.totalSupplyShares;
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

    //     MarketParams memory mp = morpho.idToMarketParams(Id.wrap(market.auxId));

    //     targets[0] = address(morpho);
    //     callDatas[0] = abi.encodeWithSelector(
    //         IMorphoBase.repay.selector,
    //         mp,
    //         amount,
    //         0,
    //         user,
    //         ""
    //     );
    // }

    // function getBorrowSequenceCallData(
    //     TezoroYieldLib.Market calldata market,
    //     uint256 amount,
    //     address recipient
    // )
    //     external
    //     view
    //     override
    //     returns (address[] memory targets, bytes[] memory callDatas)
    // {
    //     _validateMarket(market);
    //     MarketParams memory mp = morpho.idToMarketParams(Id.wrap(market.auxId));

    //     targets = new address[](1);
    //     callDatas = new bytes[](1);

    //     targets[0] = address(morpho);
    //     callDatas[0] = abi.encodeWithSelector(
    //         IMorphoBase.borrow.selector,
    //         mp,
    //         amount,
    //         0,
    //         recipient,
    //         recipient
    //     );
    // }

    // function getBorrowBalance(
    //     TezoroYieldLib.Market calldata market,
    //     address user
    // ) external view override returns (uint256) {
    //     Id id = Id.wrap(market.auxId);
    //     Position memory pos = morpho.position(id, user);
    //     Market memory m = morpho.market(id);

    //     if (m.totalBorrowShares == 0) return 0;
    //     return (pos.borrowShares * m.totalBorrowAssets) / m.totalBorrowShares;
    // }

    // function getUserPosition(
    //     address user,
    //     TezoroYieldLib.Market[] calldata markets
    // ) external view override returns (UserPosition memory position) {
    //     if (markets.length == 0) revert InvalidArrayLength();

    //     address expectedLoanToken = markets[0].loanToken;
    //     uint256 totalDebt;
    //     UserCollateral[] memory tempCollaterals = new UserCollateral[](
    //         markets.length
    //     );
    //     uint256 collateralCount = 0;

    //     for (uint256 i = 0; i < markets.length; i++) {
    //         TezoroYieldLib.Market calldata market = markets[i];
    //         _validateMarket(market);

    //         if (market.loanToken != expectedLoanToken) {
    //             revert MarketValidationFailed(
    //                 "Mismatched loanToken across markets"
    //             );
    //         }

    //         Id id = Id.wrap(market.auxId);
    //         Position memory pos = morpho.position(id, user);
    //         Market memory m = morpho.market(id);
    //         MarketParams memory mp = morpho.idToMarketParams(id);

    //         // Debt
    //         if (pos.borrowShares > 0 && m.totalBorrowShares > 0) {
    //             uint256 debt = (pos.borrowShares * m.totalBorrowAssets) /
    //                 m.totalBorrowShares;
    //             totalDebt += debt;
    //         }

    //         // Collateral
    //         if (pos.supplyShares > 0 && m.totalSupplyShares > 0) {
    //             uint256 supply = (pos.supplyShares * m.totalSupplyAssets) /
    //                 m.totalSupplyShares;
    //             if (supply > 0) {
    //                 uint256 liquidationThresholdBps = uint256(mp.lltv) / 1e14;
    //                 tempCollaterals[collateralCount++] = UserCollateral({
    //                     token: market.collateralToken,
    //                     amount: supply,
    //                     liquidationThresholdBps: liquidationThresholdBps
    //                 });
    //             }
    //         }
    //     }

    //     // Trim collaterals
    //     UserCollateral[] memory finalCollaterals = new UserCollateral[](
    //         collateralCount
    //     );
    //     for (uint256 i = 0; i < collateralCount; i++) {
    //         finalCollaterals[i] = tempCollaterals[i];
    //     }

    //     // Assign output
    //     position.collaterals = finalCollaterals;

    //     if (totalDebt > 0) {
    //         position.debts = new UserDebt[](1);
    //         position.debts[0] = UserDebt({
    //             token: expectedLoanToken,
    //             amount: totalDebt
    //         });
    //     } else {
    //         position.debts = new UserDebt[](0);
    //     }
    // }

    // function getHealthFactor(
    //     TezoroYieldLib.Market calldata /* market */,
    //     address
    // ) external pure override returns (uint256) {
    //     return 0; // TODO: Implement health factor calculation
    // }
}
