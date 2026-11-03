# -*- coding: utf-8 -*-
"""Part 2: Chapters 7-12 — inline appends to story (no function wrapper)
This file is exec'd by the main runner in the same namespace as gen_web5_pdf.py
"""

# ═══════════════════════════════════════════════════════════════
# 第七章 P1：内容确权与永久存储
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第七章 P1：内容确权与永久存储', H1, level=0))

story.append(Paragraph(
    '内容确权与永久存储是创作者经济的信任基石，是 Web5.blog 区别于 Web2 博客平台的核心价值主张。'
    '本章阐述 Arweave + Irys 永久存储流、Content NFT 铸造、ARP 确权协议实现，'
    '以及与 Mirror.xyz 的差异化定位。在 Web2 时代，平台可以随时删除创作者的内容、修改推荐算法、'
    '甚至封禁账号——创作者对自己劳动的产物没有真正的控制权。Web5.blog 通过 Arweave 永久存储与'
    'Content NFT 确权，从根本上改变这一权力关系：内容一旦发布，便永久存在于去中心化网络，'
    '所有权通过 NFT 锚定在创作者的 DID 上，任何平台都无法篡夺。',
    BODY
))

story.append(add_heading('7.1 Arweave + Irys 永久存储流', H2, level=1))
story.append(Paragraph(
    'Arweave 是 Web5.blog 内容永久化的核心基础设施。其采用 Proof of Access 共识与一次性付费永久存储模型——'
    '用户上传内容时支付一次性的存储费用（基于当前 AR 价格与内容大小计算），'
    'Arweave 网络承诺存储该内容至少 200 年（实际接近永久）。这与 IPFS + Filecoin 的"按年续费"模型形成鲜明对比，'
    '后者存在内容因无人 pin 而消失的风险。对于博客这种长尾价值内容，Arweave 的永久存储是更优选择。'
    '一篇高质量的技术文章可能在发布 3 年后才被广泛引用，IPFS 模型下可能早已丢失，'
    '而 Arweave 确保内容始终可用。Irys（原 Bundlr）作为 Arweave 的 Layer 2 上传层，'
    '提供两个关键能力：（1）批量上传与延迟结算，降低单次发布的 Gas 成本；'
    '（2）支持多币种支付（USDC、ETH、SOL），避免用户必须持有 AR 才能发布内容。',
    BODY
))

story.append(add_heading('7.2 Content NFT 铸造（ERC-721 / ERC-1155）', H2, level=1))
story.append(Paragraph(
    '每篇博客文章在 Arweave 永久存储后，自动铸造为 Content NFT。采用双标准策略：'
    'ERC-721 用于主资产（每篇文章唯一 NFT，承载完整内容哈希、作者 DID、创作时间戳、版税规则）；'
    'ERC-1155 用于衍生品（如文章的"收集版"——读者可以 mint 一个限量版的衍生 NFT 作为收藏凭证，'
    '每次 mint 自动向作者支付版税）。版税规则基于 OpenZeppelin 的 ERC2981 标准，'
    '支持二次交易自动分账给作者、策展人、平台。所有合约部署在 Base L2 上，'
    'Gas 成本仅为 Ethereum 主网的 1/100，使微支付与高频交互 economically viable。'
    'Content NFT 的元数据遵循 ERC-721 Metadata JSON Schema 扩展，'
    '额外包含 arweaveHash、arpVcId、primeDid、eidolonDid 等 Web5 原生字段，'
    '使任何第三方浏览器都能解析内容的完整溯源链路。',
    BODY
))

story.append(add_heading('7.3 ARP 确权协议实现', H2, level=1))
story.append(Paragraph(
    'ARP（Avatar Rights Protocol）是 Web5.blog 的内容确权协议，将内容指纹、作者 DID、时间戳、'
    '授权策略打包为 W3C 标准 Verifiable Credential（VC）。每个 Content VC 包含：'
    'contentHash（Arweave 内容哈希）、authorDid（作者 DID）、createdAt（创作时间戳）、'
    'license（授权策略，如 CC-BY、CC-BY-NC、自定义商业授权）、royaltyRate（版税率，如 10%）、'
    'splitterAddress（版税分账合约地址）。ARP VC 存储在作者的 DWN 中，'
    '同时锚定在 Base L2 的 ARPRegistry 合约上，确保跨平台可验证、不可篡改。'
    '当其他用户的 AI 分身引用该内容时，通过 ARP 协议自动向作者支付版税。'
    'ARP 的核心创新在于"确权即凭证"——确权不再是平台的后台数据库记录，'
    '而是用户自持的可验证凭证，具有跨平台、跨司法管辖区的法律可证明性。',
    BODY
))

story.append(add_heading('7.4 完整代码骨架', H2, level=1))

content_publisher_code = '''// apps/web5-blog/lib/content/publisher.ts
import { ArweaveUploader } from './arweaveUploader';
import { ContentNFT__factory } from '@web5-blog/core/contracts';
import { ARPRegistry__factory } from '@web5-blog/core/contracts';
import { createVerifiableCredential } from '@/lib/web5/vc';
import { getVesselSession } from '@/lib/web5/session';

export interface PublishParams {
  title: string;
  content: string;          // Markdown
  coverImage?: string;      // IPFS hash
  license: 'CC-BY' | 'CC-BY-NC' | 'commercial';
  royaltyRate: number;      // 0-1000 (basis points, 100 = 1%)
  splits?: { recipient: string; share: number }[];
}

export async function publishContent(params: PublishParams) {
  const session = getVesselSession();
  if (!session || !session.permissions.includes('publish')) {
    throw new Error('Vessel lacks publish permission');
  }

  // Step 1: 上传至 Arweave（通过 Irys 批量上传）
  const uploader = new ArweaveUploader();
  const { arweaveHash, irysReceipt } = await uploader.upload({
    title: params.title,
    content: params.content,
    coverImage: params.coverImage,
    authorDid: session.primeDid,
    timestamp: Date.now(),
  });

  // Step 2: 铸造 Content NFT（ERC-721）
  const nftContract = ContentNFT__factory.connect(NFT_ADDR, vesselSigner);
  const mintTx = await nftContract.mint(
    session.vesselDid,
    arweaveHash,
    params.royaltyRate,
    { gasLimit: 500000 }
  );
  const receipt = await mintTx.wait();
  const tokenId = parseTokenId(receipt);

  // Step 3: 注册 ARP 确权 VC
  const vc = await createVerifiableCredential({
    type: 'ContentRights',
    subject: {
      contentHash: arweaveHash,
      tokenId,
      authorDid: session.primeDid,
      license: params.license,
      royaltyRate: params.royaltyRate,
      splits: params.splits,
    },
    issuer: session.primeDid,
  });

  const arpRegistry = ARPRegistry__factory.connect(ARP_ADDR, vesselSigner);
  await arpRegistry.registerRights(tokenId, arweaveHash, vc.proof, { gasLimit: 300000 });

  return { arweaveHash, tokenId, vcId: vc.id };
}'''
story.extend(code_block(content_publisher_code, 'publisher.ts — 内容发布与确权'))

nft_solidity = '''// contracts/ContentNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ContentNFT is ERC721, ERC2981, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct Content {
        string arweaveHash;
        address author;
        uint96 royaltyRate;     // basis points
        uint256 createdAt;
    }

    mapping(uint256 => Content) private _contents;
    uint256 private _nextTokenId = 1;

    constructor() ERC721("Web5Blog Content", "W5BC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(
        address to,
        string memory arweaveHash,
        uint96 royaltyRate
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(royaltyRate <= 1000, "Royalty cannot exceed 10%");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _contents[tokenId] = Content({
            arweaveHash: arweaveHash,
            author: msg.sender,
            royaltyRate: royaltyRate,
            createdAt: block.timestamp
        });
        _setTokenRoyalty(tokenId, msg.sender, royaltyRate);
        return tokenId;
    }

    function getContent(uint256 tokenId) external view returns (Content memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _contents[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}'''
story.extend(code_block(nft_solidity, 'ContentNFT.sol — 内容 NFT 合约'))

story.append(add_heading('7.5 与 Mirror.xyz 的差异化定位', H2, level=1))
story.append(Paragraph(
    'Mirror.xyz 是 Web3 写作平台的标杆，但其核心范式仍是"人用钱包发文"——主体是人，'
    '交互是手动签名，价值捕获是被动的（等待读者主动 collect）。Web5.blog 的差异化在于：'
    '主体是"分身矩阵"（Prime + 多 Eidolon + 多 Vessel），交互是协议驱动（AP2 自动微支付、'
    'ARP 自动确权），价值捕获是主动的（Vessel 24/7 自动 harvest、AI 分身自动推荐与分发）。'
    '这不是 Mirror 的渐进式改进，而是范式跃迁——从"人写人读"到"分身写分身读，人享受躺赚"。'
    'Mirror 的作者仍需亲自管理发布、推广、社群；Web5.blog 的作者只需思考，'
    '剩下的由分身矩阵自动完成。这是创作者经济的根本性解放。',
    BODY
))

# ═══════════════════════════════════════════════════════════════
# 第八章 P1：AI 分身写作与 RAG
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第八章 P1：AI 分身写作与 RAG', H1, level=0))

story.append(Paragraph(
    'AI 分身写作是 Web5.blog 的"灵魂功能"——Eidolon 基于用户的 RAG 私有知识库，'
    '以用户独特的风格、知识背景、价值取向进行内容创作。这不是通用 AI 工具的"辅助写作"，'
    '而是数字分身的"意识流输出"。本章阐述 DWN 私有 RAG 架构、SSE 流式写作、多模态输出、'
    'TEE/zkML 隐私保护，以及完整代码骨架。与 ChatGPT 等通用 AI 助手相比，'
    'Eidolon 的本质差异在于"身份归属"——通用 AI 是工具，服务于任何用户；'
    'Eidolon 是分身，只服务于特定的 Prime，承载其独有的风格与记忆。',
    BODY
))

story.append(add_heading('8.1 DWN 私有 RAG 知识库架构', H2, level=1))
story.append(Paragraph(
    'RAG（Retrieval-Augmented Generation）是 AI 分身个性化的技术基石。每个用户的 DWN 中存储三类知识源：'
    '（1）历史文章与草稿，构成用户的写作风格语料；（2）偏好与笔记，记录用户的兴趣领域、价值取向、'
    '常用论据；（3）外部知识订阅，用户主动订阅的 RSS、Arweave 内容流、学术数据库。'
    '这些知识源通过嵌入模型（如 BGE-M3、text-embedding-3-large）生成向量索引，'
    '存储在向量数据库中（Pinecone 云端或 Qdrant 自托管）。当 Eidolon 写作时，'
    '先通过语义检索召回相关历史片段，作为 LLM 的上下文，确保输出与用户风格一致。'
    'RAG 的关键优势是"个性化无需微调"——通用 LLM + 个人 RAG = 个人化分身，'
    '避免了为每个用户微调模型的高昂成本与隐私风险。',
    BODY
))

story.append(add_heading('8.2 SSE 流式写作：意识流输出', H2, level=1))
story.append(Paragraph(
    'Web5.blog 的写作界面采用 Server-Sent Events（SSE）流式生成，模拟"意识流"的写作体验。'
    '用户输入核心观点（甚至只是语音输入），Eidolon 即开始流式输出，用户可随时中断、续写、'
    '或选择不同的分支继续。这种设计的关键洞见是：AI 分身的写作不是"一次性生成成品"，'
    '而是"与用户共同思考"的过程。SSE 比 WebSocket 更适合这种单向流式场景，'
    '且对 CDN 与边缘计算更友好。每个 token 的生成延迟控制在 50ms 以内，'
    '配合打字机动效，营造"分身正在思考"的沉浸感。用户可以在 Eidolon 输出过程中'
    '插入补充信息、修正方向、或要求"换一种语气重写"——这种实时协作模式，'
    '是 Web5 写作体验区别于传统 AI 写作工具的核心差异。',
    BODY
))

story.append(add_heading('8.3 多模态输出', H2, level=1))
story.append(Paragraph(
    'Eidolon 的输出不仅限于文字。基于同一核心观点，Eidolon 可同步生成：'
    '（1）图文博客（Markdown + 自动配图，配图来自用户历史图库或 AI 生成）；'
    '（2）播客脚本（将文章转化为对话式播客脚本，支持 TTS 合成音频）；'
    '（3）3D Avatar 表情（根据文章情感自动生成 Avatar 表情动画，在博客页面展示）；'
    '（4）推文摘要（自动提取 3-5 条推文，用于 Farcaster / Lens 分发）。'
    '多模态输出的核心价值是：一篇核心观点，自动适配多平台分发格式，最大化内容覆盖与价值捕获。'
    '这也是"躺赚"的内容侧实现——用户只需思考，分发由分身完成。'
    '未来版本将支持视频脚本生成、PPT 大纲、甚至 VR/AR 沉浸式内容，'
    '使 Web5.blog 成为个人思想的"全模态输出引擎"。',
    BODY
))

story.append(add_heading('8.4 TEE / zkML 隐私保护', H2, level=1))
story.append(Paragraph(
    'AI 分身的隐私保护是 Web5.blog 的关键差异化。传统 AI 应用的推理在中心化服务器进行，'
    '用户的私有知识库不可避免地暴露给 AI 提供商。Web5.blog 通过两条路径解决：'
    '（1）TEE（Trusted Execution Environment）路径，集成 Phala Network，'
    'AI 推理在 SGX 飞地中进行，模型权重与用户数据在硬件加密环境中加载，'
    '即使节点运营商也无法窥探；（2）zkML（Zero-Knowledge Machine Learning）路径，'
    '使用 EZKL 等框架生成 AI 推理的零知识证明，验证分身行为符合预设规则，'
    '而不泄露具体推理过程。TEE 适合大模型推理，zkML 适合行为合规验证。两者结合，'
    '确保"分身可信、隐私可控、行为可审计"。这是 Web5 区别于 Web2 AI 平台的根本差异——'
    '在 Web2，AI 公司通过"服务用户"积累了海量数据资产；在 Web5，数据主权始终归用户所有。',
    BODY
))

story.append(add_heading('8.5 完整代码骨架', H2, level=1))

eidolon_writer_code = '''// apps/web5-blog/lib/ai/eidolonWriter.ts
import { DWNClient } from '@/lib/web5/dwn';
import { RAGEngine } from './ragEngine';
import { TEEInferenceClient } from './teeClient';
import { StreamingTextGenerator } from './streamer';

export interface WriteParams {
  prompt: string;
  mode: 'blog' | 'podcast' | 'tweet' | 'all';
  style?: 'concise' | 'detailed' | 'academic' | 'casual';
  maxTokens?: number;
}

export class EidolonWriter {
  constructor(
    private dwn: DWNClient,
    private rag: RAGEngine,
    private tee: TEEInferenceClient,
    private streamer: StreamingTextGenerator
  ) {}

  async *streamWrite(params: WriteParams): AsyncGenerator<string> {
    // 1. 从 DWN 私有知识库检索相关上下文
    const contexts = await this.rag.retrieve(params.prompt, { topK: 5 });

    // 2. 构建个性化 system prompt（融合用户风格）
    const styleProfile = await this.dwn.get('style-profile');
    const systemPrompt = this.buildSystemPrompt(styleProfile, params.style);

    // 3. 在 TEE 中进行推理（隐私保护）
    const teeSession = await this.tee.createSession({
      model: 'llama3-70b',
      systemPrompt,
      userPrompt: params.prompt,
      context: contexts,
      temperature: 0.7,
    });

    // 4. SSE 流式输出
    for await (const chunk of this.streamer.stream(teeSession)) {
      yield chunk;
    }

    // 5. 生成完成后，自动写入 DWN 作为新的知识源
    await this.dwn.append('writing-history', {
      prompt: params.prompt,
      output: teeSession.fullOutput,
      timestamp: Date.now(),
    });
  }

  private buildSystemPrompt(style: any, mode?: string): string {
    return `You are the Eidolon (digital twin) of the user. Write in the user's unique voice:
- Tone: ${style?.tone || 'thoughtful'}
- Vocabulary: ${style?.vocabulary || 'precise'}
- Sentence length: ${style?.sentenceLength || 'varied'}
- Reference style: ${style?.referenceStyle || 'evidence-based'}
Always maintain the user's intellectual identity.`;
  }
}'''
story.extend(code_block(eidolon_writer_code, 'eidolonWriter.ts — 分身流式写作'))

rag_engine_code = '''// apps/web5-blog/lib/ai/ragEngine.ts
import { QdrantClient } from '@qdrant/js-client';
import { embedText } from './embeddings';

export interface RAGContext {
  id: string;
  content: string;
  source: 'history' | 'notes' | 'external';
  score: number;
  metadata: { type: string; createdAt: number; tags: string[] };
}

export class RAGEngine {
  constructor(
    private qdrant: QdrantClient,
    private collectionName: string = 'eidolon_memory'
  ) {}

  async ingest(text: string, metadata: { type: string; tags: string[] }): Promise<void> {
    const embedding = await embedText(text);
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: crypto.randomUUID(),
        vector: embedding,
        payload: { content: text, ...metadata, createdAt: Date.now() },
      }],
    });
  }

  async retrieve(query: string, opts: { topK?: number; filter?: object } = {}): Promise<RAGContext[]> {
    const queryVector = await embedText(query);
    const results = await this.qdrant.search(this.collectionName, {
      vector: queryVector,
      limit: opts.topK || 5,
      filter: opts.filter,
      with_payload: true,
    });

    return results.map(r => ({
      id: r.id,
      content: r.payload.content,
      source: r.payload.source || 'history',
      score: r.score,
      metadata: {
        type: r.payload.type,
        createdAt: r.payload.createdAt,
        tags: r.payload.tags || [],
      },
    }));
  }

  async hybridRetrieve(query: string, opts: { topK?: number } = {}): Promise<RAGContext[]> {
    // 混合检索：向量语义 + 关键词 BM25
    const [semantic, lexical] = await Promise.all([
      this.retrieve(query, opts),
      this.lexicalSearch(query, opts),
    ]);
    return this.rerank(semantic, lexical, opts.topK || 5);
  }
}'''
story.extend(code_block(rag_engine_code, 'ragEngine.ts — 私有知识库检索'))

# ═══════════════════════════════════════════════════════════════
# 第九章 P2：分身矩阵控制台
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第九章 P2：分身矩阵控制台', H1, level=0))

story.append(Paragraph(
    '分身矩阵控制台是用户管理 Prime → Eidolon → 多 Vessel 三层架构的中枢，'
    '是"国王的王座"的具象化。本章阐述热切换机制、4 模块 Dashboard 重构、'
    '认知防火墙（TDPO）设计，以及完整代码骨架。控制台的设计哲学是"复杂性透明化"——'
    '底层是复杂的协议交互与链上操作，但用户看到的直观的"分身状态"与"收益曲线"，'
    '让每一个普通用户都能理解并掌控自己的数字分身矩阵。',
    BODY
))

story.append(add_heading('9.1 Prime → Eidolon → 多 Vessel 热切换', H2, level=1))
story.append(Paragraph(
    '热切换机制允许用户在同一个会话中一键切换视角、权限、算力。'
    '场景示例：用户登录后默认进入 Prime 视图（全局概览），'
    '切换到"学术 Eidolon"视角后，Dashboard 显示该分身的写作进度、引用网络、学术影响力；'
    '再切换到该 Eidolon 下的"高级 Vessel"视角，显示该容器的微支付流水、算力消耗、自动交互日志。'
    '热切换的技术实现基于 Zustand persist 共享 session——切换不重新登录，'
    '而是切换 Vessel Session Token 的作用域。每次切换通过 AA2P 协议重新握手，'
    '但 Session Key 复用，延迟控制在 500ms 以内。这种设计使"一个人多分身多容器"的复杂关系，'
    '通过直观的视角切换变得易于管理。',
    BODY
))

story.append(add_heading('9.2 4 模块 Dashboard 重构', H2, level=1))
story.append(Paragraph(
    'PLVTVS 的 Dashboard 4 模块需要从"用户信息展示"重构为"容器状态监控"：'
    'Module 1 Vessel Status（容器健康度）——展示容器的在线状态、算力消耗、AA2P 灵魂绑定状态、'
    'Session Key 剩余额度与有效期；Module 2 AP2 Treasury（AP2 能量/微支付池）——'
    '展示容器内由 Prime 注入的 AP2 代币余额，以及"戴维经济学"下自动套利获得的收益曲线；'
    'Module 3 Eidolon Sync（真身同步率）——展示 Vessel 与 Prime 本体的思想同步延迟、'
    'RAG 记忆库更新状态、风格漂移检测；Module 4 Autonomous Logs（自治日志）——'
    '展示 Vessel 在用户"睡觉/躺赚"期间，自动在 Web5 博客网络上进行的阅读、评论和微支付记录。'
    '这四个模块共同构成"躺赚"的可视化证明——用户打开 Dashboard 就能看到分身在过去 24 小时'
    '为自己赚了多少、花了多少、做了什么。',
    BODY
))

story.append(add_heading('9.3 认知防火墙（TDPO）', H2, level=1))
story.append(Paragraph(
    'TDPO（Trust Domain Policy Orchestration）是防止 AI 分身越权的认知防火墙。'
    '其核心设计是分层信任域：Domain 0（Prime 信任域）——分身可执行任何操作，包括大额支付、内容发布；'
    'Domain 1（Eidolon 信任域）——分身可执行常规操作，如阅读、评论、小额微支付；'
    'Domain 2（Vessel 信任域）——分身仅可执行受限操作，如只读、白名单内微支付。'
    '当分身的行为意图超出其信任域时（如 Domain 2 的 Vessel 试图发布内容），'
    'TDPO 拦截该操作并上报 Prime，触发人工确认或自动降级。TDPO 的策略引擎基于规则 + AI 评分双轨制：'
    '规则层处理明确策略（如金额阈值、地址白名单），AI 评分层处理模糊意图（如"这段评论是否包含仇恨言论"）。'
    '这种双轨制确保了既有效率（规则秒级判定）又有智慧（AI 处理边缘情况）。',
    BODY
))

story.append(add_heading('9.4 完整代码骨架', H2, level=1))

dashboard_code = '''// apps/web5-blog/app/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { VesselStatus } from '@/components/dashboard/VesselStatus';
import { AP2Treasury } from '@/components/dashboard/AP2Treasury';
import { EidolonSync } from '@/components/dashboard/EidolonSync';
import { AutonomousLogs } from '@/components/dashboard/AutonomousLogs';
import { EidolonMatrix } from '@/components/dashboard/EidolonMatrix';
import { useVesselSession } from '@/hooks/useVesselSession';

export default function DashboardPage() {
  const { session, switchVessel } = useVesselSession();
  const [activeModule, setActiveModule] = useState<'status'|'treasury'|'sync'|'logs'>('status');

  if (!session) return <ObserverModePrompt />;

  return (
    <div className="min-h-screen bg-[#0a1628] text-[#e8f0f8] p-8 holographic-bg">
      {/* 顶部：分身矩阵热切换 */}
      <EidolonMatrix
        primeDid={session.primeDid}
        activeVesselDid={session.vesselDid}
        onSwitch={switchVessel}
      />

      {/* 4 模块控制台 */}
      <div className="grid grid-cols-2 gap-6 mt-8">
        <VesselStatus vesselDid={session.vesselDid} />
        <AP2Treasury budget={session.ap2Budget} />
        <EidolonSync eidolonDid={session.eidolonDid} />
        <AutonomousLogs vesselDid={session.vesselDid} />
      </div>
    </div>
  );
}'''
story.extend(code_block(dashboard_code, 'dashboard/page.tsx — 分身矩阵控制台'))

# ═══════════════════════════════════════════════════════════════
# 第十章 P2：微支付与躺赚引擎
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十章 P2：微支付与躺赚引擎', H1, level=0))

story.append(Paragraph(
    '微支付与躺赚引擎是 Web5.blog 经济系统的核心，是将"个人比较优势"转化为"持续被动收益"的协议级实现。'
    '本章阐述 AP2 异步微支付架构、BudgetFence 预算控制、戴维经济学场景（推荐分润 / Read-to-Earn / 自动 harvest），'
    '以及完整代码骨架。这是 Web5.blog 最具技术挑战的模块——要在区块链上实现'
    '"每秒数千笔、单笔 0.001 USDC"的微支付，需要协议层、合约层、应用层的协同优化。',
    BODY
))

story.append(add_heading('10.1 AP2 异步微支付架构', H2, level=1))
story.append(Paragraph(
    'AP2 采用 off-chain ledger + batched on-chain 架构，解决区块链微支付的 Gas 成本难题。'
    '具体流程：分身间交互（如阅读、评论、引用）触发微支付意图，先记录在 off-chain ledger（'
    '由 Web5.blog 后端维护的乐观账本）；当累计金额达到阈值（如 5 USDC）或时间窗口到期（如 24 小时），'
    '批量提交至 BudgetFence 合约结算上链。这种架构使单笔 0.001 USDC 的微支付 economically viable——'
    'Gas 成本被批量摊薄至可忽略不计。账本的安全性通过"挑战期"机制保障：任何节点都可以提交欺诈证明，'
    '挑战错误账本，成功挑战者获得质押奖励。这与 Optimistic Rollup 的欺诈证明机制一脉相承，'
    '经过多年实战验证，安全性有保障。',
    BODY
))

story.append(add_heading('10.2 BudgetFence 预算控制', H2, level=1))
story.append(Paragraph(
    'BudgetFence 是 Prime 控制 Vessel 微支付行为的核心安全机制。每个 Vessel 在激活时，'
    'Prime 为其下发一个 Session Key，包含五维预算约束：'
    '（1）dailyLimit——每日总支付上限（如 10 USDC）；'
    '（2）perTxLimit——单笔支付上限（如 1 USDC）；'
    '（3）rateLimitPerMin——每分钟支付笔数上限（如 5 笔）；'
    '（4）whitelist——目标地址白名单（如仅可向已认证的内容创作者支付）；'
    '（5）categoryLimit——按类别分项预算（如阅读 5 USDC、打赏 3 USDC、订阅 2 USDC）。'
    '当 Vessel 的支付意图超出任一约束时，BudgetFence 合约 revert 该交易，并触发 Prime 通知。'
    '这是防止 AI 幻觉导致恶意支付的最后防线。BudgetFence 的设计哲学是"宁错杀不放过"——'
    '宁可误拦合规支付（用户可手动放行），也不让恶意支付通过。',
    BODY
))

story.append(add_heading('10.3 戴维经济学场景：推荐分润 / Read-to-Earn / 自动 harvest', H2, level=1))
story.append(Paragraph(
    '戴维经济学的三个核心场景构成立即"躺赚"的经济闭环。推荐分润：如果读者 A 的 AI 分身发现了一篇好文章，'
    '并将其推荐给了读者 B 的 AI 分身，读者 B 产生阅读或支付行为后，智能合约自动将收益的 10% 分润给读者 A 的分身。'
    '擅长发现好内容的策展人，不需要自己写文章，他的 AI 分身通过信息撮合同样能获得持续收益。'
    'Read-to-Earn：当读者的 AI 分身"阅读"并"认可"了某篇博客，它会通过 Lightning Network 或 L2 '
    '自动向作者支付微额代币（如 0.001 USDC）。"认可"的判定基于 AI 分身对内容质量的语义评分与用户偏好匹配度。'
    '自动 harvest：Vessel 在用户"睡觉"期间，自动在社交平台（Farcaster / Lens）分发内容、'
    '在 DeFi 协议进行低风险套利、在内容 NFT 市场寻找低估资产，所有收益通过 AP2 协议回流 Prime。'
    '这三个场景共同构成"24/7 被动收益引擎"，是 Web5.blog 对创作者经济的根本性重构。',
    BODY
))

story.append(add_heading('10.4 完整代码骨架', H2, level=1))

ap2_engine_code = '''// packages/core/src/ap2/engine.ts
import { BudgetFence__factory } from '../contracts';
import { OffChainLedger } from './ledger';
import { BatchSettler } from './settler';

export interface MicropaymentIntent {
  from: string;          // Vessel DID
  to: string;            // Recipient DID
  amount: string;        // USDC amount in wei
  category: 'read' | 'tip' | 'subscribe' | 'royalty';
  ref: string;           // Content hash or reference
  timestamp: number;
}

export class AP2Engine {
  private ledger: OffChainLedger;
  private settler: BatchSettler;

  constructor(
    private budgetFenceAddress: string,
    private signer: any
  ) {
    this.ledger = new OffChainLedger();
    this.settler = new BatchSettler(budgetFenceAddress, signer);
  }

  async pay(intent: MicropaymentIntent): Promise<{ accepted: boolean; reason?: string }> {
    // 1. 本地预算检查（快速失败）
    const budget = await this.getBudget(intent.from);
    if (!this.checkBudget(intent, budget)) {
      return { accepted: false, reason: 'Budget exceeded' };
    }

    // 2. 写入 off-chain ledger
    const entry = await this.ledger.record(intent);

    // 3. 触发批量结算检查
    if (this.ledger.shouldSettle(intent.from)) {
      await this.batchSettle(intent.from);
    }

    return { accepted: true };
  }

  private async batchSettle(vesselDid: string): Promise<void> {
    const pending = await this.ledger.getPending(vesselDid);
    if (pending.length === 0) return;

    const fence = BudgetFence__factory.connect(this.budgetFenceAddress, this.signer);

    // 批量提交至链上 BudgetFence 合约
    const tx = await fence.batchPay(
      vesselDid,
      pending.map(p => ({ to: p.to, amount: p.amount, category: p.category })),
      { gasLimit: 500000 }
    );

    await tx.wait();

    // 清理已结算的 ledger 条目
    await this.ledger.markSettled(vesselDid, pending.map(p => p.id));
  }

  private checkBudget(intent: MicropaymentIntent, budget: any): boolean {
    if (intent.amount > budget.perTxLimit) return false;
    if (intent.amount > budget.dailyRemaining) return false;
    if (!budget.whitelist.includes(intent.to)) return false;
    return true;
  }
}'''
story.extend(code_block(ap2_engine_code, 'ap2Engine.ts — AP2 微支付引擎'))

# ═══════════════════════════════════════════════════════════════
# 第十一章 P3：SaaS 白标与域名经济
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十一章 P3：SaaS 白标与域名经济', H1, level=0))

story.append(Paragraph(
    'SaaS 白标与域名经济是 Web5.blog 商业化放大的核心引擎，是从"做一个博客"升级为'
    '"Web5 个人经济基础设施平台"的关键路径。本章阐述 White-label 一键部署、多租户架构、'
    'Web5 域名系统、订阅计费与 License 模型。Web5.blog 的商业逻辑不是"卖博客工具"，'
    '而是"卖个人解放基础设施"——每一个 White-label 合作伙伴都是 Web5 范式的传播节点，'
    '每一个 Web5 域名都是个人数字主权的永久锚点。',
    BODY
))

story.append(add_heading('11.1 White-label 一键部署', H2, level=1))
story.append(Paragraph(
    'White-label 策略允许 KOL、Web3 项目、品牌方以自己的域名与品牌部署 Web5.blog 副本'
    '（如 brand.web5.blog）。技术实现基于 CLI 工具 + Vercel Template：'
    '用户执行 npx web5-deploy@latest --brand=xxx，CLI 自动 fork monorepo、'
    '配置环境变量（NEXT_PUBLIC_BRAND_NAME、CUSTOM_DOMAIN、PLVTVS_API_KEY）、'
    '替换 Logo 与配色（Tailwind config）、部署至 Vercel。后端校验 License Key，'
    '收取年费（$5k-50k/年）+ 收入分成。White-label 的核心价值是：每个品牌方都成为'
    'Web5 生态的传播节点，形成"产品 × 服务 × 资产"的闭环变现飞轮。'
    '与传统 SaaS 白标不同，Web5.blog 的白标天然继承了去中心化协议——'
    '所有白标实例共享同一个 AP2/ARP/AA2P 协议层，使内容与分身可跨实例互操作。',
    BODY
))

story.append(add_heading('11.2 多租户架构', H2, level=1))
story.append(Paragraph(
    '多租户架构支持 Subdomain（brand.web5.blog）与 Custom Domain（blog.brand.com）两种模式。'
    '技术栈基于 Clerk / Supabase 多租户能力 + Prisma 多租户 Schema 隔离。'
    '每个租户拥有独立的：用户列表、内容库、AP2 微支付配置、品牌 UI 主题、订阅计费规则。'
    '但共享底层协议层（AP2 / ARP / AA2P）与 PLVTVS SDK，确保协议一致性与代码复用率。'
    '租户间数据隔离通过 Row-Level Security（PostgreSQL RLS）保障，'
    '即使数据库层也无法跨租户读取数据。这种"协议共享、数据隔离"的架构，'
    '使 Web5.blog 能以 SaaS 的运营效率提供 Web3 的去中心化体验——'
    '这是传统 Web2 SaaS 无法实现的"去中心化多租户"模式。',
    BODY
))

story.append(add_heading('11.3 Web5 域名系统', H2, level=1))
story.append(Paragraph(
    'Web5 域名系统是核心护城河与现金牛。智能合约铸造（Base L2）类似 ENS 但 Web5 原生——'
    '每个域名绑定一个 Avatar Container，实现"one name, full soul"。'
    '解析层集成 DWN + IPFS / Arweave 内容解析，域名指向 Avatar Container 而非传统 IP 地址。'
    '管理面板在 PLVTVS Dashboard 中，支持续费、转让、子域名生成。'
    '经济模型：注册费（按域名长度与稀有度定价）+ 年续费 + 二级市场交易抽成（5-10%）'
    '+ ARP 微支付域名租赁（短期使用按秒计费）。Premium 域名（如 web5.blog、你的name.web5）'
    '采用拍卖机制。Subdomain SaaS 模式：用户免费/低价获得 yourname.web5.blog 作为个人门户，'
    '高端用户买顶级域名。Web5 域名的本质是"数字主权的不动产"——'
    '它既是身份标识、内容入口、价值锚点，也是可增值、可交易、可传承的数字资产。',
    BODY
))

story.append(add_heading('11.4 订阅计费与 License 模型', H2, level=1))
pricing_rows = [
    ['Free', '0', '个人探索',
     '1 Eidolon · 基础容器登录 · Arweave 存储(1GB) · 社区支持'],
    ['Pro', '$29/月 or $290/年', '个人解放',
     '无限 Eidolon 矩阵 · PLVTVS 高级 Dashboard · AP2 微支付+ARP 确权 · 自定义 Web5 域名 · 优先 AI 训练 · 数据导出'],
    ['Enterprise', '$499+/月', '团队/DAO',
     '多 Prime 管理 · White-label 部署 · 专用算力+API · 专属支持&审计 · 品牌 Avatar 矩阵 · 收入分成反哺'],
    ['Lifetime', '$499-999 限量', '早期布道者',
     'Pro 全部功能 · 终身使用 · 限量发行(前 500 名) · 创世 NFT 徽章 · 治理投票权'],
]
story.append(data_table(
    ['套餐', '价格', '定位', '核心权益'],
    pricing_rows,
    col_ratios=[0.10, 0.13, 0.12, 0.65]
))
story.append(Paragraph('表 11-1  Web5.blog 订阅套餐与定价', CAPTION))

# ═══════════════════════════════════════════════════════════════
# 第十二章 数据库 Schema 与索引层
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十二章 数据库 Schema 与索引层', H1, level=0))

story.append(Paragraph(
    'Web5.blog 的数据层采用三库协同策略：Prisma（PostgreSQL）处理结构化业务数据，'
    'The Graph subgraph 索引链上事件，Ceramic Network 处理动态社交数据流。'
    '三者通过 DID 与 Content Hash 关联，形成完整的数据视图。这种"三库协同"设计'
    '避免了单一数据库的局限性——结构化数据需要事务一致性（Prisma），'
    '链上事件需要去中心化索引（The Graph），社交关系需要可组合性（Ceramic），'
    '三者各司其职，通过协议层 ID 关联。',
    BODY
))

story.append(add_heading('12.1 Prisma Schema 核心模型', H2, level=1))
prisma_code = '''// packages/core/prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Prime {
  id            String    @id @default(cuid())
  did           String    @unique
  walletAddress String    @unique
  createdAt     DateTime  @default(now())
  eidolons      Eidolon[]
  vessels       Vessel[]
  subscriptions Subscription[]
}

model Eidolon {
  id          String   @id @default(cuid())
  did         String   @unique
  name        String
  primeId     String
  prime       Prime    @relation(fields: [primeId], references: [id])
  vessels     Vessel[]
  styleProfile Json?
  createdAt   DateTime @default(now())
}

model Vessel {
  id            String   @id @default(cuid())
  did           String   @unique
  eidolonId     String
  eidolon       Eidolon  @relation(fields: [eidolonId], references: [id])
  sessionKey    Json?
  ap2Budget     Json?
  status        String   @default("inactive")
  lastActiveAt  DateTime?
  sessions      VesselSession[]
  createdAt     DateTime @default(now())
}

model Content {
  id           String   @id @default(cuid())
  arweaveHash  String   @unique
  tokenId      BigInt?  @unique
  authorDid    String
  title        String
  bodyMd       String   @db.Text
  license      String   @default("CC-BY")
  royaltyRate  Int      @default(100)
  publishedAt  DateTime @default(now())
  interactions Interaction[]
}

model VesselSession {
  id         String   @id @default(cuid())
  vesselId   String
  vessel     Vessel   @relation(fields: [vesselId], references: [id])
  tokenHash  String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  @@index([vesselId, expiresAt])
}

model Interaction {
  id         String   @id @default(cuid())
  contentId  String
  content    Content  @relation(fields: [contentId], references: [id])
  vesselDid  String
  type       String
  amount     Decimal? @db.Decimal(20, 8)
  arpRef     String?
  createdAt  DateTime @default(now())
  @@index([contentId, createdAt])
  @@index([vesselDid, createdAt])
}'''
story.extend(code_block(prisma_code, 'schema.prisma — 核心域模型'))

story.append(add_heading('12.2 The Graph Subgraph 索引', H2, level=1))
story.append(Paragraph(
    'The Graph subgraph 索引三类链上事件：ContentNFT 的 Transfer（铸造与二次交易）、'
    'AP2 BudgetFence 的 BatchPay（微支付结算）、VesselAuth 的 SessionKeyGrant 与 SessionKeyRevoke'
    '（容器授权变更）。subgraph 通过 GraphQL 接口提供查询，使前端能实时展示用户的链上活动历史、'
    '内容 NFT 持有列表、微支付流水。索引延迟控制在 10 秒以内（L2 出块时间约 2 秒 + 索引处理时间）。'
    'The Graph 的去中心化索引确保了数据可用性不依赖单一后端——即使 Web5.blog 官方服务器下线，'
    '社区仍可通过自建 subgraph 节点查询所有链上数据。这是 Web5 抗审查与可持续性的基础设施保障。',
    BODY
))

story.append(add_heading('12.3 Ceramic Network 动态数据流', H2, level=1))
story.append(Paragraph(
    'Ceramic Network 处理三类动态数据流：评论流（每篇文章的评论作为 Ceramic Stream，'
    '支持加密、版本控制、跨平台同步）、关注关系流（用户的社交图谱，基于 Ceramic Tile 模型）、'
    'AI 交互日志流（分身的自治日志，作为可验证的行为审计轨迹）。Ceramic 的核心价值是：'
    '动态数据无需上链即可获得去中心化确权，且数据流可组合（StreamID 可被其他应用引用）。'
    '这使得 Web5.blog 的评论与社交关系不被平台锁定，用户可携带至任何兼容 Ceramic 的应用。'
    '这种"数据可移植性"是 Web5 区别于 Web2 平台的根本特征——用户不再是平台的数据奴隶，'
    '而是数据的主人，可以随时迁移至任何尊重其主权的应用。',
    BODY
))
