// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

import {IYieldAdapter} from "../../interfaces/IYieldAdapter.sol";
import {IYieldAdapterWithRewards} from "../../interfaces/IYieldAdapterWithRewards.sol";
import {TezoroYieldLib} from "../../libs/TezoroYieldLib.sol";
import {Math} from "openzeppelin-contracts/contracts/utils/math/Math.sol";

/// @notice Minimal Beefy Vault interface (mooToken)
interface IBeefyVault {
    function deposit(uint256 amount) external;

    function withdraw(uint256 shares) external;

    function withdrawAll() external;

    function balanceOf(address account) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function want() external view returns (address); // underlying token
}

/// @notice Adapter for Beefy Vaults (e.g. mooTokens)
contract BeefyAdapter is ERC165, IYieldAdapter, IYieldAdapterWithRewards {
    using SafeERC20 for IERC20;

    error MarketValidationFailed(string reason);
    error ZeroAmount();

    string public name;
    uint16 public immutable protocolCode;

    constructor(string memory _name, uint16 _protocolCode) {
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

    function _validateMarket(
        TezoroYieldLib.Market memory market
    ) internal view {
        if (market.supply.auxId != bytes32(0)) {
            revert MarketValidationFailed("auxId should be zero");
        }
        if (market.flags != 0) {
            revert MarketValidationFailed("flags should be zero");
        }

        address expectedWant = IBeefyVault(market.supply.market).want();
        if (expectedWant != market.supply.token) {
            revert MarketValidationFailed(
                "supply.token must match want() of vault"
            );
        }
    }

    /// @dev Return call data for deposit into Beefy vault
    function getSupplyCallData(
        TezoroYieldLib.Market calldata market,
        uint256 amount,
        address /* user */
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);
        target = market.supply.market;
        callData = abi.encodeWithSelector(IBeefyVault.deposit.selector, amount);
    }

    /// @dev Return call data for withdraw from Beefy vault
    function getWithdrawCallData(
        TezoroYieldLib.Market calldata market,
        address
    ) external view override returns (address target, bytes memory callData) {
        _validateMarket(market);
        target = market.supply.market;

        callData = abi.encodeWithSelector(IBeefyVault.withdrawAll.selector);

        // uint256 shares = IBeefyVault(market.supply.market).balanceOf(user);

        // callData = abi.encodeWithSelector(
        //     IBeefyVault.withdraw.selector,
        //     shares
        // );
    }

    function _staticUint(
        address target,
        bytes memory data
    ) internal view returns (bool ok, uint256 val) {
        (bool success, bytes memory ret) = target.staticcall(data);
        if (success && ret.length >= 32) {
            ok = true;
            val = abi.decode(ret, (uint256));
        } else {
            ok = false;
        }
    }

    function _sharesToAssets(
        address vaultAddr,
        uint256 shares
    ) internal view returns (uint256) {
        if (shares == 0) return 0;

        // 1) ERC-4626
        {
            (bool ok, uint256 assets) = _staticUint(
                vaultAddr,
                abi.encodeWithSignature("convertToAssets(uint256)", shares)
            );
            if (ok) return assets;
        }

        // 2) totalAssets() / balance()
        {
            (bool ok, uint256 totalAssets) = _staticUint(
                vaultAddr,
                abi.encodeWithSignature("totalAssets()")
            );
            if (!ok) {
                (ok, totalAssets) = _staticUint(
                    vaultAddr,
                    abi.encodeWithSignature("balance()")
                );
            }
            if (ok) {
                uint256 ts = IBeefyVault(vaultAddr).totalSupply();
                if (ts == 0) return 0;
                return Math.mulDiv(shares, totalAssets, ts);
            }
        }

        // 3) PPFS / PPS (1e18)
        {
            (bool ok, uint256 p) = _staticUint(
                vaultAddr,
                abi.encodeWithSignature("getPricePerFullShare()")
            );
            if (!ok) {
                (ok, p) = _staticUint(
                    vaultAddr,
                    abi.encodeWithSignature("pricePerShare()")
                );
            }
            if (!ok) {
                (ok, p) = _staticUint(
                    vaultAddr,
                    abi.encodeWithSignature("getPricePerShare()")
                );
            }
            if (ok) return (shares * p) / 1e18;
        }

        // 4) Worst fallback
        {
            address want = IBeefyVault(vaultAddr).want();
            uint256 ts = IBeefyVault(vaultAddr).totalSupply();
            if (ts == 0) return 0;
            uint256 wantOnVault = IERC20(want).balanceOf(vaultAddr);
            return (shares * wantOnVault) / ts;
        }
    }

    /// @dev Returns mooToken balance of user
    function getSupplyBalance(
        TezoroYieldLib.Market calldata market,
        address user
    ) public view override returns (uint256) {
        IBeefyVault vault = IBeefyVault(market.supply.market);
        uint256 shares = vault.balanceOf(user);
        return _sharesToAssets(address(vault), shares);
    }

    /// @dev Beefy vaults autocompound — no manual rewards claim
    function getClaimRewardsCallData(
        TezoroYieldLib.Market[] calldata /* markets */,
        address /* user */
    ) external pure override returns (address target, bytes memory callData) {
        return (address(0), "");
    }

    /// @dev Beefy vaults don’t expose reward tokens
    function getRewardTokensForMarket(
        TezoroYieldLib.Market calldata /* market */
    ) external pure override returns (address[] memory) {
        return new address[](0);
    }

    /// @dev Beefy vaults don’t expose claimable reward balances
    function getRewardBalances(
        TezoroYieldLib.Market[] calldata markets,
        address /* user */
    )
        external
        pure
        override
        returns (TezoroYieldLib.RewardBalance[] memory rewards)
    {
        rewards = new TezoroYieldLib.RewardBalance[](markets.length);
        for (uint256 i = 0; i < markets.length; i++) {
            rewards[i] = TezoroYieldLib.RewardBalance({
                market: markets[i],
                rewardTokens: new address[](0),
                amounts: new uint256[](0)
            });
        }
    }
}
