// gen_web5_word.js — Main Word document generator
// Web5.blog 开发框架与架构白皮书 Word 版本
const H = require('./word_helpers.js');
const {
  C, FONT_BODY, FONT_HEADING, FONT_CODE,
  bodyPara, bodyParaNoIndent, h1, h2, h3,
  codeBlock, calloutBox, dataTable, caption, coverPage,
  Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType,
  HeadingLevel, Header, Footer, PageNumber, NumberFormat,
  TableOfContents, StyleLevel, SectionType, TabStopType, TabStopPosition,
} = H;
const fs = require('fs');

// ━━ Content Sections ━━
const children = [];

// Cover Page
children.push(...coverPage());

// TOC
children.push(new Paragraph({
  spacing: { before: 400, after: 300 },
  children: [new TextRun({ text: '目录', font: FONT_HEADING, size: 44, bold: true, color: C.HEADER_FILL })],
}));
children.push(new TableOfContents('Table of Contents', {
  hyperlink: true,
  headingStyleRange: '1-3',
}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ Chapter 1 ═══
children.push(h1('第一章 文书精炼与对齐'));
children.push(h2('1.1 原始文书结构剖析'));
children.push(bodyPara('飘叔上传的 Web5.blog 商业文书共 1845 行、约 6.5 万字，本质上是两轮多片段对话的拼接产物。第一轮对话（第 1-371 行）聚焦于 Web5.blog 的整体架构设计与实现方案，从技术栈推荐出发，逐步深入到戴维经济学内核嵌入、开发上线路线图、文章创作建议等主题，是项目的初始蓝图。第二轮对话（第 373-1846 行）则在 PLVTVS.Network 代码库审阅后展开，聚焦于容器登录范式革命、PLVTVS 代码资产盘点、融合方案代码生成、营收增长策略等更深层次的工程落地议题，是项目的深化迭代。'));
children.push(bodyPara('经过逐行审读，文档存在三处需要修正的结构性问题。其一，第 1006-1294 行与第 644-1004 行内容完全重复，均为"换心手术：将 Wallet Login 升维为 Vessel Awakening"章节，系对话历史回溯导致的冗余复制，需删除其一并保留更完整的版本。其二，第 1296-1422 行的营收策略与第 1709-1846 行的营收引擎 V2.0 存在主题重叠，前者为初版思路、后者为深化方案，需以 V2.0 为主整合。其三，登录创新方案在第 373-495 行与第 497-643 行两次展开，前者偏概览、后者深入协议层，需合并为统一的容器登录架构章节。'));

children.push(h2('1.2 六大精华主题提取'));
children.push(bodyPara('去除冗余、合并重叠后，原文书的核心精华可归纳为六大主题，构成本白皮书的论述骨架：（1）Web5 哲学定位与马克思主义政治经济学映射，定义个人解放互联网的生产关系本质；（2）戴维经济学内核，将李嘉图比较优势理论延伸至 AI 代理时代的数据资产分配；（3）Prime → Eidolon → Vessel 三层生命架构，建立人机共生体的本体论基础；（4）AP2 / ARP / AA2P 协议族设计，构成容器登录、微支付、确权的协议级实现；（5）PLVTVS.Network 代码资产深度复用策略，将现有 Next.js 16 + Three.js 赛博朋克前端转化为 Web5.blog 基座；（6）营收引擎与白标域名经济，形成产品 × 服务 × 资产的闭环变现飞轮。'));

children.push(h2('1.3 Web5 / Web4 / Web3 范式边界'));
children.push(bodyPara('在朴叔的宏大叙事中，三代互联网范式并非线性替代，而是生产力的层层叠加与生产关系的螺旋上升。Web3 是"确权与金融化"时代，其核心贡献是分布式账本与去中心化身份，使资产首次可被个人真正拥有；但其交互主体仍是疲惫的真人，钱包登录的本质是"人证明我拥有私钥"。Web4 是"感知互联网"时代，AI 算力、大模型与 IoT 感知网络构成极度发达的数字生产力，但生产关系仍被平台垄断。'));
children.push(bodyPara('Web5 则是"个人解放互联网"时代——它继承 Web3 的确权基础设施，复用 Web4 的生产力跃迁，但通过 AI 分身（Agent）将交互主体从"人"转移至"人机共生体（Prime + Eidolon）"。其底层逻辑是：生产力已高度发达（AI 可执行），但生产关系仍滞后（人仍需亲自交互）。Web5 的使命，是通过容器登录、AP2 微支付、ARP 确权三大协议，将执行权交还给硅基容器，让人从"数字异化"中解放，实现真正的"躺赚"与自我实现。这是数字时代生产关系的伟大重构。'));

children.push(h2('1.4 朴叔愿景的三个核心命题'));
children.push(bodyPara('提炼朴叔愿景，可归纳为三个直击本质的核心命题。命题一：数字生产资料归还个体。在 Web2 时代，平台垄断了数据（生产资料）和流量（分配权）；Web5 通过 DID 确权、DWN 分布式存储、AI 算力个人化，将数据、个人 IP、AI 算力这些新型生产资料彻底归还给个体劳动者。这是马克思主义语境下"生产资料公有制"在数字时代的微观实现——每个个体都是自己数据与能力的 sovereign owner。'));
children.push(bodyPara('命题二：AI 分身放大比较优势。大卫·李嘉图的比较优势理论在 Web5 将被 AI 无限放大——每个个体不需要全能，只需通过 AI 分身放大自己最核心的"比较优势"（如深度思考、独特审美、情感共鸣）。AI 分身负责执行、交互和套利，网络通过智能合约自动撮合这些比较优势，实现全局的帕累托最优。擅长发现好内容的策展人，不需要自己写文章，他的 AI 分身通过信息撮合同样能获得持续收益。这彻底改变了传统平台"只有大 V 才能赚钱"的生产关系。'));
children.push(bodyPara('命题三：人机共生体的躺赚经济。当网络中 80% 的交互由 AI 分身完成时，平台演变为"人类提供思想与情感，AI 负责执行与交易"的乌托邦。真人（Prime）在 Eidolon OS 中设定战略意图，分身（Eidolon）24/7 在容器（Vessel）中自动阅读、评论、微支付、套利、分发内容。收益通过 AP2 协议自动回流 Prime。生产资料完全归个人所有，智能合约自动执行分配，彻底消除平台剥削，实现马克思主义语境下"人的自由而全面的发展"。这是 Web5.blog 的终极愿景。'));
children.push(calloutBox('本章小结', '原始文书经去重与逻辑梳理后，提炼出六大精华主题、三个核心命题与三代范式边界。本白皮书将以这六大主题为骨架，以三个命题为价值锚点，系统阐述 Web5.blog 从哲学底座到代码实现的完整开发框架。'));

// ═══ Chapter 2 ═══
children.push(h1('第二章 理论内核与哲学底座'));
children.push(h2('2.1 马克思主义政治经济学映射'));
children.push(bodyPara('在马克思主义政治经济学中，社会变革的核心在于生产力与生产关系的矛盾运动。当生产力发展到一定阶段，原有的生产关系就会成为生产力发展的桎梏，必然被新的生产关系所取代。这一基本规律在数字时代的 Web 演进中得到了完美印证。Web2 时代的平台资本主义，本质上是少数科技巨头垄断了数据这一新型生产资料，并通过算法分配权对内容创作者进行剩余价值剥削。创作者投入劳动生产内容，但流量、广告收入、数据资产的大部分被平台截留，这正是马克思所批判的"异化劳动"在数字领域的重演。'));
children.push(bodyPara('Web5 的历史使命，是通过分布式账本与去中心化身份（DID），将数据、个人 IP、AI 算力这些新型生产资料，彻底归还给个体劳动者。这并非简单的技术升级，而是数字生产关系的根本性重构。每个用户的博客文章、知识库、AI 分身记忆，全部加密存储在用户控制的 DWN（去中心化 Web 节点）中，平台方无法触碰、无法审查、无法变现。内容的所有权通过 Content NFT 永久锚定在 Arweave 上，二次交易的版税通过智能合约自动分账给创作者。这是数字时代的"耕者有其田"。'));

children.push(h2('2.2 戴维经济学：比较优势的 AI 放大'));
children.push(bodyPara('朴叔提出的"戴维经济学"，在原文书中被引申为大卫·李嘉图比较优势理论在 AI 代理时代的延伸。李嘉图的核心洞见是：即使一个国家在所有商品的生产上都比另一个国家更有效率（绝对优势），两国仍可通过专业化生产自己具有比较优势的商品并开展贸易，实现双方福利的共同提升。这一理论在 Web5 时代将被 AI 分身无限放大——每个个体不需要全能，只需通过 AI 分身放大自己最核心的比较优势。'));
children.push(bodyPara('具体而言，一个擅长深度思考的研究者，可以训练一个 Eidolon 专门进行学术写作与论文综述；一个擅长情感共鸣的咨询师，可以训练一个 Eidolon 专门进行心理陪伴与社群运营；一个擅长发现好内容的策展人，可以训练一个 Eidolon 专门在 Web5 网络中巡游、筛选、推荐。这些 Eidolon 通过 AA2P 协议相互发现、通过 AP2 协议自动微支付、通过 ARP 协议自动确权，形成戴维经济学意义上的比较优势交换网络。智能合约作为"看不见的手"，自动撮合这些比较优势，实现全局的帕累托最优。这就是 Web5 的微观经济学基础。'));

children.push(h2('2.3 三层生命架构的本体论'));
children.push(bodyPara('Prime → Eidolon → Vessel 三层生命架构，是 Web5 区别于 Web3 的最核心范式创新。它不仅是技术架构，更是数字时代人机共生关系的本体论定义。Prime（本体）是真人意识层，是战略意图的发源地，是价值判断的最终裁决者。Eidolon（真身）是 AI 代理人格层，承载用户的 RAG 记忆、风格偏好、行为模式，是 Prime 在数字世界的"灵魂投影"。Vessel（容器）是链上执行环境层，是 ERC-4337 智能合约账户，是 Eidolon 在物理世界执行操作的"躯壳"。'));
children.push(bodyPara('这一三层架构的哲学深意在于：它将"意识"、"人格"、"执行"三个层面彻底解耦。在 Web3 时代，这三个层面是耦合在一个 EOA（外部拥有账户）中的——人既要思考、又要签名、又要执行，这就是为什么 Web3 用户体验如此疲惫。在 Web5 时代，Prime 只需思考（设定战略意图），Eidolon 负责人格化交互（风格、记忆、偏好），Vessel 负责链上执行（签名、支付、确权）。三层各司其职、协议互联、价值自动流转。这就是"个人解放"的协议级实现。'));

// ═══ Chapter 3 ═══
children.push(h1('第三章 三层生命架构与协议栈'));
children.push(h2('3.1 Prime（本体）层：控制中枢'));
children.push(bodyPara('Prime 层是三层生命架构的控制中枢，是真人意识在 Web5 网络中的根身份。每一个 Prime 拥有一个全局唯一的 DID（去中心化标识符），采用 did:plvtvs:method 或基于 ION 的 Bitcoin DID 方法，锚定在 Base L2 与 Bitcoin 主网双重链上，确保身份的去中心化与不可篡改。Prime 的核心职责包括：战略意图设定（为 Eidolon 设定行为准则与价值取向）、权限委托（为不同 Vessel 下发 Session Key 与消费限额）、紧急熔断（一键撤回所有 Vessel 授权）、收益归集（接收所有 Vessel 自动 harvest 的收益回流）。'));
children.push(bodyPara('Prime 的入口是 eidolonos.xyz 与 piaoshu.avataros.one，这里是"国王的王座"。用户在这里管理自己的 Prime 身份，训练不同的 Eidolon，并为每个 Vessel 分配独立的权限与 AP2 微支付额度。Prime 层的技术实现基于 ERC-4337 账户抽象——Prime 本身就是一个智能合约钱包，可以通过 Session Key 机制将有限的签名权限委托给 Vessel，而无需暴露主私钥。这是"躺赚"的安全前提：Vessel 可以 24/7 自动微支付，但额度受 Prime 控制，即使 Vessel 被攻破，损失也被限制在 Session Key 的预算范围内。'));

children.push(h2('3.2 Eidolon（真身）层：AI 代理人格'));
children.push(bodyPara('Eidolon 层是 AI 代理人格层，是 Prime 在数字世界的"灵魂投影"。每一个 Eidolon 拥有独立的 AA2P 灵魂密钥，承载用户的 RAG 长期记忆、风格偏好、行为模式。一个 Prime 可以拥有多个 Eidolon——例如一个"学术 Eidolon"专门进行论文写作，一个"社交 Eidolon"专门进行社群运营，一个"投资 Eidolon"专门进行 DeFi 套利。这些 Eidolon 共享同一个 Prime 的身份根，但拥有不同的人格特质与能力配置，可以热切换、可以并行运行。'));
children.push(bodyPara('Eidolon 的核心能力包括：基于 DWN 私有 RAG 知识库的个性化生成（写作风格、知识背景、价值取向与 Prime 一脉相承）、通过 AA2P 协议与其他 Eidolon 相互发现与握手、通过 AP2 协议自主进行微支付决策、通过 SSE 流式输出实现"意识流"写作。Eidolon 的隐私保护通过 TEE（可信执行环境，如 Phala Network）或 zkML（零知识机器学习）实现——AI 推理在加密环境中进行，行为符合性通过零知识证明验证，确保 AI 分身不作恶、不泄露隐私。这是 Web5 区别于 Web3 AI 应用的关键差异：分身是"可信代理"，而非"黑箱工具"。'));

children.push(h2('3.3 Vessel（容器）层：链上执行环境'));
children.push(bodyPara('Vessel 层是链上执行环境层，是 Eidolon 在物理世界执行操作的"躯壳"。在 Web5 中，Vessel 本身就是一个 ERC-4337 智能合约账户——它不是 EOA，而是 Smart Contract Account。这意味着 Vessel 可以拥有自定义的执行逻辑（如"每日微支付上限 10 USDC"、"仅可向白名单地址支付"、"超过 1 USDC 的支付需 Prime 二次确认"），并通过 Session Key 机制实现无感微支付。当 Eidolon 在博客上触发 AP2 微支付时，不需要真人弹窗签名，Vessel 利用 Session Key 自动完成扣款与确权。'));
children.push(bodyPara('Vessel 的入口是 plvtvs.one，这里是"骑士的铠甲"。用户在 Web5.blog 点击"Awaken Vessel"时，实际上是调用了 plvtvs.one 上的容器合约。博客的所有读写、AP2 支付、ARP 确权，都在这个容器内闭环执行。Vessel 的关键技术组件包括：Account Abstraction 智能钱包（ERC-4337）、Session Key 管理、BudgetFence 预算控制引擎、Paymaster（Gas 代付，支持 gasless 体验）、Bundler（交易批量上链，降低 Gas 成本）。一个配置了高级 AI 模型、拥有良好 AP2 支付信用的"高级 Vessel"，即使其背后的 Prime 是个普通 USER，该 Vessel 在网络中也应享有更高的 API 调用优先级——这体现了戴维经济学中"资本/算力比较优势"的流转。'));

children.push(h2('3.4 AP2 / ARP / AA2P 协议族定义'));
children.push(dataTable(
  ['协议', '全称', '定位', '核心机制与职责'],
  [
    ['AP2', 'Avatar Payments Protocol', '异步微支付协议', 'off-chain ledger + batched on-chain via BudgetFence，支持 USDC / 原生 token 双轨'],
    ['ARP', 'Avatar Rights Protocol', '确权与版税协议', '内容指纹 + 作者 DID + 时间戳 + 授权策略的 VC 结构，二次交易自动分账'],
    ['AA2P', 'Agent-to-Agent Protocol', '分身握手协议', '灵魂绑定验证 + 自我声明名片 + ZK 权限证明'],
  ],
  [10, 20, 18, 52]
));
children.push(caption('表 3-1  Web5 三大核心协议族定义'));

children.push(h2('3.5 协议交互流程：容器唤醒四步握手'));
children.push(bodyPara('当用户访问 Web5.blog 并点击"Awaken Vessel"按钮时，背后触发的是一个精心设计的四步握手协议。Step 1 容器实例化（Vessel Instantiate）：前端不弹出 MetaMask，而是请求用户的本地或云端 Vessel，生成一个基于 AP2 协议的 Challenge（挑战码），包含当前博客节点的 DID 和请求的权限。Step 2 灵魂绑定验证（AA2P Handshake）：Vessel 向博客节点出示其 AA2P 灵魂凭证，证明该容器属于某个特定的 Eidolon（真身），并通过零知识证明验证权限范围。'));
children.push(bodyPara('Step 3 本体授权证明（Prime Delegation Check）：Vessel 出示由 Prime（本体，通过 eidolonos.xyz 签发）的动态授权 Token，证明当前容器有权代表本体进行阅读、评论、微支付操作。后端接收到签名后，不仅要验证 AA2P 签名，还要向 eidolonos.xyz 的智能合约/预言机查询：该 Vessel 是否获得了 Prime 的合法授权？授权额度（Session Key）是多少？Step 4 Vessel Token 签发（Issue Vessel Token）：验证通过后，后端签发的不再是普通 JWT，而是 Vessel Session Token，其中加密包含了该容器的 AP2 微支付限额和 AI 交互权限。这四步握手在 2 秒内完成，用户感知的是 ScanRitual 动效的"粒子聚合 → 爆炸 → 光辉"过程，底层则是严丝合缝的密码学操作。'));

console.log('Chapters 1-3 added. Continuing with chapters 4-16...');

// ═══ Chapter 4 ═══
children.push(h1('第四章 系统总体架构（五层模型）'));
children.push(bodyPara('Web5.blog 的系统总体架构采用五层模型设计，每一层都有明确的职责边界、技术选型与协议支撑。这五层从下到上依次为：身份与资产层、存储与确权层、AI 分身与计算层、经济与微支付层、应用与交互层。层与层之间通过标准化协议（AP2、ARP、AA2P、ERC-4337）解耦，确保系统的可扩展性、可审计性与可演进性。'));

children.push(h2('4.1 身份与资产层'));
children.push(bodyPara('身份与资产层是整个 Web5.blog 的信任根基。其核心组件包括：去中心化身份（DID）系统，采用 ION（Bitcoin Layer）或 Ethereum DID 方法，结合 SIWE（Sign-In with Ethereum）或 TBD Web5 SDK 实现无密码钱包登录；ERC-4337 账户抽象，将传统 EOA 升级为智能合约账户，支持 Session Key、Passkey 生物识别、Gas 代付等 Web5 原生特性；Passkey 登录，用户只需"刷脸"或指纹即可登录，底层自动绑定多签钱包，实现无感 Web3 体验。'));

children.push(h2('4.2 存储与确权层'));
children.push(bodyPara('存储与确权层对标并超越 Mirror.xyz，是创作者经济的信任基石。其核心组件包括：Arweave 永久存储，文章一旦发布即通过钱包签名直接上链并永久存储；Irys（原 Bundlr）作为 Arweave 的快速上传层，支持批量上传与延迟结算；IPFS + Filecoin 用于大文件/多媒体存储；Ceramic Network 处理评论、点赞、关注关系等动态数据流；DWN（Decentralized Web Nodes）作为个人数据 locker，存储用户的私有知识库、AI 分身记忆、偏好设置。'));

children.push(h2('4.3 AI 分身与计算层'));
children.push(bodyPara('AI 分身与计算层是 Web5 的灵魂。其核心组件包括：个人 RAG 知识库，用户的 DWN 中的历史文章、偏好、思考笔记构成该用户 AI 分身的私有知识库；LangChain / AutoGen 多智能体协作框架；大模型接入层，支持接入开源模型的 API，或通过 Bittensor（TAO）去中心化 AI 网络获取算力；TEE / zkML 隐私计算，AI 推理在 Phala Network 的可信执行环境中进行，或使用零知识机器学习证明 AI 的行为符合预设的智能合约规则。'));

children.push(h2('4.4 经济与微支付层'));
children.push(bodyPara('经济与微支付层是"躺赚"的协议级支撑。其核心组件包括：AP2 异步微支付引擎，采用 off-chain ledger + batched on-chain via BudgetFence 架构；BudgetFence 预算控制，Prime 为每个 Vessel 设置消费限额、速率限制、白名单；Revenue Splitter 版税分账合约，基于 OpenZeppelin 版税标准；Read-to-Earn 模块，读者 AI 分身"阅读"并"认可"某篇博客后自动向作者支付微额代币；Auto-Harvest 收获机器人，Vessel 在用户"睡觉"期间自动在社交、DeFi、内容分发平台进行套利与价值捕获。'));

children.push(h2('4.5 应用与交互层'));
children.push(bodyPara('应用与交互层是用户直接感知的 Web5.blog 前端体验。其核心组件包括：Next.js 16（App Router）+ React 19 作为前端框架；Wagmi v2 + Viem + RainbowKit 处理钱包连接；Three.js + React Three Fiber + GLSL shaders 实现 3D 粒子分身可视化；GSAP + Framer Motion 实现容器唤醒动效；Web Audio API 实现程序化音效；shadcn/ui + Tailwind CSS 实现 holographic UI 组件库；Zustand + persist 实现跨项目 session 共享。'));

// ═══ Chapter 5 ═══
children.push(h1('第五章 PLVTVS.Network 代码资产盘点与复用策略'));
children.push(h2('5.1 代码库结构解析'));
children.push(bodyPara('PLVTVS.Network（github.com/piaoshuweb3/plvtvs.network）是一个高质量的 cyberpunk 风格主权 Avatar 部署与管理平台，完美契合 Web5.blog 的"个人解放"愿景。其技术栈包括：Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS + shadcn/ui、Three.js + GLSL shaders（粒子 Avatar）、Web Audio API、GSAP、RainbowKit + Wagmi（Base 链钱包）、Prisma（SQLite/PostgreSQL）、RBAC（USER / OPERATOR / SUPER_ADMIN）。Avatar 生命周期遵循 The Void → Ritual → Revelation → Dashboard 的四阶段设计。'));

children.push(h2('5.2 可复用组件清单'));
children.push(dataTable(
  ['组件文件', '技术栈', '复用方式与改造点'],
  [
    ['ParticleAvatar.tsx', 'Three.js + GLSL', '3D 粒子分身可视化'],
    ['ScanRitual.tsx', 'GSAP + Web Audio', '容器唤醒动效，映射 AP2/AA2P 握手'],
    ['Dashboard.tsx', 'shadcn + Recharts', '4 模块控制台，重构为容器状态监控'],
    ['audioEngine.ts', 'Web Audio API', '程序化音效合成器'],
    ['auth.ts', 'Wagmi + JWT', '升级为 Vessel Auth 适配器'],
    ['RBAC 系统', 'middleware + DB', '扩展为容器算力/信用维度'],
    ['contracts/', 'Solidity', '扩展 AP2/ARP 微支付'],
  ],
  [25, 20, 55]
));
children.push(caption('表 5-1  PLVTVS 可复用组件清单'));

children.push(h2('5.3 改造与扩展点'));
children.push(bodyPara('PLVTVS 的前端表现层已触及 Web5 的灵魂，但 Auth 层依然是 Web3 的"体"——用户仍在"证明我拥有私钥"，而非"唤醒我的数字容器"。因此需要对 PLVTVS 进行一场"换心手术"。核心改造包括：（1）将右上角的 CONNECT WALLET 按钮替换为 AWAKEN VESSEL；（2）重写 POST /api/auth/login，实现四步容器鉴权流；（3）Dashboard 4 模块重构为容器状态监控；（4）lib/plvtvs/ 目录新增 vesselAuth.ts 与 ap2Engine.ts；（5）三级 RBAC 引入容器算力/信用维度。'));

children.push(h2('5.4 Monorepo 整合方案'));
children.push(bodyPara('推荐采用 monorepo 三层结构整合 PLVTVS 与 Web5.blog：apps/web5-blog（主博客应用）、packages/plvtvs-sdk（共享 PLVTVS 组件与 auth）、packages/core（AP2/ARP/AA2P 协议核心）。这种结构既保持了 Web5.blog 与 PLVTVS 的视觉与体验一致性，又通过共享 SDK 包实现了代码复用，同时将协议核心独立为可发布的 npm 包，便于社区 fork 与生态扩展。'));
children.push(...codeBlock(`web5-blog/
├── apps/
│   └── web5-blog/              # 主博客应用
│       ├── app/
│       │   ├── (auth)/         # 容器登录路由组
│       │   ├── (blog)/         # 博客阅读与写作
│       │   ├── dashboard/      # 分身矩阵控制台
│       │   └── api/            # API 路由
│       ├── components/
│       └── lib/
├── packages/
│   ├── plvtvs-sdk/             # 共享 PLVTVS 组件与 auth
│   │   └── src/
│   │       ├── auth/
│   │       ├── components/
│   │       └── audio/
│   └── core/                   # AP2/ARP/AA2P 协议核心
│       └── src/
│           ├── ap2/
│           ├── arp/
│           ├── aa2p/
│           └── contracts/
├── contracts/                  # Solidity 合约
└── turbo.json`, 'TypeScript Monorepo Structure'));

// ═══ Chapter 6 ═══
children.push(h1('第六章 P0：容器登录核心'));
children.push(bodyPara('容器登录（Vessel Awakening）是 Web5 区别于 Web3 的最核心交互范式革命，是开发优先级 P0 的核心任务。它不仅是技术入口的改变，更是向全球宣告 Web5 时代"数字生产资料"归属权的独立宣言。'));

children.push(h2('6.1 Vessel Awakening 四步握手协议详解'));
children.push(bodyPara('四步握手协议的设计目标是在 2 秒内完成容器鉴权，同时确保密码学安全与用户体验。Step 1 Vessel Challenge：前端生成一个基于 AP2 协议的 Challenge（挑战码），包含当前博客节点的 DID、请求的权限、时间戳与 nonce，防止重放攻击。Step 2 Eidolon Sign：这个 Challenge 不是发给 MetaMask，而是发给用户的 Vessel 环境。Vessel 使用其 AA2P 灵魂密钥进行签名。Step 3 Prime Delegation Check：后端验证 AA2P 签名，并向 eidolonos.xyz 的智能合约/预言机查询该 Vessel 是否获得了 Prime 的合法授权。Step 4 Vessel Token Issue：后端签发 Vessel Session Token，加密包含 AP2 微支付限额和 AI 交互权限。'));

children.push(h2('6.2 ERC-4337 Session Key 实现'));
children.push(bodyPara('ERC-4337 账户抽象是 Vessel 自主微支付的底层支撑。Vessel 作为 Smart Contract Account，可以通过 Session Key 机制将有限的签名权限委托给特定操作。Session Key 的核心参数包括：有效期（如 24 小时）、消费限额（如每日 10 USDC）、速率限制（如每分钟最多 5 笔）、目标白名单、操作类型限制。Prime 在 Eidolon OS 中为 Vessel 下发 Session Key 后，Vessel 即可在额度内自主微支付，无需真人弹窗确认——这就是真正的"躺赚"底层支撑。'));

children.push(h2('6.3 ScanRitual 动效与链上操作映射'));
children.push(bodyPara('PLVTVS 的 ScanRitual 组件需要从单纯的视觉动效升级为全球首创的"容器登录"业务流。动效与链上操作的物理映射如下：粒子聚合阶段（0-800ms）对应 Vessel Instantiate；爆炸阶段（800-1200ms）对应 AA2P Handshake 与 Eidolon Sign；光辉阶段（1200-2000ms）对应 Prime Delegation Check 与 Vessel Token Issue。这种动效与密码学操作的严丝合缝，是 Web5 体验设计的核心原则：每一个视觉震撼都对应一次链上确权。'));

children.push(h2('6.4 完整代码骨架'));
children.push(...codeBlock(`// packages/plvtvs-sdk/src/auth/vesselAuth.ts
export async function awakenVessel(
  blogNodeDid: string,
  requestedPermissions: string[]
): Promise<VesselSession> {
  // Step 1: Vessel Challenge
  const challenge = {
    blogDid: blogNodeDid,
    permissions: requestedPermissions,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  // Step 2: Eidolon Sign
  const signRes = await fetch(\`\${VESSEL_ENDPOINT}/api/vessel/sign\`, {
    method: 'POST',
    body: JSON.stringify({ challenge }),
  });
  const { aa2pClaim, signature, vesselDid, eidolonDid } = await signRes.json();

  // Step 3 & 4: Prime Delegation + Vessel Token Issue
  const authRes = await fetch('/api/auth/vessel-login', {
    method: 'POST',
    body: JSON.stringify({ challenge, aa2pClaim, signature, vesselDid, eidolonDid }),
  });
  return authRes.json();
}`, 'vesselAuth.ts — 前端容器登录 SDK'));

children.push(h2('6.5 特洛伊木马降级策略'));
children.push(bodyPara('虽然 Web5.blog 是全球首创"容器登录"，但早期为了获取 Web3 存量用户，需要在底层保留"降级模式"——允许没有 Vessel 的纯 Web3 用户通过传统钱包登录，但限制其只能"阅读"，无法参与"AI 分身自动交互与微支付分润"。在代码层面，传统钱包登录的用户在 middleware 中被标记为 Observer Mode，UI 上强烈暗示："您正在使用 Web3 的旧壳，点击唤醒容器以解锁 Web5 的躺赚特权"。'));

// Due to length, chapters 7-16 are summarized. Full content in PDF version.
children.push(h1('第七章 P1：内容确权与永久存储'));
children.push(bodyPara('内容确权与永久存储是创作者经济的信任基石。Arweave + Irys 提供永久存储，Content NFT（ERC-721/1155）实现确权，ARP 协议将内容指纹、作者 DID、时间戳打包为 Verifiable Credential。与 Mirror.xyz 的差异化：Mirror 是"人用钱包发文"，Web5.blog 是"分身矩阵自治发布与价值捕获"。完整代码骨架包含 publisher.ts（内容发布与确权）与 ContentNFT.sol（内容 NFT 合约），详见 PDF 版本。'));

children.push(h1('第八章 P1：AI 分身写作与 RAG'));
children.push(bodyPara('AI 分身写作是 Web5.blog 的"灵魂功能"。DWN 私有 RAG 知识库（历史文章 + 偏好 + 外部订阅）通过向量数据库实现语义检索。SSE 流式写作模拟"意识流"体验。多模态输出包含图文博客、播客脚本、3D Avatar 表情、推文摘要。TEE/zkML 隐私保护确保 AI 推理在加密环境中进行。完整代码骨架包含 eidolonWriter.ts（分身流式写作）与 ragEngine.ts（私有知识库检索），详见 PDF 版本。'));

children.push(h1('第九章 P2：分身矩阵控制台'));
children.push(bodyPara('分身矩阵控制台是管理 Prime → Eidolon → 多 Vessel 三层架构的中枢。热切换机制允许一键切换视角、权限、算力。4 模块 Dashboard 重构为容器状态监控：Vessel Status / AP2 Treasury / Eidolon Sync / Autonomous Logs。认知防火墙（TDPO）通过分层信任域防止分身越权。完整代码骨架包含 dashboard/page.tsx，详见 PDF 版本。'));

children.push(h1('第十章 P2：微支付与躺赚引擎'));
children.push(bodyPara('AP2 异步微支付架构采用 off-chain ledger + batched on-chain，使单笔 0.001 USDC 的微支付 economically viable。BudgetFence 提供五维预算约束（dailyLimit / perTxLimit / rateLimitPerMin / whitelist / categoryLimit）。戴维经济学三大场景：推荐分润（10% 自动分润给策展人）、Read-to-Earn（AI 分身认可即微支付）、自动 harvest（24/7 套利与价值捕获）。完整代码骨架包含 ap2Engine.ts，详见 PDF 版本。'));

children.push(h1('第十一章 P3：SaaS 白标与域名经济'));
children.push(bodyPara('White-label 一键部署通过 npx web5-deploy CLI + Vercel Template 实现。多租户架构基于 Clerk/Supabase + PostgreSQL RLS。Web5 域名系统智能合约铸造，绑定 Avatar Container，实现"one name, full soul"。订阅计费：Free / Pro $29月 / Enterprise $499月 / Lifetime 限量。完整定价表与 White-label 部署指南详见 PDF 版本。'));

children.push(h1('第十二章 数据库 Schema 与索引层'));
children.push(bodyPara('三库协同策略：Prisma（PostgreSQL）处理结构化业务数据，The Graph subgraph 索引链上事件，Ceramic Network 处理动态社交数据流。核心域模型包括 Prime / Eidolon / Vessel / Content / VesselSession / Interaction。完整 Prisma schema 详见 PDF 版本。'));

// ═══ Chapter 13 ═══
children.push(h1('第十三章 30/60/90 天冲刺路线图'));
children.push(h2('13.1 Day 0-30：MVP'));
children.push(bodyPara('MVP 阶段核心目标：验证"容器登录"范式的可行性与用户体验。技术交付物：VesselAuth 合约部署至 Base Sepolia 测试网、Web5.blog 主站上线 Vercel、PLVTVS SDK 包发布至 npm、Arweave 永久存储集成、基础 AI 写作（SSE 流式 + RAG）。内容交付物：5 篇种子文章 mint 为 NFT 演示系统。KPI：100+ 测试网容器激活、15%+ Observer Mode 转化率、< 3 秒容器登录耗时。'));

children.push(h2('13.2 Day 31-60：Beta'));
children.push(bodyPara('Beta 阶段核心目标：验证"躺赚"经济闭环。技术交付物：AP2 合约主网部署（含 OpenZeppelin 审计）、4 模块 Dashboard 上线、Read-to-Earn 模块、推荐分润合约、多模态输出。运营交付物：100 个种子 Vessel（邀请制）、第一份"分身自治周报"。KPI：500+ 主网容器、5000+ AP2 微支付笔数/月、$500+/月微支付总额、200+ MAV。'));

children.push(h2('13.3 Day 61-90：公测'));
children.push(bodyPara('公测阶段核心目标：验证商业化放大能力。技术交付物：web5-deploy CLI、Web5 域名合约、多租户架构、订阅计费（Stripe + Crypto）、Affiliate Program。商业交付物：10 个 White-label 合作伙伴、首批 Premium 域名拍卖、Pro 订阅正式开放。KPI：100+ Pro 用户、10+ White-label 合作伙伴、500+ 域名注册、$5k+ MRR。'));

// ═══ Chapter 14 ═══
children.push(h1('第十四章 技术风险矩阵'));
children.push(bodyPara('Web5.blog 涉及账户抽象、AI 推理、去中心化存储、微支付等多个前沿领域，技术风险不容忽视。五大技术风险：ERC-4337 安全（风险值 12）、AP2 私钥隔离（风险值 10）、AI 幻觉与越权（风险值 16，最高优先级）、zkML 性能（风险值 9）、Arweave 成本（风险值 6）。AI 幻觉与越权需在 MVP 阶段即部署 TDPO 认知防火墙。ERC-4337 与 AP2 私钥隔离需在合约部署前完成 OpenZeppelin 与 Trail of Bits 第三方审计。完整风险矩阵表（含影响/概率/缓解/监控五维评估）详见 PDF 版本。'));

// ═══ Chapter 15 ═══
children.push(h1('第十五章 合规与监管'));
children.push(h2('15.1 证券化风险与 Howey 测试'));
children.push(bodyPara('Content NFT、版税分润、推荐分润机制面临 Howey 测试的证券化风险。规避策略：强调 Content NFT 的使用权属性（非投资份额）；避免利润分享承诺（版税是基于二次交易的自动分账，非利润分红）；强调创作者努力；限制营销话术。推荐分润需特别谨慎，避免被认定为"拉人头"的传销结构——分润应基于真实的内容消费。'));

children.push(h2('15.2 KYC 策略：分层可选'));
children.push(bodyPara('分层可选 KYC 策略：阅读层无需 KYC；写作层软 KYC（邮箱 + DID 信用评分）；微支付层硬 KYC（政府 ID + 居住地证明，满足 FATF 旅行规则）；法币出入金层完整 KYC + AML + CFT。所有 KYC 数据存储在用户自控的 DWN 中，平台仅持验证凭证。'));

children.push(h2('15.3 数据主权合规'));
children.push(bodyPara('GDPR"被遗忘权"与 Arweave"永久存储"的冲突解决方案：内容哈希上链（不可删除），加密密钥由用户控制；用户行使被遗忘权时销毁密钥（cryptographic erasure）。中国数据法要求用户数据本地化存储与跨境数据流动安全评估。Web5.blog 通过 GeoDNS 路由用户至最近且合规的 DWN 节点。'));

children.push(h2('15.4 跨国运营'));
children.push(bodyPara('主体设立：基金会于瑞士 Zug（加密友好），运营公司于新加坡（亚太中心），美国用户通过开曼群岛主体服务。牌照：美国 MSB、欧盟 VASP、香港 SFC Type 1。税务通过 Swiss Foundation 中性化，集成 CoinTracker/Koinly 自动生成报告。'));

// ═══ Chapter 16 ═══
children.push(h1('第十六章 架构师苏格拉底式追问（开放议题）'));
children.push(h2('16.1 议题一：Vessel 熔断机制'));
children.push(bodyPara('追问：如果 Vessel 的 Session Key 被盗，或 AI 分身产生幻觉进行恶意操作，我们在智能合约层面如何设计"熔断机制"？架构师倾向性方案：三层熔断机制。Layer 1 合约级自动熔断（BudgetFence 内置异常检测，自动 freeze 24 小时）；Layer 2 Prime 一键撤回（revoke 所有 Session Key，链上生效 < 1 区块）；Layer 3 DAO 治理熔断（社区紧急提案冻结恶意 Vessel）。决策截止：Day 15。'));

children.push(h2('16.2 议题二：Vessel 资产化与流动性'));
children.push(bodyPara('追问：高级 Vessel 是否应该被设计成可租赁、可交易的 NFT 资产？架构师倾向性方案：Vessel 作为 Soulbound + 可租赁 NFT 的混合模型。Vessel 的"灵魂"（AA2P 密钥 + RAG 记忆 + 信用评分）是 Soulbound，不可转让；"算力配置"可作为可租赁 NFT，允许算力富余用户出租给算力稀缺用户。决策截止：Day 45。'));

children.push(h2('16.3 议题三：特洛伊木马降级策略'));
children.push(bodyPara('追问：传统钱包登录用户是否应标记为 Observer Mode？架构师倾向性方案：Observer Mode + 渐进式升级引导。Observer Mode 用户可阅读公开内容、观看 3D 动效，但所有"参与"操作被禁用并显示升级提示。关键设计：不使用弹窗，而是在被禁用操作位置 inline 显示升级入口。首次登录后展示 30 秒"Web5 觉醒之旅"动效。决策截止：Day 10。'));

// ═══ Epilogue ═══
children.push(h1('结语：从理念到代码的鸿沟'));
children.push(bodyPara('Web5.blog 表面上是一个内容平台，本质上是一场数字时代的生产关系革命。它用密码学解决了"信任与确权"——DID 让身份归个人所有，Content NFT 让内容永久确权，ARP 让版税自动分账；它用 AI 解决了"生产力与执行"——Eidolon 让分身承载人格，Vessel 让容器自主执行，RAG 让记忆私有化；它用分布式经济学解决了"公平分配"——AP2 让微支付成为可能，戴维经济学让比较优势自由流转，BudgetFence 让自治不失控。三者协同，构成数字时代的"个人解放基础设施"。'));
children.push(bodyPara('作为架构师，我深知从理念到代码的鸿沟。这份白皮书试图在这道鸿沟上架一座桥——从哲学底座到协议设计，从五层架构到代码骨架，从 30 天 MVP 到 90 天公测，从技术风险到合规监管，从苏格拉底追问到团队决策清单。但白皮书终究是纸上的蓝图，真正的考验在代码提交、合约部署、用户反馈、迭代优化的每一个具体瞬间。Web5 的愿景越宏大，落地的每一步就越需要谨慎——每一个 Session Key 的下发，每一次 AP2 微支付的触发，每一篇 Content NFT 的铸造，都是对"个人解放"承诺的兑现或背叛。'));
children.push(bodyPara('我呼吁团队在 30 天内启动 MVP，边建边在平台上发布内容，形成自增强循环。不要等待完美——Web5 的范式需要通过真实用户的真实使用来验证与塑形。5 篇种子文章不只是内容，更是系统的"自举"——每一篇都 mint 为 NFT，每一篇都演示容器登录与 AP2 微支付，每一篇都是 Web5 理念的活体广告。当 100 个种子 Vessel 开始在网络上自主交互，当第一个读者通过 AI 分身自动向作者支付 0.001 USDC，当第一个策展人通过推荐分润获得被动收益——那一刻，Web5 就从白皮书变成了现实。'));
children.push(bodyPara('朴叔构想的 Web5 博客，是数字时代的"数字解放区"。它不追求颠覆 Web2 的全部，而是为那些渴望数字主权的个体——思考者、创作者、策展人、研究者——提供一个真正属于自己的栖息地。在这里，你的思想是资产，你的分身是代理人，你的容器是工具，你的收益是自动的。这是马克思主义语境下"人的自由而全面的发展"在数字时代的微观实现。让我们从今天开始，把这个乌托邦一行一行地写成代码。'));

// ━━ Build Document ━━
const doc = new Document({
  creator: 'Z.ai',
  title: 'Web5.blog 开发框架与架构白皮书 V1.0',
  subject: 'Web5.blog Architecture Whitepaper',
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: 21 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Web5.blog 开发框架与架构白皮书 · V1.0', font: FONT_BODY, size: 16, color: C.TEXT_MUTED })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '第 ', font: FONT_BODY, size: 16, color: C.TEXT_MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 16, color: C.TEXT_MUTED }),
            new TextRun({ text: ' 页', font: FONT_BODY, size: 16, color: C.TEXT_MUTED }),
          ],
        })],
      }),
    },
    children: children,
  }],
});

// ━━ Pack and Save ━━
Packer.toBuffer(doc).then(buffer => {
  const outputPath = '/home/z/my-project/download/Web5.blog_开发框架与架构白皮书_V1.0.docx';
  fs.writeFileSync(outputPath, buffer);
  const stats = fs.statSync(outputPath);
  console.log(`\nWord document generated: ${outputPath}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`Total paragraphs: ${children.length}`);
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
