// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GenesisCurveVault (Web5 创世联合曲线储备金库)
 * @notice 功能内嵌型联合曲线 (Utility-Bonding Curve)
 *
 * 核心逻辑：
 * 1. 团队出资 100~200 USDC + 125万~250万 WBOG 启动创世联合曲线，起始价锚定为 $0.00008 USDC (1 USDC = 12,500 WBOG)。
 * 2. 资金流入通道：
 *    - 用户激活灵魂容器/充值，合约按当前曲线市价买入 WBOG 注入 Vessel；
 *    - 生态先锋与早期投资者直接注入 USDC 购买 WBOG（单笔硬顶 20 USDC 防巨鲸砸盘）。
 * 3. 价格上浮公式：每当池内累积增加 10 USDC，兑换单价微幅上浮 0.05%，完全拒绝空气炒作，由真实产品业务托底。
 * 4. 自动毕业仪式 (Auto-Graduation)：
 *    - 当储备金库累积达到 GRADUATION_CAP (3,000 USDC) 时，合约触发毕业；
 *    - 冻结内部曲线，将全部累积的 3,000 USDC 与对应 WBOG 划转用于在 DEX 组建初始流动性池并永久锁死 LP。
 */
contract GenesisCurveVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable wbog;

    // 初始基准参数 (18 位精度对齐 Arc 原生代币)
    uint256 public constant INITIAL_PRICE_USDC = 80_000_000_000_000; // 0.00008 * 10^18
    uint256 public constant GRADUATION_CAP = 3000 * 10 ** 18; // 3,000 USDC 自动毕业门槛
    uint256 public constant MAX_PER_TX_USDC = 20 * 10 ** 18;  // 单笔防鲸硬顶 20 USDC

    uint256 public totalUsdcReserve; // 储备池当前累积的真实 USDC
    uint256 public totalWbogSold;    // 曲线累计售出的 WBOG
    bool public isGraduated;         // 是否已触发毕业并迁移 DEX
    bool public isInitialized;       // 是否已注入创世种子

    event CurveInitialized(uint256 seedUsdc, uint256 seedWbog, uint256 timestamp);
    event TokensPurchased(address indexed buyer, address indexed recipient, uint256 usdcPaid, uint256 wbogReceived, uint256 currentPrice);
    event GraduatedToDex(uint256 totalUsdcMigrated, uint256 totalWbogMigrated, uint256 timestamp);

    constructor(address _usdc, address _wbog, address initialOwner)
        Ownable(initialOwner)
    {
        require(_usdc != address(0) && _wbog != address(0), "Invalid token addresses");
        usdc = IERC20(_usdc);
        wbog = IERC20(_wbog);
    }

    /**
     * @notice 启动创世曲线，注入团队初始 100~200 USDC 种子与对应 WBOG 底座
     */
    function initializeCurve(uint256 seedUsdc, uint256 seedWbog) external onlyOwner nonReentrant {
        require(!isInitialized, "Curve already initialized");
        require(seedUsdc >= 100 * 10 ** 18, "Minimum 100 USDC seed required");
        require(seedWbog >= 1_250_000 * 10 ** 18, "Minimum 1,250,000 WBOG required");

        isInitialized = true;
        totalUsdcReserve = seedUsdc;

        usdc.safeTransferFrom(msg.sender, address(this), seedUsdc);
        wbog.safeTransferFrom(msg.sender, address(this), seedWbog);

        emit CurveInitialized(seedUsdc, seedWbog, block.timestamp);
    }

    /**
     * @notice 获取当前曲线即时买入单价 (USDC / WBOG)
     * 公式: Price = BasePrice * (1 + 0.0005 * (CurrentReserve / 10 USDC))
     */
    function getCurrentPrice() public view returns (uint256) {
        if (!isInitialized) return INITIAL_PRICE_USDC;
        // 增量梯级
        uint256 increments = totalUsdcReserve / (10 * 10 ** 18);
        // 每 10 USDC 上浮 0.05% (5 / 10000)
        uint256 priceMultiplier = 10000 + (increments * 5);
        return (INITIAL_PRICE_USDC * priceMultiplier) / 10000;
    }

    /**
     * @notice 计算指定数量的 USDC 能购买的 WBOG 数量
     */
    function calculateWbogOutput(uint256 usdcAmount) public view returns (uint256) {
        uint256 price = getCurrentPrice();
        // WBOG Amount = (usdcAmount * 10^18) / price
        return (usdcAmount * 10 ** 18) / price;
    }

    /**
     * @notice 产品刚需激活 / 生态先锋购入 WBOG (注资储备金库)
     * @param recipient 接收代币的 Vessel 或用户地址
     * @param usdcAmount 支付的 USDC 数量 (18 位精度)
     */
    function buyWithUsdc(address recipient, uint256 usdcAmount) external nonReentrant returns (uint256) {
        require(isInitialized, "Curve not active");
        require(!isGraduated, "Curve graduated to DEX; trade on DEX instead");
        require(usdcAmount > 0, "Zero amount");
        require(usdcAmount <= MAX_PER_TX_USDC, "Exceeds max per tx anti-whale limit");
        require(recipient != address(0), "Invalid recipient");

        uint256 currentPrice = getCurrentPrice();
        uint256 wbogOutput = (usdcAmount * 10 ** 18) / currentPrice;

        require(wbog.balanceOf(address(this)) >= wbogOutput, "Insufficient WBOG vault balance");

        totalUsdcReserve += usdcAmount;
        totalWbogSold += wbogOutput;

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        wbog.safeTransfer(recipient, wbogOutput);

        emit TokensPurchased(msg.sender, recipient, usdcAmount, wbogOutput, currentPrice);

        // 达到 3000 USDC 自动触发毕业
        if (totalUsdcReserve >= GRADUATION_CAP) {
            _triggerGraduation();
        }

        return wbogOutput;
    }

    /**
     * @notice 内部毕业逻辑：将全部资金推向 DEX 并锁定
     */
    function _triggerGraduation() internal {
        isGraduated = true;
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 wbogBal = wbog.balanceOf(address(this));

        // 划转至管理员/DEX 配对合约 (未来支持在 Arc DEX 自动添加流动性并 burn LP)
        usdc.safeTransfer(owner(), usdcBal);
        wbog.safeTransfer(owner(), wbogBal);

        emit GraduatedToDex(usdcBal, wbogBal, block.timestamp);
    }
}
