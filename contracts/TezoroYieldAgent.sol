// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {Address} from "openzeppelin-contracts/contracts/utils/Address.sol";

import {IYieldAdapter} from "./interfaces/IYieldAdapter.sol";
import {IYieldAdapterWithRewards} from "./interfaces/IYieldAdapterWithRewards.sol";

import {TezoroYieldAgentFactory} from "./TezoroYieldAgentFactory.sol";

import {ArrayUtils} from "./utils/ArrayUtils.sol";
import {TezoroYieldLib} from "./libs/TezoroYieldLib.sol";

contract TezoroYieldAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for address;
    using TezoroYieldLib for *;

    error InvalidParam(string reason);
    error NoAdapter();
    error NoAdaptersProvided();
    error AdapterAlreadyRegistered();
    error ProtocolNotFound(uint16 protocolCode);
    error MismatchedInputLengths();
    error NoTokensToWithdraw();
    error InvalidInitialization();
    error NoMarketTokenRegistered(bytes32 marketId);
    error NotAuthorized();
    error MarketTokenMismatch(
        bytes32 marketId,
        address expected,
        address actual
    );
    error AdapterInterfaceNotSupported(address adapter);
    error InsufficientBalance(uint256 expected, uint256 actual, address token);
    error AgentDisabled();
    error ProtocolPaused(uint16 protocolCode);

    event ProtocolDisabled(uint16 indexed protocolCode);
    event Supplied(
        address indexed token,
        uint16 indexed protocolCode,
        bytes32 indexed marketId,
        uint256 amount,
        uint256 nonce
        // bytes resultData
    );
    event RebalanceWithdrawn(
        address indexed token,
        uint16 indexed protocolCode,
        bytes32 indexed marketId,
        uint256 amount
    );

    event RebalanceSupplied(
        address indexed token,
        uint16 indexed toProtocol,
        bytes32 indexed toMarketId,
        uint256 amount,
        uint256 allocationNonce
    );

    event RewardsClaimed(
        address indexed token,
        uint16 indexed protocolCode,
        bytes32 indexed marketId,
        address recipient,
        address rewardToken,
        uint256 amount,
        uint256 allocationNonce
    );
    event MarketRegistered(
        uint16 indexed protocolCode,
        bytes32 indexed marketId,
        TezoroYieldLib.Market market
    );
    event ProtocolAdapterRegistered(
        uint16 indexed protocolCode,
        address indexed adapter
    );
    event ManagementFeeTaken(
        address indexed token,
        uint256 amount,
        address recipient
    );
    event ExternalCallFailed(
        address indexed target,
        string action,
        string reason
    );
    event AgentDeactivated();
    event Withdrawn(
        address indexed token,
        uint16 indexed protocolCode,
        bytes32 indexed marketId,
        uint256 amount,
        uint256 managementFee,
        uint256 nonce
    );

    mapping(uint16 => bool) private _pausedProtocols;
    mapping(address => uint256) public earned;
    mapping(address => uint256) public principalSupplied;
    mapping(address => mapping(bytes32 => uint256))
        public currentAllocationNonce;
    mapping(uint16 => address) public protocolToAdapter;

    struct ClaimRewardsParams {
        uint16 protocolCode;
        TezoroYieldLib.Market market;
        address recipient;
        bool forward;
        bool isFailSafe;
    }

    EnumerableSet.UintSet private protocolCodes;

    uint256 private constant BASIS_POINTS_DIVISOR = 10_000;
    uint256 public deploymentTimestamp;

    address public factory;

    bool public initialized;
    bool public isDisabled;

    function _checkKeeper() internal view {
        if (!TezoroYieldAgentFactory(factory).isKeeper(msg.sender))
            revert NotAuthorized();
    }

    function _checkKeeperOrOwner() internal view {
        if (
            !TezoroYieldAgentFactory(factory).isKeeper(msg.sender) &&
            msg.sender != owner()
        ) revert NotAuthorized();
    }

    modifier notDisabled() {
        if (isDisabled) revert AgentDisabled();
        _;
    }

    modifier onlyKeeper() {
        _checkKeeper();
        _;
    }

    modifier onlyKeeperOrOwner() {
        _checkKeeperOrOwner();
        _;
    }

    modifier protocolsNotPaused(uint16[] calldata _protocolCodes) {
        for (uint256 i = 0; i < _protocolCodes.length; i++) {
            if (_isProtocolPaused(_protocolCodes[i])) {
                revert ProtocolPaused(_protocolCodes[i]);
            }
        }
        _;
    }

    function _isProtocolPaused(
        uint16 protocolCode
    ) internal view returns (bool) {
        return _pausedProtocols[protocolCode];
    }

    function permanentlyDisable() external onlyOwner {
        isDisabled = true;
        emit AgentDeactivated();
    }

    function initialize(
        address _owner,
        address[] memory _adapters,
        address _factory
    ) external {
        if (initialized) revert InvalidInitialization();
        initialized = true;

        if (_owner == address(0)) revert InvalidParam("Owner cannot be zero");
        _transferOwnership(_owner);

        if (_adapters.length == 0) revert NoAdaptersProvided();

        factory = _factory;
        deploymentTimestamp = block.timestamp;

        for (uint256 i = 0; i < _adapters.length; i++) {
            address adapter = _adapters[i];
            if (adapter == address(0)) revert NoAdapter();

            if (
                !IERC165(adapter).supportsInterface(
                    type(IYieldAdapter).interfaceId
                )
            ) revert AdapterInterfaceNotSupported(adapter);

            uint16 protocolCode = IYieldAdapter(adapter).protocolCode();
            if (protocolToAdapter[protocolCode] != address(0))
                revert AdapterAlreadyRegistered();
            protocolToAdapter[protocolCode] = adapter;
            protocolCodes.add(protocolCode);
            emit ProtocolAdapterRegistered(protocolCode, adapter);
        }
    }

    function _marketId(
        uint16 protocolCode,
        TezoroYieldLib.Market memory market
    ) internal pure returns (bytes32) {
        return TezoroYieldLib.toMarketId(protocolCode, market);
    }

    function _safeCall(
        address target,
        bytes memory data
    ) internal returns (bytes memory) {
        return target.functionCall(data, "External call failed");
    }

    function _trySafeCall(
        address target,
        bytes memory data,
        string memory action
    ) internal returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(data);
        if (!success) {
            string memory reason;
            if (returnData.length >= 68) {
                assembly {
                    // Slice out the revert reason string
                    returnData := add(returnData, 0x04) // skip selector
                }
                reason = abi.decode(returnData, (string));
            } else {
                reason = "Unknown error";
            }

            emit ExternalCallFailed(target, action, reason);
        }
    }

    function _callWithdrawAdapter(
        uint16 protocolCode,
        TezoroYieldLib.Market memory market
    ) internal returns (uint256 withdrawnAmount) {
        address adapter = protocolToAdapter[protocolCode];
        (address target, bytes memory callData) = IYieldAdapter(adapter)
            .getWithdrawCallData(market, address(this));

        uint256 beforeBalance = IERC20(market.supply.token).balanceOf(
            address(this)
        );

        _safeCall(target, callData);

        uint256 afterBalance = IERC20(market.supply.token).balanceOf(
            address(this)
        );
        withdrawnAmount = afterBalance - beforeBalance;

        uint256 principal = principalSupplied[market.supply.token];
        if (withdrawnAmount > principal) {
            earned[market.supply.token] += withdrawnAmount - principal;
        }
        principalSupplied[market.supply.token] = 0;
    }

    function recoverERC20(
        address tokenAddress,
        uint256 tokenAmount
    ) external onlyOwner {
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    //--------------------------------------------------------------------------
    // Adapters management
    //--------------------------------------------------------------------------

    function pauseProtocol(uint16 protocolCode) external onlyOwner {
        _pausedProtocols[protocolCode] = true;
        emit ProtocolDisabled(protocolCode);
    }

    function getProtocols() external view returns (uint256[] memory) {
        return protocolCodes.values();
    }

    //--------------------------------------------------------------------------
    // Distribution logic
    //--------------------------------------------------------------------------

    function _approveIfNeeded(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = token.allowance(address(this), spender);

        if (currentAllowance < amount) {
            if (currentAllowance != 0) {
                token.safeApprove(spender, 0);
            }
            token.safeApprove(spender, type(uint256).max);
        }
    }

    function rebalance(
        TezoroYieldLib.RebalanceStep[] calldata steps
    ) external onlyKeeper notDisabled nonReentrant {
        for (uint256 i = 0; i < steps.length; i++) {
            TezoroYieldLib.RebalanceStep memory step = steps[i];
            if (_isProtocolPaused(step.fromProtocolCode)) {
                revert ProtocolPaused(step.fromProtocolCode);
            }
            if (_isProtocolPaused(step.toProtocolCode)) {
                revert ProtocolPaused(step.toProtocolCode);
            }

            if (
                step.fromProtocolCode == step.toProtocolCode ||
                step.fromProtocolCode == 0 ||
                step.toProtocolCode == 0
            ) {
                revert InvalidParam("Invalid protocol codes provided");
            }

            address token = step.fromMarket.supply.token;
            bytes32 fromMarketId = _marketId(
                step.fromProtocolCode,
                step.fromMarket
            );

            // Withdraw
            uint256 out = _callWithdrawAdapter(
                step.fromProtocolCode,
                step.fromMarket
            );

            emit RebalanceWithdrawn(
                token,
                step.fromProtocolCode,
                fromMarketId,
                out
            );

            _claimRewards(
                ClaimRewardsParams({
                    protocolCode: step.fromProtocolCode,
                    market: step.fromMarket,
                    recipient: address(this),
                    forward: true,
                    isFailSafe: false
                })
            );

            // Supply to new
            _supplyToMarket(token, step.toMarket, step.toProtocolCode, out);

            bytes32 toMarketId = _marketId(step.toProtocolCode, step.toMarket);
            uint256 allocationNonce = currentAllocationNonce[token][
                toMarketId
            ] - 1;

            emit RebalanceSupplied(
                token,
                step.toProtocolCode,
                toMarketId,
                out,
                allocationNonce
            );
        }
    }

    function _chargeManagementFee(
        address token
    ) internal returns (uint256 fee) {
        uint256 profit = earned[token];

        uint256 feeBps = TezoroYieldAgentFactory(factory).SUCCESS_FEE_BPS();
        fee = (profit * feeBps) / BASIS_POINTS_DIVISOR;

        if (fee != 0) {
            address treasury = TezoroYieldAgentFactory(factory).treasury();
            IERC20(token).safeTransfer(treasury, fee);
            emit ManagementFeeTaken(token, fee, treasury);
        }
        earned[token] = 0;
    }

    function _supplyToMarket(
        address tokenAddress,
        TezoroYieldLib.Market memory market,
        uint16 protocolCode,
        uint256 amount
    ) internal {
        IERC20 token = IERC20(tokenAddress);

        uint256 selfBal = token.balanceOf(address(this));
        if (selfBal < amount) {
            revert InsufficientBalance(amount, selfBal, address(token));
        }

        address adapter = protocolToAdapter[protocolCode];
        (address target, bytes memory callData) = IYieldAdapter(adapter)
            .getSupplyCallData(market, amount, address(this));

        _approveIfNeeded(token, target, amount);

        bytes32 marketId = _marketId(protocolCode, market);

        _safeCall(target, callData);

        emit MarketRegistered(protocolCode, marketId, market);

        uint256 nonce = currentAllocationNonce[address(token)][marketId]++;
        principalSupplied[address(token)] += amount;
        emit Supplied(
            address(token),
            protocolCode,
            marketId,
            amount,
            nonce
            // supplyResult
        );
    }

    function distribute(
        address[] calldata _tokens,
        uint16[] calldata _protocolCodes,
        TezoroYieldLib.Market[] calldata _markets,
        uint256[] calldata _amounts
    )
        external
        onlyKeeperOrOwner
        notDisabled
        nonReentrant
        protocolsNotPaused(_protocolCodes)
    {
        if (
            _tokens.length != _protocolCodes.length ||
            _tokens.length != _markets.length ||
            _tokens.length != _amounts.length
        ) revert MismatchedInputLengths();

        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint16 protocolCode = _protocolCodes[i];
            TezoroYieldLib.Market memory market = _markets[i];
            uint256 amount = _amounts[i];

            if (token == address(0))
                revert InvalidParam("Token cannot be zero");
            if (protocolCode == 0)
                revert InvalidParam("Protocol code cannot be zero");

            address adapter = protocolToAdapter[protocolCode];
            if (adapter == address(0)) revert ProtocolNotFound(protocolCode);

            IERC20(token).safeTransferFrom(this.owner(), address(this), amount);

            _supplyToMarket(token, market, protocolCode, amount);
        }
    }

    //--------------------------------------------------------------------------
    // Withdraw logic
    //--------------------------------------------------------------------------

    function _transferBatch(
        address[] memory tokens,
        uint256[] memory amounts,
        address to
    ) internal {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).safeTransfer(to, amounts[i]);
        }
    }

    function batchWithdraw(
        uint16[] calldata _protocolCodes,
        TezoroYieldLib.Market[] calldata _markets,
        bool isClaimRewardsRequired
    )
        external
        onlyKeeperOrOwner
        nonReentrant
        protocolsNotPaused(_protocolCodes)
    {
        if (_protocolCodes.length != _markets.length)
            revert MismatchedInputLengths();

        for (uint256 i = 0; i < _protocolCodes.length; i++) {
            TezoroYieldLib.Market memory market = _markets[i];
            address token = market.supply.token;
            uint16 protocolCode = _protocolCodes[i];

            uint256 withdrawn = _callWithdrawAdapter(protocolCode, market);

            bytes32 marketId = _marketId(protocolCode, market);

            address owner = this.owner();

            if (isClaimRewardsRequired) {
                _claimRewards(
                    ClaimRewardsParams({
                        protocolCode: protocolCode,
                        market: market,
                        recipient: owner,
                        forward: true,
                        isFailSafe: true
                    })
                );
            }

            uint256 fee = _chargeManagementFee(token);
            if (token != address(0)) {
                uint256 balance = IERC20(token).balanceOf(address(this));
                if (balance > 0) {
                    IERC20(token).safeTransfer(owner, balance);
                }
            }

            uint256 current = currentAllocationNonce[token][marketId];
            if (current == 0) {
                revert InvalidParam("Withdraw before any supply");
            }
            uint256 nonce;
            unchecked {
                nonce = current - 1;
            }

            principalSupplied[token] = 0;

            emit Withdrawn(
                token,
                protocolCode,
                marketId,
                withdrawn,
                fee,
                nonce
            );
        }
    }

    function _claimRewards(ClaimRewardsParams memory p) internal {
        address adapter = protocolToAdapter[p.protocolCode];
        if (
            !IERC165(adapter).supportsInterface(
                type(IYieldAdapterWithRewards).interfaceId
            )
        ) return;

        TezoroYieldLib.Market[] memory markets = new TezoroYieldLib.Market[](1);
        markets[0] = p.market;

        (
            address rewardTarget,
            bytes memory rewardCallData
        ) = IYieldAdapterWithRewards(adapter).getClaimRewardsCallData(
                markets,
                address(this)
            );

        if (rewardTarget == address(0) || rewardCallData.length == 0) return;

        address[] memory rewardTokens = IYieldAdapterWithRewards(adapter)
            .getRewardTokensForMarket(p.market);

        uint256[] memory preBalances = new uint256[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            preBalances[i] = IERC20(rewardTokens[i]).balanceOf(address(this));
        }

        if (p.isFailSafe) {
            _safeCall(rewardTarget, rewardCallData);
        } else {
            _trySafeCall(rewardTarget, rewardCallData, "Claiming rewards");
        }

        _processClaimedRewards(p, rewardTokens, preBalances);
    }

    function _processClaimedRewards(
        ClaimRewardsParams memory p,
        address[] memory rewardTokens,
        uint256[] memory preBalances
    ) internal {
        bytes32 marketId = _marketId(p.protocolCode, p.market);
        uint256 allocationNonce = currentAllocationNonce[p.market.supply.token][
            marketId
        ];
        if (allocationNonce == 0)
            revert InvalidParam("Claim before any supply");
        unchecked {
            allocationNonce--;
        }

        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address rewardToken = rewardTokens[i];
            uint256 beforeBal = preBalances[i];
            uint256 afterBal = IERC20(rewardToken).balanceOf(address(this));
            if (afterBal > beforeBal) {
                uint256 delta = afterBal - beforeBal;

                if (p.forward) {
                    IERC20(rewardToken).safeTransfer(p.recipient, delta);
                }

                emit RewardsClaimed(
                    p.market.supply.token,
                    p.protocolCode,
                    marketId,
                    p.recipient,
                    rewardToken,
                    delta,
                    allocationNonce
                );
            }
        }
    }
}
