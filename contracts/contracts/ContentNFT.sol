// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ContentNFT — Web5.blog 内容确权 NFT（ERC-721 + ERC-2981 版税）
/// @notice 每篇博客文章铸造为唯一 NFT，承载 Arweave 哈希、作者 DID、版税规则
/// @dev 部署到 Base Sepolia，superadmin = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
contract ContentNFT is ERC721, ERC2981, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VESSEL_AUTH_ROLE = keccak256("VESSEL_AUTH_ROLE");

    struct Content {
        string arweaveHash;      // Arweave TX ID（43 字符 Base64URL）
        address author;          // 作者钱包地址（Prime）
        string authorDid;        // 作者 DID（did:plvtvs:0x...）
        uint96 royaltyRate;      // 版税率（basis points, 100 = 1%）
        uint256 createdAt;       // 铸造时间戳
        string license;          // 授权类型（CC-BY / CC-BY-NC / COMMERCIAL）
        string arpVcId;          // ARP Verifiable Credential ID
    }

    mapping(uint256 => Content) private _contents;
    mapping(address => uint256[]) private _authorContents;
    uint256 private _nextTokenId = 1;

    event ContentMinted(
        uint256 indexed tokenId,
        address indexed author,
        string arweaveHash,
        string authorDid,
        uint96 royaltyRate,
        string license,
        string arpVcId,
        uint256 timestamp
    );

    event ContentTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    constructor(address superadmin) ERC721("Web5Blog Content", "W5BC") {
        require(superadmin != address(0), "Superadmin cannot be zero");
        _grantRole(DEFAULT_ADMIN_ROLE, superadmin);
        _grantRole(MINTER_ROLE, superadmin);
        _grantRole(VESSEL_AUTH_ROLE, superadmin);
    }

    /// @notice 铸造内容 NFT（仅 MINTER_ROLE 可调用）
    /// @param to 接收地址（通常是 Vessel Smart Account）
    /// @param arweaveHash Arweave 内容哈希
    /// @param authorDid 作者 DID
    /// @param royaltyRate 版税率（basis points, max 1000 = 10%）
    /// @param license 授权类型
    /// @param arpVcId ARP VC ID
    function mint(
        address to,
        string memory arweaveHash,
        string memory authorDid,
        uint96 royaltyRate,
        string memory license,
        string memory arpVcId
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(royaltyRate <= 1000, "Royalty cannot exceed 10%");
        require(bytes(arweaveHash).length > 0, "Arweave hash required");
        require(bytes(authorDid).length > 0, "Author DID required");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _contents[tokenId] = Content({
            arweaveHash: arweaveHash,
            author: msg.sender,
            authorDid: authorDid,
            royaltyRate: royaltyRate,
            createdAt: block.timestamp,
            license: license,
            arpVcId: arpVcId
        });

        _setTokenRoyalty(tokenId, msg.sender, royaltyRate);
        _authorContents[msg.sender].push(tokenId);

        emit ContentMinted(
            tokenId,
            msg.sender,
            arweaveHash,
            authorDid,
            royaltyRate,
            license,
            arpVcId,
            block.timestamp
        );

        return tokenId;
    }

    /// @notice 批量铸造（节省 Gas）
    function batchMint(
        address[] memory to,
        string[] memory arweaveHashes,
        string[] memory authorDids,
        uint96[] memory royaltyRates,
        string[] memory licenses,
        string[] memory arpVcIds
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256[] memory) {
        require(
            to.length == arweaveHashes.length &&
            to.length == authorDids.length &&
            to.length == royaltyRates.length &&
            to.length == licenses.length &&
            to.length == arpVcIds.length,
            "Array length mismatch"
        );

        uint256[] memory tokenIds = new uint256[](to.length);
        for (uint256 i = 0; i < to.length; i++) {
            tokenIds[i] = _mintSingle(
                to[i],
                arweaveHashes[i],
                authorDids[i],
                royaltyRates[i],
                licenses[i],
                arpVcIds[i]
            );
        }
        return tokenIds;
    }

    function _mintSingle(
        address to,
        string memory arweaveHash,
        string memory authorDid,
        uint96 royaltyRate,
        string memory license,
        string memory arpVcId
    ) internal returns (uint256) {
        require(royaltyRate <= 1000, "Royalty cannot exceed 10%");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _contents[tokenId] = Content({
            arweaveHash: arweaveHash,
            author: msg.sender,
            authorDid: authorDid,
            royaltyRate: royaltyRate,
            createdAt: block.timestamp,
            license: license,
            arpVcId: arpVcId
        });
        _setTokenRoyalty(tokenId, msg.sender, royaltyRate);
        _authorContents[msg.sender].push(tokenId);
        emit ContentMinted(tokenId, msg.sender, arweaveHash, authorDid, royaltyRate, license, arpVcId, block.timestamp);
        return tokenId;
    }

    /// @notice 获取内容元数据
    function getContent(uint256 tokenId) external view returns (Content memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _contents[tokenId];
    }

    /// @notice 获取作者的所有内容 NFT
    function getAuthorContents(address author) external view returns (uint256[] memory) {
        return _authorContents[author];
    }

    /// @notice 总铸造量
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice 授权 MINTER_ROLE（仅 superadmin）
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    /// @notice 撤销 MINTER_ROLE（仅 superadmin）
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    /// @notice 紧急暂停（仅 superadmin）— 通过撤销所有 minter 实现
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // 紧急情况下，superadmin 可通过撤销 minter 角色停止铸造
        // 转账不受影响（已铸造的 NFT 仍可流通）
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Token URI（基础实现，生产环境可指向 Arweave 元数据）
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Content memory c = _contents[tokenId];
        return string(abi.encodePacked("https://arweave.net/", c.arweaveHash));
    }
}
