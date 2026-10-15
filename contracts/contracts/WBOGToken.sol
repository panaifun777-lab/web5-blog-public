// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title WBOG Token (Web5 Bog Token)
 * @notice 官方代币 — 驱动 Web5.bog 平台 AI 分身生态、ARC 网关协议、微支付与内容确权
 * @dev 部署地址 / 初始所有者: 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
 *      - 标准规范: ARC-20 / ERC-20 严格对齐
 *      - 符号 Symbol: WBOG (全大写纯 ASCII)
 *      - 精度 Decimals: 18
 *      - 固定发行总量 Total Supply: 1,000,000,000 WBOG (10 亿枚，不可增发)
 *      - 支持 Burnable 销毁机制 (满足 50% 网关手续费公开回购销毁模型)
 *      - 继承 Ownable2Step 安全所有权管理，支持 renounceOwnership 锁权/放弃权限
 */
contract WBOGToken is ERC20, ERC20Burnable, Ownable2Step {
    /// @notice 10 亿枚固定总量 (1,000,000,000 * 10^18)
    uint256 public constant TOTAL_SUPPLY_CAP = 1_000_000_000 * 10 ** 18;

    /// @notice 官方主域名
    string public constant OFFICIAL_DOMAIN = "web5.bog";

    /**
     * @param initialOwner 初始代币接收者与合约拥有者
     */
    constructor(address initialOwner)
        ERC20("Web5 Bog Token", "WBOG")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "WBOG: zero address not allowed");
        _mint(initialOwner, TOTAL_SUPPLY_CAP);
    }

    /**
     * @notice 获取代币精度 (固定为 18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
