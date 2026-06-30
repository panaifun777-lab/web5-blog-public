// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VesselAuth — 容器登录授权合约
/// @notice Web5 全球首创容器登录范式的链上锚定层
/// @dev 实现 Step 3 Prime Delegation Check + Step 4 Vessel Token Issue 的链上验证
/// 部署到 Base Sepolia，superadmin = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
contract VesselAuth is AccessControl, ReentrancyGuard {
    bytes32 public constant EIDOLON_OS_ROLE = keccak256("EIDOLON_OS_ROLE");
    bytes32 public constant BLOG_NODE_ROLE = keccak256("BLOG_NODE_ROLE");

    /// @notice Session Key 配置（Prime 下发给 Vessel）
    struct SessionKey {
        address vessel;             // Vessel Smart Account 地址
        address prime;              // Prime 钱包地址
        string vesselDid;           // Vessel DID
        string eidolonDid;          // Eidolon DID
        string primeDid;            // Prime DID
        uint256 dailyLimit;         // 每日微支付上限（6-decimal USDC）
        uint256 perTxLimit;         // 单笔上限
        uint256 rateLimitPerMin;    // 每分钟速率限制
        uint8 permissions;          // 位掩码：1=read, 2=comment, 4=publish, 8=micropay, 16=harvest
        uint256 expiresAt;          // 过期时间戳
        uint256 createdAt;          // 创建时间
        bool revoked;               // 是否已撤销
    }

    /// @notice Vessel 激活记录（容器唤醒日志）
    struct VesselActivation {
        string vesselDid;
        string eidolonDid;
        string primeDid;
        address blogNode;           // 触发唤醒的博客节点
        string challengeNonce;      // AP2 Challenge nonce
        uint256 activatedAt;
    }

    mapping(address => SessionKey) public sessionKeys;          // vessel → SessionKey
    mapping(address => address) public primeOfVessel;           // vessel → prime
    mapping(address => address[]) public vesselsOfPrime;        // prime → vessels[]
    mapping(address => VesselActivation[]) public activationLogs; // vessel → 激活记录

    /// @notice 全局统计
    uint256 public totalVesselsActivated;
    uint256 public totalSessionsGranted;
    uint256 public totalSessionsRevoked;

    /// @notice blogNode → 是否授权
    mapping(address => bool) public authorizedBlogNodes;

    event SessionKeyGranted(
        address indexed vessel,
        address indexed prime,
        string vesselDid,
        string eidolonDid,
        string primeDid,
        uint256 dailyLimit,
        uint8 permissions,
        uint256 expiresAt,
        uint256 timestamp
    );

    event SessionKeyRevoked(
        address indexed vessel,
        address indexed prime,
        string reason,
        uint256 timestamp
    );

    event VesselAwakened(
        address indexed vessel,
        string vesselDid,
        string eidolonDid,
        string primeDid,
        address indexed blogNode,
        string challengeNonce,
        uint256 timestamp
    );

    event BlogNodeAuthorized(address indexed blogNode, uint256 timestamp);
    event BlogNodeRevoked(address indexed blogNode, uint256 timestamp);

    constructor(address superadmin) {
        require(superadmin != address(0), "Superadmin cannot be zero");
        _grantRole(DEFAULT_ADMIN_ROLE, superadmin);
        _grantRole(EIDOLON_OS_ROLE, superadmin);
        _grantRole(BLOG_NODE_ROLE, superadmin);
    }

    /// @notice Step 3: Prime Delegation — Prime 通过 EidolonOS 授权 Vessel
    /// @dev 仅 EIDOLON_OS_ROLE（eidolonos.xyz 预言机）可调用
    function grantSessionKey(
        address vessel,
        address prime,
        string calldata vesselDid,
        string calldata eidolonDid,
        string calldata primeDid,
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 rateLimitPerMin,
        uint8 permissions,
        uint256 expiresAt
    ) external onlyRole(EIDOLON_OS_ROLE) nonReentrant {
        require(vessel != address(0), "Vessel cannot be zero");
        require(prime != address(0), "Prime cannot be zero");
        require(bytes(vesselDid).length > 0, "Vessel DID required");
        require(bytes(eidolonDid).length > 0, "Eidolon DID required");
        require(expiresAt > block.timestamp, "Expiry must be future");
        require(dailyLimit > 0, "Daily limit must be positive");

        // 如果该 Vessel 已有未过期的 Session，先撤销
        if (sessionKeys[vessel].vessel != address(0) && !sessionKeys[vessel].revoked) {
            sessionKeys[vessel].revoked = true;
            totalSessionsRevoked++;
        }

        sessionKeys[vessel] = SessionKey({
            vessel: vessel,
            prime: prime,
            vesselDid: vesselDid,
            eidolonDid: eidolonDid,
            primeDid: primeDid,
            dailyLimit: dailyLimit,
            perTxLimit: perTxLimit,
            rateLimitPerMin: rateLimitPerMin,
            permissions: permissions,
            expiresAt: expiresAt,
            createdAt: block.timestamp,
            revoked: false
        });

        primeOfVessel[vessel] = prime;
        // 仅首次添加（避免重复）
        bool exists = false;
        for (uint256 i = 0; i < vesselsOfPrime[prime].length; i++) {
            if (vesselsOfPrime[prime][i] == vessel) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            vesselsOfPrime[prime].push(vessel);
        }

        totalSessionsGranted++;

        emit SessionKeyGranted(
            vessel, prime, vesselDid, eidolonDid, primeDid,
            dailyLimit, permissions, expiresAt, block.timestamp
        );
    }

    /// @notice Step 4: Vessel Token Issue — 博客节点验证并签发 Vessel Token
    /// @dev 仅 BLOG_NODE_ROLE（已授权的 Web5.blog 节点）可调用
    function recordVesselAwakening(
        address vessel,
        string calldata vesselDid,
        string calldata eidolonDid,
        string calldata primeDid,
        string calldata challengeNonce
    ) external onlyRole(BLOG_NODE_ROLE) nonReentrant returns (bool) {
        require(authorizedBlogNodes[msg.sender], "Blog node not authorized");

        // 验证 Session Key 有效
        SessionKey storage sk = sessionKeys[vessel];
        require(sk.vessel != address(0), "Session key not found");
        require(!sk.revoked, "Session key revoked");
        require(block.timestamp < sk.expiresAt, "Session key expired");
        require(keccak256(bytes(sk.vesselDid)) == keccak256(bytes(vesselDid)), "Vessel DID mismatch");

        // 记录激活日志
        activationLogs[vessel].push(VesselActivation({
            vesselDid: vesselDid,
            eidolonDid: eidolonDid,
            primeDid: primeDid,
            blogNode: msg.sender,
            challengeNonce: challengeNonce,
            activatedAt: block.timestamp
        }));

        totalVesselsActivated++;

        emit VesselAwakened(
            vessel, vesselDid, eidolonDid, primeDid,
            msg.sender, challengeNonce, block.timestamp
        );

        return true;
    }

    /// @notice 验证 Vessel 是否合法授权（供其他合约或外部调用）
    function verifySessionKey(address vessel) external view returns (
        bool valid,
        address prime,
        uint256 dailyLimit,
        uint8 permissions,
        uint256 expiresAt
    ) {
        SessionKey storage sk = sessionKeys[vessel];
        if (sk.vessel == address(0) || sk.revoked || block.timestamp >= sk.expiresAt) {
            return (false, address(0), 0, 0, 0);
        }
        return (true, sk.prime, sk.dailyLimit, sk.permissions, sk.expiresAt);
    }

    /// @notice Prime 一键撤回所有 Vessel 授权（紧急熔断）
    function revokeAllVessels(address prime, string calldata reason) external onlyRole(EIDOLON_OS_ROLE) {
        address[] storage vessels = vesselsOfPrime[prime];
        for (uint256 i = 0; i < vessels.length; i++) {
            if (!sessionKeys[vessels[i]].revoked) {
                sessionKeys[vessels[i]].revoked = true;
                totalSessionsRevoked++;
                emit SessionKeyRevoked(vessels[i], prime, reason, block.timestamp);
            }
        }
    }

    /// @notice 撤销单个 Vessel
    function revokeVessel(address vessel, string calldata reason) external onlyRole(EIDOLON_OS_ROLE) {
        require(sessionKeys[vessel].vessel != address(0), "Session key not found");
        require(!sessionKeys[vessel].revoked, "Already revoked");
        sessionKeys[vessel].revoked = true;
        totalSessionsRevoked++;
        emit SessionKeyRevoked(vessel, sessionKeys[vessel].prime, reason, block.timestamp);
    }

    /// @notice 授权博客节点
    function authorizeBlogNode(address blogNode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(blogNode != address(0), "Cannot authorize zero");
        authorizedBlogNodes[blogNode] = true;
        _grantRole(BLOG_NODE_ROLE, blogNode);
        emit BlogNodeAuthorized(blogNode, block.timestamp);
    }

    /// @notice 撤销博客节点
    function revokeBlogNode(address blogNode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedBlogNodes[blogNode] = false;
        _revokeRole(BLOG_NODE_ROLE, blogNode);
        emit BlogNodeRevoked(blogNode, block.timestamp);
    }

    /// @notice 获取 Prime 的所有 Vessel
    function getVesselsOfPrime(address prime) external view returns (address[] memory) {
        return vesselsOfPrime[prime];
    }

    /// @notice 获取 Vessel 的激活日志
    function getActivationLogs(address vessel) external view returns (VesselActivation[] memory) {
        return activationLogs[vessel];
    }

    /// @notice 获取全局统计
    function getStats() external view returns (
        uint256 totalVessels,
        uint256 totalGranted,
        uint256 totalRevoked,
        uint256 activeSessions
    ) {
        return (
            totalVesselsActivated,
            totalSessionsGranted,
            totalSessionsRevoked,
            totalSessionsGranted - totalSessionsRevoked
        );
    }
}
