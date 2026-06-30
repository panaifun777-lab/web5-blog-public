// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title BudgetFence — AP2 微支付预算控制合约
/// @notice 三道闸：Scope Lock / Daily Cap / Decaying Auth
/// @dev 部署到 Base Sepolia，superadmin = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
contract BudgetFence is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VESSEL_AUTH_ROLE = keccak256("VESSEL_AUTH_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    /// @notice BudgetFence 配置（每个 Vessel 一份）
    struct Budget {
        uint256 dailyLimit;         // 6-decimal USDC，每日总上限
        uint256 perTxLimit;         // 单笔上限
        uint256 rateLimitPerMin;    // 每分钟交易数上限
        uint256 spentToday;         // 今日已花费
        uint256 lastResetDay;       // 上次重置日（用于每日重置）
        uint256 txCountThisMin;     // 本分钟交易数
        uint256 lastResetMin;       // 上次重置分钟
        bool frozen;                // 是否冻结（紧急熔断）
    }

    /// @notice 微支付记录（off-chain ledger 结算上链）
    struct Payment {
        address from;
        address to;
        uint256 amount;
        string category;            // read / tip / subscribe / royalty
        string ref;                 // 内容哈希或引用
        uint256 timestamp;
    }

    mapping(address => Budget) public budgets;
    mapping(address => address[]) public whitelists;
    mapping(address => mapping(address => bool)) public whitelistSet;
    mapping(address => bool) public frozenVessels;

    /// @notice USDC 代币地址
    IERC20 public immutable usdc;

    /// @notice 收款方 → 收款总额
    mapping(address => uint256) public totalReceived;
    /// @notice 付款方 → 付款总额
    mapping(address => uint256) public totalSpent;

    event BudgetSet(address indexed vessel, uint256 dailyLimit, uint256 perTxLimit, uint256 rateLimitPerMin);
    event WhitelistUpdated(address indexed vessel, address indexed target, bool allowed);
    event PaymentSettled(
        address indexed from,
        address indexed to,
        uint256 amount,
        string category,
        string ref,
        uint256 timestamp
    );
    event BatchSettled(address indexed vessel, uint256 count, uint256 totalAmount, uint256 timestamp);
    event VesselFrozen(address indexed vessel, string reason, uint256 timestamp);
    event VesselUnfrozen(address indexed vessel, uint256 timestamp);

    modifier notFrozen(address vessel) {
        require(!frozenVessels[vessel] && !budgets[vessel].frozen, "Vessel frozen");
        _;
    }

    constructor(address _usdc, address superadmin) {
        require(_usdc != address(0), "USDC cannot be zero");
        require(superadmin != address(0), "Superadmin cannot be zero");
        usdc = IERC20(_usdc);
        _grantRole(DEFAULT_ADMIN_ROLE, superadmin);
        _grantRole(SETTLER_ROLE, superadmin);
        _grantRole(VESSEL_AUTH_ROLE, superadmin);
    }

    /// @notice 设置 BudgetFence（仅 VESSEL_AUTH_ROLE — 通常由 VesselAuth 合约调用）
    function setBudget(
        address vessel,
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 rateLimitPerMin
    ) external onlyRole(VESSEL_AUTH_ROLE) {
        require(dailyLimit > 0, "Daily limit must be positive");
        require(perTxLimit > 0, "Per-tx limit must be positive");
        require(perTxLimit <= dailyLimit, "Per-tx cannot exceed daily");

        Budget storage b = budgets[vessel];
        b.dailyLimit = dailyLimit;
        b.perTxLimit = perTxLimit;
        b.rateLimitPerMin = rateLimitPerMin;
        if (b.lastResetDay == 0) b.lastResetDay = block.timestamp / 1 days;
        if (b.lastResetMin == 0) b.lastResetMin = block.timestamp / 1 minutes;

        emit BudgetSet(vessel, dailyLimit, perTxLimit, rateLimitPerMin);
    }

    /// @notice 更新白名单
    function updateWhitelist(address vessel, address target, bool allowed) external onlyRole(VESSEL_AUTH_ROLE) {
        if (allowed && !whitelistSet[vessel][target]) {
            whitelists[vessel].push(target);
            whitelistSet[vessel][target] = true;
        } else if (!allowed && whitelistSet[vessel][target]) {
            whitelistSet[vessel][target] = false;
        }
        emit WhitelistUpdated(vessel, target, allowed);
    }

    /// @notice 单笔结算（Gate 1/2/3 校验）
    function settle(
        address from,
        address to,
        uint256 amount,
        string calldata category,
        string calldata ref
    ) external onlyRole(SETTLER_ROLE) nonReentrant notFrozen(from) returns (bool) {
        require(amount > 0, "Amount must be positive");

        Budget storage b = budgets[from];
        _resetIfNewDay(b);
        _resetIfNewMin(b);

        // Gate 1: Scope Lock
        require(amount <= b.perTxLimit, "Gate 1: Per-tx limit exceeded");
        // 白名单为空时允许所有；非空时必须在白名单中
        if (whitelists[from].length > 0) {
            require(whitelistSet[from][to], "Gate 1: Recipient not in whitelist");
        }

        // Gate 2: Daily Cap
        require(b.spentToday + amount <= b.dailyLimit, "Gate 2: Daily cap exceeded");

        // Gate 3: Decaying Auth
        require(b.txCountThisMin < b.rateLimitPerMin, "Gate 3: Rate limit exceeded");

        // 执行转账
        usdc.safeTransferFrom(from, to, amount);

        // 更新统计
        b.spentToday += amount;
        b.txCountThisMin += 1;
        totalSpent[from] += amount;
        totalReceived[to] += amount;

        emit PaymentSettled(from, to, amount, category, ref, block.timestamp);
        return true;
    }

    /// @notice 批量结算（off-chain ledger 累积后批量上链）
    function batchSettle(
        address[] calldata froms,
        address[] calldata tos,
        uint256[] calldata amounts,
        string[] calldata categories,
        string[] calldata refs
    ) external onlyRole(SETTLER_ROLE) nonReentrant returns (uint256) {
        require(
            froms.length == tos.length &&
            froms.length == amounts.length &&
            froms.length == categories.length &&
            froms.length == refs.length,
            "Array length mismatch"
        );

        uint256 settled = 0;
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < froms.length; i++) {
            if (frozenVessels[froms[i]] || budgets[froms[i]].frozen) continue;

            Budget storage b = budgets[froms[i]];
            _resetIfNewDay(b);
            _resetIfNewMin(b);

            // 跳过超出预算的支付（不 revert 整批）
            if (
                amounts[i] > b.perTxLimit ||
                b.spentToday + amounts[i] > b.dailyLimit ||
                b.txCountThisMin >= b.rateLimitPerMin ||
                (whitelists[froms[i]].length > 0 && !whitelistSet[froms[i]][tos[i]])
            ) {
                continue;
            }

            usdc.safeTransferFrom(froms[i], tos[i], amounts[i]);
            b.spentToday += amounts[i];
            b.txCountThisMin += 1;
            totalSpent[froms[i]] += amounts[i];
            totalReceived[tos[i]] += amounts[i];
            totalAmount += amounts[i];
            settled++;

            emit PaymentSettled(froms[i], tos[i], amounts[i], categories[i], refs[i], block.timestamp);
        }

        emit BatchSettled(msg.sender, settled, totalAmount, block.timestamp);
        return settled;
    }

    /// @notice 紧急冻结 Vessel（仅 superadmin）
    function freezeVessel(address vessel, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozenVessels[vessel] = true;
        budgets[vessel].frozen = true;
        emit VesselFrozen(vessel, reason, block.timestamp);
    }

    /// @notice 解冻 Vessel（仅 superadmin）
    function unfreezeVessel(address vessel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozenVessels[vessel] = false;
        budgets[vessel].frozen = false;
        emit VesselUnfrozen(vessel, block.timestamp);
    }

    /// @notice 获取 Budget 状态
    function getBudget(address vessel) external view returns (Budget memory) {
        return budgets[vessel];
    }

    /// @notice 获取白名单
    function getWhitelist(address vessel) external view returns (address[] memory) {
        return whitelists[vessel];
    }

    /// @notice 每日重置检查
    function _resetIfNewDay(Budget storage b) internal {
        uint256 today = block.timestamp / 1 days;
        if (today > b.lastResetDay) {
            b.spentToday = 0;
            b.lastResetDay = today;
        }
    }

    /// @notice 每分钟重置检查
    function _resetIfNewMin(Budget storage b) internal {
        uint256 thisMin = block.timestamp / 1 minutes;
        if (thisMin > b.lastResetMin) {
            b.txCountThisMin = 0;
            b.lastResetMin = thisMin;
        }
    }
}
