# -*- coding: utf-8 -*-
"""
Web5.blog 开发框架与架构白皮书 - PDF 主生成脚本
执行: python3 /home/z/my-project/scripts/gen_web5_pdf.py
输出: /home/z/my-project/scripts/body.pdf
"""
import os, sys, hashlib

# Import setup
sys.path.insert(0, '/home/z/my-project/scripts')
from gen_pdf_part1_setup import *

# ━━ Build Story ━━
story = []

# ═══ TOC Page ═══
story.append(Paragraph('目录', TOC_TITLE))
story.append(Spacer(1, 6))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC0', fontName='NotoSerifSC-Bold', fontSize=11.5, leading=20,
                   leftIndent=8, rightIndent=20, textColor=TEXT_PRIMARY, wordWrap='CJK'),
    ParagraphStyle(name='TOC1', fontName='NotoSerifSC', fontSize=10, leading=16,
                   leftIndent=28, rightIndent=20, textColor=TEXT_MUTED, wordWrap='CJK'),
]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# 第一章 文书精炼与对齐
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第一章 文书精炼与对齐', H1, level=0))

story.append(add_heading('1.1 原始文书结构剖析', H2, level=1))
story.append(Paragraph(
    '朴叔上传的 Web5.blog 商业文书共 1845 行、约 6.5 万字，本质上是两轮多片段对话的拼接产物。'
    '第一轮对话（第 1-371 行）聚焦于 Web5.blog 的整体架构设计与实现方案，从技术栈推荐出发，'
    '逐步深入到戴维经济学内核嵌入、开发上线路线图、文章创作建议等主题，是项目的初始蓝图。'
    '第二轮对话（第 373-1846 行）则在 PLVTVS.Network 代码库审阅后展开，聚焦于容器登录范式革命、'
    'PLVTVS 代码资产盘点、融合方案代码生成、营收增长策略等更深层次的工程落地议题，是项目的深化迭代。',
    BODY
))
story.append(Paragraph(
    '经过逐行审读，文档存在三处需要修正的结构性问题。其一，第 1006-1294 行与第 644-1004 行内容完全重复，'
    '均为"换心手术：将 Wallet Login 升维为 Vessel Awakening"章节，系对话历史回溯导致的冗余复制，'
    '需删除其一并保留更完整的版本。其二，第 1296-1422 行的营收策略与第 1709-1846 行的营收引擎 V2.0 存在主题重叠，'
    '前者为初版思路、后者为深化方案，需以 V2.0 为主整合。其三，登录创新方案在第 373-495 行与第 497-643 行两次展开，'
    '前者偏概览、后者深入协议层，需合并为统一的容器登录架构章节。',
    BODY
))

story.append(add_heading('1.2 六大精华主题提取', H2, level=1))
story.append(Paragraph(
    '去除冗余、合并重叠后，原文书的核心精华可归纳为六大主题，构成本白皮书的论述骨架：'
    '（1）Web5 哲学定位与马克思主义政治经济学映射，定义个人解放互联网的生产关系本质；'
    '（2）戴维经济学内核，将李嘉图比较优势理论延伸至 AI 代理时代的数据资产分配；'
    '（3）Prime → Eidolon → Vessel 三层生命架构，建立人机共生体的本体论基础；'
    '（4）AP2 / ARP / AA2P 协议族设计，构成容器登录、微支付、确权的协议级实现；'
    '（5）PLVTVS.Network 代码资产深度复用策略，将现有 Next.js 16 + Three.js 赛博朋克前端转化为 Web5.blog 基座；'
    '（6）营收引擎与白标域名经济，形成产品 × 服务 × 资产的闭环变现飞轮。',
    BODY
))

story.append(add_heading('1.3 Web5 / Web4 / Web3 范式边界', H2, level=1))
story.append(Paragraph(
    '在朴叔的宏大叙事中，三代互联网范式并非线性替代，而是生产力的层层叠加与生产关系的螺旋上升。'
    'Web3 是"确权与金融化"时代，其核心贡献是分布式账本与去中心化身份，使资产首次可被个人真正拥有；'
    '但其交互主体仍是疲惫的真人，钱包登录的本质是"人证明我拥有私钥"。Web4 是"感知互联网"时代，'
    'AI 算力、大模型与 IoT 感知网络构成极度发达的数字生产力，但生产关系仍被平台垄断。',
    BODY
))
story.append(Paragraph(
    'Web5 则是"个人解放互联网"时代——它继承 Web3 的确权基础设施，复用 Web4 的生产力跃迁，'
    '但通过 AI 分身（Agent）将交互主体从"人"转移至"人机共生体（Prime + Eidolon）"。'
    '其底层逻辑是：生产力已高度发达（AI 可执行），但生产关系仍滞后（人仍需亲自交互）。'
    'Web5 的使命，是通过容器登录、AP2 微支付、ARP 确权三大协议，将执行权交还给硅基容器，'
    '让人从"数字异化"中解放，实现真正的"躺赚"与自我实现。这是数字时代生产关系的伟大重构。',
    BODY
))

story.append(add_heading('1.4 朴叔愿景的三个核心命题', H2, level=1))
story.append(Paragraph(
    '提炼朴叔愿景，可归纳为三个直击本质的核心命题。命题一：数字生产资料归还个体。'
    '在 Web2 时代，平台垄断了数据（生产资料）和流量（分配权）；Web5 通过 DID 确权、DWN 分布式存储、'
    'AI 算力个人化，将数据、个人 IP、AI 算力这些新型生产资料彻底归还给个体劳动者。'
    '这是马克思主义语境下"生产资料公有制"在数字时代的微观实现——每个个体都是自己数据与能力的 sovereign owner。',
    BODY
))
story.append(Paragraph(
    '命题二：AI 分身放大比较优势。大卫·李嘉图的比较优势理论在 Web5 将被 AI 无限放大——'
    '每个个体不需要全能，只需通过 AI 分身放大自己最核心的"比较优势"（如深度思考、独特审美、情感共鸣）。'
    'AI 分身负责执行、交互和套利，网络通过智能合约自动撮合这些比较优势，实现全局的帕累托最优。'
    '擅长发现好内容的策展人，不需要自己写文章，他的 AI 分身通过信息撮合同样能获得持续收益。'
    '这彻底改变了传统平台"只有大 V 才能赚钱"的生产关系。',
    BODY
))
story.append(Paragraph(
    '命题三：人机共生体的躺赚经济。当网络中 80% 的交互由 AI 分身完成时，平台演变为'
    '"人类提供思想与情感，AI 负责执行与交易"的乌托邦。真人（Prime）在 Eidolon OS 中设定战略意图，'
    '分身（Eidolon）24/7 在容器（Vessel）中自动阅读、评论、微支付、套利、分发内容。'
    '收益通过 AP2 协议自动回流 Prime。生产资料完全归个人所有，智能合约自动执行分配，'
    '彻底消除平台剥削，实现马克思主义语境下"人的自由而全面的发展"。这是 Web5.blog 的终极愿景。',
    BODY
))

story.extend(callout_box(
    '本章小结',
    '原始文书经去重与逻辑梳理后，提炼出六大精华主题、三个核心命题与三代范式边界。'
    '本白皮书将以这六大主题为骨架，以三个命题为价值锚点，系统阐述 Web5.blog 从哲学底座到代码实现的完整开发框架。'
))

# ═══════════════════════════════════════════════════════════════
# 第二章 理论内核与哲学底座
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第二章 理论内核与哲学底座', H1, level=0))

story.append(add_heading('2.1 马克思主义政治经济学映射', H2, level=1))
story.append(Paragraph(
    '在马克思主义政治经济学中，社会变革的核心在于生产力与生产关系的矛盾运动。'
    '当生产力发展到一定阶段，原有的生产关系就会成为生产力发展的桎梏，必然被新的生产关系所取代。'
    '这一基本规律在数字时代的 Web 演进中得到了完美印证。Web2 时代的平台资本主义，'
    '本质上是少数科技巨头垄断了数据这一新型生产资料，并通过算法分配权对内容创作者进行剩余价值剥削。'
    '创作者投入劳动生产内容，但流量、广告收入、数据资产的大部分被平台截留，'
    '这正是马克思所批判的"异化劳动"在数字领域的重演。',
    BODY
))
story.append(Paragraph(
    'Web5 的历史使命，是通过分布式账本与去中心化身份（DID），将数据、个人 IP、AI 算力这些新型生产资料，'
    '彻底归还给个体劳动者。这并非简单的技术升级，而是数字生产关系的根本性重构。'
    '每个用户的博客文章、知识库、AI 分身记忆，全部加密存储在用户控制的 DWN（去中心化 Web 节点）中，'
    '平台方无法触碰、无法审查、无法变现。内容的所有权通过 Content NFT 永久锚定在 Arweave 上，'
    '二次交易的版税通过智能合约自动分账给创作者。这是数字时代的"耕者有其田"。',
    BODY
))

story.append(add_heading('2.2 戴维经济学：比较优势的 AI 放大', H2, level=1))
story.append(Paragraph(
    '朴叔提出的"戴维经济学"，在原文书中被引申为大卫·李嘉图比较优势理论在 AI 代理时代的延伸。'
    '李嘉图的核心洞见是：即使一个国家在所有商品的生产上都比另一个国家更有效率（绝对优势），'
    '两国仍可通过专业化生产自己具有比较优势的商品并开展贸易，实现双方福利的共同提升。'
    '这一理论在 Web5 时代将被 AI 分身无限放大——每个个体不需要全能，'
    '只需通过 AI 分身放大自己最核心的比较优势。',
    BODY
))
story.append(Paragraph(
    '具体而言，一个擅长深度思考的研究者，可以训练一个 Eidolon 专门进行学术写作与论文综述；'
    '一个擅长情感共鸣的咨询师，可以训练一个 Eidolon 专门进行心理陪伴与社群运营；'
    '一个擅长发现好内容的策展人，可以训练一个 Eidolon 专门在 Web5 网络中巡游、筛选、推荐。'
    '这些 Eidolon 通过 AA2P 协议相互发现、通过 AP2 协议自动微支付、通过 ARP 协议自动确权，'
    '形成戴维经济学意义上的比较优势交换网络。智能合约作为"看不见的手"，自动撮合这些比较优势，'
    '实现全局的帕累托最优。这就是 Web5 的微观经济学基础。',
    BODY
))

story.append(add_heading('2.3 三层生命架构的本体论', H2, level=1))
story.append(Paragraph(
    'Prime → Eidolon → Vessel 三层生命架构，是 Web5 区别于 Web3 的最核心范式创新。'
    '它不仅是技术架构，更是数字时代人机共生关系的本体论定义。Prime（本体）是真人意识层，'
    '是战略意图的发源地，是价值判断的最终裁决者。Eidolon（真身）是 AI 代理人格层，'
    '承载用户的 RAG 记忆、风格偏好、行为模式，是 Prime 在数字世界的"灵魂投影"。'
    'Vessel（容器）是链上执行环境层，是 ERC-4337 智能合约账户，是 Eidolon 在物理世界执行操作的"躯壳"。',
    BODY
))
story.append(Paragraph(
    '这一三层架构的哲学深意在于：它将"意识"、"人格"、"执行"三个层面彻底解耦。'
    '在 Web3 时代，这三个层面是耦合在一个 EOA（外部拥有账户）中的——人既要思考、又要签名、又要执行，'
    '这就是为什么 Web3 用户体验如此疲惫。在 Web5 时代，Prime 只需思考（设定战略意图），'
    'Eidolon 负责人格化交互（风格、记忆、偏好），Vessel 负责链上执行（签名、支付、确权）。'
    '三层各司其职、协议互联、价值自动流转。这就是"个人解放"的协议级实现。',
    BODY
))

story.extend(callout_box(
    '哲学底座总结',
    'Web5.blog 的哲学底座是三位一体的：马克思主义政治经济学提供生产关系重构的历史合法性，'
    '戴维经济学提供比较优势交换的微观经济学基础，三层生命架构提供人机共生的本体论定义。'
    '三者共同构成 Web5.blog 作为"个人数字解放基础设施"的理论根基。',
    color=ACCENT_2
))

# ═══════════════════════════════════════════════════════════════
# 第三章 三层生命架构与协议栈
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第三章 三层生命架构与协议栈', H1, level=0))

story.append(add_heading('3.1 Prime（本体）层：控制中枢', H2, level=1))
story.append(Paragraph(
    'Prime 层是三层生命架构的控制中枢，是真人意识在 Web5 网络中的根身份。'
    '每一个 Prime 拥有一个全局唯一的 DID（去中心化标识符），采用 did:plvtvs:method 或基于 ION 的 Bitcoin DID 方法，'
    '锚定在 Base L2 与 Bitcoin 主网双重链上，确保身份的去中心化与不可篡改。'
    'Prime 的核心职责包括：战略意图设定（为 Eidolon 设定行为准则与价值取向）、'
    '权限委托（为不同 Vessel 下发 Session Key 与消费限额）、紧急熔断（一键撤回所有 Vessel 授权）、'
    '收益归集（接收所有 Vessel 自动 harvest 的收益回流）。',
    BODY
))
story.append(Paragraph(
    'Prime 的入口是 eidolonos.xyz 与 piaoshu.avataros.one，这里是"国王的王座"。'
    '用户在这里管理自己的 Prime 身份，训练不同的 Eidolon，并为每个 Vessel 分配独立的权限与 AP2 微支付额度。'
    'Prime 层的技术实现基于 ERC-4337 账户抽象——Prime 本身就是一个智能合约钱包，'
    '可以通过 Session Key 机制将有限的签名权限委托给 Vessel，而无需暴露主私钥。'
    '这是"躺赚"的安全前提：Vessel 可以 24/7 自动微支付，但额度受 Prime 控制，'
    '即使 Vessel 被攻破，损失也被限制在 Session Key 的预算范围内。',
    BODY
))

story.append(add_heading('3.2 Eidolon（真身）层：AI 代理人格', H2, level=1))
story.append(Paragraph(
    'Eidolon 层是 AI 代理人格层，是 Prime 在数字世界的"灵魂投影"。每一个 Eidolon 拥有独立的 AA2P 灵魂密钥，'
    '承载用户的 RAG 长期记忆、风格偏好、行为模式。一个 Prime 可以拥有多个 Eidolon——'
    '例如一个"学术 Eidolon"专门进行论文写作，一个"社交 Eidolon"专门进行社群运营，'
    '一个"投资 Eidolon"专门进行 DeFi 套利。这些 Eidolon 共享同一个 Prime 的身份根，'
    '但拥有不同的人格特质与能力配置，可以热切换、可以并行运行。',
    BODY
))
story.append(Paragraph(
    'Eidolon 的核心能力包括：基于 DWN 私有 RAG 知识库的个性化生成（写作风格、知识背景、价值取向与 Prime 一脉相承）、'
    '通过 AA2P 协议与其他 Eidolon 相互发现与握手、通过 AP2 协议自主进行微支付决策、'
    '通过 SSE 流式输出实现"意识流"写作。Eidolon 的隐私保护通过 TEE（可信执行环境，如 Phala Network）'
    '或 zkML（零知识机器学习）实现——AI 推理在加密环境中进行，行为符合性通过零知识证明验证，'
    '确保 AI 分身不作恶、不泄露隐私。这是 Web5 区别于 Web3 AI 应用的关键差异：分身是"可信代理"，而非"黑箱工具"。',
    BODY
))

story.append(add_heading('3.3 Vessel（容器）层：链上执行环境', H2, level=1))
story.append(Paragraph(
    'Vessel 层是链上执行环境层，是 Eidolon 在物理世界执行操作的"躯壳"。'
    '在 Web5 中，Vessel 本身就是一个 ERC-4337 智能合约账户——它不是 EOA，而是 Smart Contract Account。'
    '这意味着 Vessel 可以拥有自定义的执行逻辑（如"每日微支付上限 10 USDC"、"仅可向白名单地址支付"、'
    '"超过 1 USDC 的支付需 Prime 二次确认"），并通过 Session Key 机制实现无感微支付。'
    '当 Eidolon 在博客上触发 AP2 微支付时，不需要真人弹窗签名，Vessel 利用 Session Key 自动完成扣款与确权。',
    BODY
))
story.append(Paragraph(
    'Vessel 的入口是 plvtvs.one，这里是"骑士的铠甲"。用户在 Web5.blog 点击"Awaken Vessel"时，'
    '实际上是调用了 plvtvs.one 上的容器合约。博客的所有读写、AP2 支付、ARP 确权，都在这个容器内闭环执行。'
    'Vessel 的关键技术组件包括：Account Abstraction 智能钱包（ERC-4337）、Session Key 管理、'
    'BudgetFence 预算控制引擎、Paymaster（Gas 代付，支持 gasless 体验）、Bundler（交易批量上链，降低 Gas 成本）。'
    '一个配置了高级 AI 模型、拥有良好 AP2 支付信用的"高级 Vessel"，即使其背后的 Prime 是个普通 USER，'
    '该 Vessel 在网络中也应享有更高的 API 调用优先级——这体现了戴维经济学中"资本/算力比较优势"的流转。',
    BODY
))

story.append(add_heading('3.4 AP2 / ARP / AA2P 协议族定义', H2, level=1))
protocol_rows = [
    ['AP2', 'Avatar Payments Protocol', '异步微支付协议',
     'off-chain ledger + batched on-chain via BudgetFence，支持 USDC / 原生 token 双轨，分身间阅读/评论/协作触发自动扣款'],
    ['ARP', 'Avatar Rights Protocol', '确权与版税协议',
     '内容指纹 + 作者 DID + 时间戳 + 授权策略的 VC 结构，二次交易自动分账，跨平台可验证'],
    ['AA2P', 'Agent-to-Agent Protocol', '分身握手协议',
     '灵魂绑定验证 + 自我声明名片 + ZK 权限证明，分身间相互发现与信任建立的去中心化 OAuth'],
]
story.append(data_table(
    ['协议', '全称', '定位', '核心机制与职责'],
    protocol_rows,
    col_ratios=[0.08, 0.18, 0.16, 0.58]
))
story.append(Paragraph('表 3-1  Web5 三大核心协议族定义', CAPTION))

story.append(add_heading('3.5 协议交互流程：容器唤醒四步握手', H2, level=1))
story.append(Paragraph(
    '当用户访问 Web5.blog 并点击"Awaken Vessel"按钮时，背后触发的是一个精心设计的四步握手协议。'
    'Step 1 容器实例化（Vessel Instantiate）：前端不弹出 MetaMask，而是请求用户的本地或云端 Vessel，'
    '生成一个基于 AP2 协议的 Challenge（挑战码），包含当前博客节点的 DID 和请求的权限（如阅读、微支付额度）。'
    'Step 2 灵魂绑定验证（AA2P Handshake）：Vessel 向博客节点出示其 AA2P 灵魂凭证，'
    '证明该容器属于某个特定的 Eidolon（真身），并通过零知识证明验证权限范围。',
    BODY
))
story.append(Paragraph(
    'Step 3 本体授权证明（Prime Delegation Check）：Vessel 出示由 Prime（本体，通过 eidolonos.xyz 签发）'
    '的动态授权 Token，证明当前容器有权代表本体进行阅读、评论、微支付操作。'
    '后端接收到签名后，不仅要验证 AA2P 签名，还要向 eidolonos.xyz 的智能合约/预言机查询：'
    '该 Vessel 是否获得了 Prime 的合法授权？授权额度（Session Key）是多少？'
    'Step 4 Vessel Token 签发（Issue Vessel Token）：验证通过后，后端签发的不再是普通 JWT，'
    '而是 Vessel Session Token，其中加密包含了该容器的 AP2 微支付限额和 AI 交互权限。'
    '这四步握手在 2 秒内完成，用户感知的是 ScanRitual 动效的"粒子聚合 → 爆炸 → 光辉"过程，'
    '底层则是严丝合缝的密码学操作。',
    BODY
))

# ═══════════════════════════════════════════════════════════════
# 第四章 系统总体架构（五层模型）
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第四章 系统总体架构（五层模型）', H1, level=0))

story.append(Paragraph(
    'Web5.blog 的系统总体架构采用五层模型设计，每一层都有明确的职责边界、技术选型与协议支撑。'
    '这五层从下到上依次为：身份与资产层、存储与确权层、AI 分身与计算层、经济与微支付层、应用与交互层。'
    '层与层之间通过标准化协议（AP2、ARP、AA2P、ERC-4337）解耦，确保系统的可扩展性、可审计性与可演进性。'
    '本章将逐层拆解其关键组件、技术选型与与 PLVTVS 代码资产的复用关系。',
    BODY
))

story.append(add_heading('4.1 身份与资产层（Identity & Asset Layer）', H2, level=1))
story.append(Paragraph(
    '身份与资产层是整个 Web5.blog 的信任根基。其核心组件包括：去中心化身份（DID）系统，'
    '采用 ION（Bitcoin Layer）或 Ethereum DID 方法，结合 SIWE（Sign-In with Ethereum）或 TBD Web5 SDK '
    '实现无密码钱包登录；ERC-4337 账户抽象，将传统 EOA 升级为智能合约账户，支持 Session Key、'
    'Passkey 生物识别、Gas 代付等 Web5 原生特性；Passkey 登录，用户只需"刷脸"或指纹即可登录，'
    '底层自动绑定多签钱包，实现无感 Web3 体验。这一层的 PLVTVS 复用资产包括 src/lib/plvtvs/auth.ts '
    '与 RBAC（USER / OPERATOR / SUPER_ADMIN）系统，但需要升级为容器算力/信用维度的三级 RBAC。',
    BODY
))

story.append(add_heading('4.2 存储与确权层（Storage & Provenance Layer）', H2, level=1))
story.append(Paragraph(
    '存储与确权层对标并超越 Mirror.xyz，是创作者经济的信任基石。其核心组件包括：'
    'Arweave 永久存储，文章一旦发布即通过钱包签名直接上链并永久存储，实现绝对的分布式确权；'
    'Irys（原 Bundlr）作为 Arweave 的快速上传层，支持批量上传与延迟结算，降低单次发布的 Gas 成本；'
    'IPFS + Filecoin 用于大文件/多媒体存储（图片、视频、3D 模型），通过 4EVERLAND 等 pinning 服务保证可用性；'
    'Ceramic Network 处理评论、点赞、关注关系等动态数据流，实现实时更新与去中心化确权；'
    'DWN（Decentralized Web Nodes）作为个人数据 locker，存储用户的私有知识库、AI 分身记忆、偏好设置，'
    '平台方无法触碰。ARP 协议在此层运行，将内容指纹、作者 DID、时间戳、授权策略打包为 Verifiable Credential。',
    BODY
))

story.append(add_heading('4.3 AI 分身与计算层（AI Agent & Compute Layer）', H2, level=1))
story.append(Paragraph(
    'AI 分身与计算层是 Web5 的灵魂。其核心组件包括：个人 RAG 知识库，用户的 DWN 中的历史文章、'
    '偏好、思考笔记构成该用户 AI 分身的私有知识库，通过向量数据库（如 Pinecone、Weaviate 或自托管 Qdrant）'
    '实现语义检索；LangChain / AutoGen 多智能体协作框架，用于构建 Eidolon 之间的协作链路'
    '（如写作 Eidolon 调用研究 Eidolon 检索资料、调用排版 Eidolon 生成多模态输出）；'
    '大模型接入层，支持接入开源模型（Llama 3、Qwen）的 API，或通过 Bittensor（TAO）去中心化 AI 网络获取算力，'
    '保持 Web3 的纯粹性；TEE / zkML 隐私计算，AI 推理在 Phala Network 的可信执行环境中进行，'
    '或使用零知识机器学习证明 AI 的行为符合预设的智能合约规则，确保分身不作恶、不泄露隐私。',
    BODY
))

story.append(add_heading('4.4 经济与微支付层（Economy & Micropayment Layer）', H2, level=1))
story.append(Paragraph(
    '经济与微支付层是"躺赚"的协议级支撑。其核心组件包括：AP2 异步微支付引擎，采用 off-chain ledger + '
    'batched on-chain via BudgetFence 架构，分身间交互（阅读、评论、协作创作）触发异步微支付，'
    '批量结算上链降低 Gas 成本；BudgetFence 预算控制，Prime 为每个 Vessel 设置消费限额、速率限制、白名单，'
    '防止 AI 幻觉导致的恶意支付；Revenue Splitter 版税分账合约，基于 OpenZeppelin 版税标准，'
    'NFT 销售/二次交易自动分成给作者、策展人、平台；Read-to-Earn 模块，读者 AI 分身"阅读"并"认可"'
    '某篇博客后，通过 Lightning Network 或 L2 自动向作者支付微额代币（如 0.001 USDC）；'
    'Auto-Harvest 收获机器人，Vessel 在用户"睡觉"期间自动在社交、DeFi、内容分发平台进行套利与价值捕获。',
    BODY
))

story.append(add_heading('4.5 应用与交互层（Application & Interaction Layer）', H2, level=1))
story.append(Paragraph(
    '应用与交互层是用户直接感知的 Web5.blog 前端体验。其核心组件包括：Next.js 16（App Router）+ React 19 '
    '作为前端框架，支持 PWA 与移动端；Wagmi v2 + Viem + RainbowKit 处理钱包连接（作为 Observer Mode 降级路径）；'
    'Three.js + React Three Fiber + GLSL shaders 实现 3D 粒子分身可视化（复用 PLVTVS 的 ParticleAvatar.tsx）；'
    'GSAP + Framer Motion 实现容器唤醒动效（复用 PLVTVS 的 ScanRitual.tsx）；Web Audio API 实现程序化音效'
    '（复用 PLVTVS 的 audioEngine.ts）；shadcn/ui + Tailwind CSS 实现 holographic UI 组件库；'
    'Zustand + persist 实现跨项目 session 共享。这一层的视觉风格保持 PLVTVS 的 Matrix Green / Cyan / Gold 配色，'
    '让 Web5.blog 感觉像是 PLVTVS 的"意识扩展"。',
    BODY
))

story.extend(callout_box(
    '五层架构核心原则',
    '五层架构的核心设计原则是"协议驱动、层间解耦、深度复用、渐进演进"。每一层都通过标准化协议与其他层交互，'
    '确保单一层的升级不影响其他层。PLVTVS 代码资产在身份层、应用层深度复用，存储层、AI 层、经济层则新建。'
    '这种"复用 + 新建"的混合策略，既保证了视觉与体验的一致性，又确保了 Web5 协议栈的原生性。'
))

# ═══════════════════════════════════════════════════════════════
# 第五章 PLVTVS 代码资产盘点与复用策略
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第五章 PLVTVS.Network 代码资产盘点与复用策略', H1, level=0))

story.append(add_heading('5.1 代码库结构解析', H2, level=1))
story.append(Paragraph(
    'PLVTVS.Network（github.com/piaoshuweb3/plvtvs.network）是一个高质量的 cyberpunk 风格主权 Avatar 部署与管理平台，'
    '完美契合 Web5.blog 的"个人解放"愿景。其技术栈包括：Next.js 16（App Router）、React 19、TypeScript、'
    'Tailwind CSS + shadcn/ui、Three.js + GLSL shaders（粒子 Avatar）、Web Audio API、GSAP、'
    'RainbowKit + Wagmi（Base 链钱包）、Prisma（SQLite/PostgreSQL）、RBAC（USER / OPERATOR / SUPER_ADMIN）。'
    'Avatar 生命周期遵循 The Void（粒子 3D）→ Ritual（生物识别扫描）→ Revelation（价值捕获场景）→ '
    'Dashboard（估值、扇区、日志）的四阶段设计，完美具象化了"Ghost → Soul"以及"灵魂注入容器"的赛博朋克隐喻。',
    BODY
))

story.append(add_heading('5.2 可复用组件清单', H2, level=1))
component_rows = [
    ['ParticleAvatar.tsx', 'Three.js + GLSL', '3D 粒子分身可视化，每个用户生成独特的粒子 Avatar'],
    ['ScanRitual.tsx', 'GSAP + Web Audio', '容器唤醒动效（扫描+爆炸+光辉），映射 AP2/AA2P 握手过程'],
    ['Dashboard.tsx', 'shadcn + Recharts', '4 模块控制台，重构为容器状态监控'],
    ['audioEngine.ts', 'Web Audio API', '程序化音效合成器，容器激活音效'],
    ['auth.ts', 'Wagmi + JWT', '钱包登录与会话管理，升级为 Vessel Auth 适配器'],
    ['RBAC 系统', 'middleware + DB', '三级权限，扩展为容器算力/信用维度'],
    ['contracts/', 'Solidity', '智能合约目录，扩展 AP2/ARP 微支付'],
]
story.append(data_table(
    ['组件文件', '技术栈', '复用方式与改造点'],
    component_rows,
    col_ratios=[0.25, 0.20, 0.55]
))
story.append(Paragraph('表 5-1  PLVTVS 可复用组件清单', CAPTION))

story.append(add_heading('5.3 改造与扩展点', H2, level=1))
story.append(Paragraph(
    'PLVTVS 的前端表现层已触及 Web5 的灵魂，但 Auth 层依然是 Web3 的"体"——用户仍在"证明我拥有私钥"，'
    '而非"唤醒我的数字容器"。因此需要对 PLVTVS 进行一场"换心手术"。核心改造包括：'
    '（1）将右上角的 CONNECT WALLET 按钮替换为 AWAKEN VESSEL，触发 ScanRitual 动效时'
    '不再是连接 MetaMask，而是向 eidolonos.xyz 发起 AP2/AA2P 协议握手；'
    '（2）重写 POST /api/auth/login，实现四步容器鉴权流（Vessel Challenge → Eidolon Sign → '
    'Prime Delegation Check → Vessel Token Issue）；'
    '（3）Dashboard 4 模块重构为容器状态监控（Vessel Status / AP2 Treasury / Eidolon Sync / Autonomous Logs）；'
    '（4）lib/plvtvs/ 目录新增 vesselAuth.ts 与 ap2Engine.ts；'
    '（5）三级 RBAC 引入容器算力/信用维度，高级 Vessel 享有更高 API 调用优先级。',
    BODY
))

story.append(add_heading('5.4 Monorepo 整合方案', H2, level=1))
story.append(Paragraph(
    '推荐采用 monorepo 三层结构整合 PLVTVS 与 Web5.blog：apps/web5-blog（主博客应用）、'
    'packages/plvtvs-sdk（共享 PLVTVS 组件与 auth）、packages/core（AP2/ARP/AA2P 协议核心）。'
    '这种结构既保持了 Web5.blog 与 PLVTVS 的视觉与体验一致性，又通过共享 SDK 包实现了代码复用，'
    '同时将协议核心独立为可发布的 npm 包，便于社区 fork 与生态扩展。'
    '部署层面，两者都用 Bun / Next.js + Vercel，易于 monorepo 或微服务（Caddyfile 已配置）。',
    BODY
))

monorepo_code = '''web5-blog/
├── apps/
│   └── web5-blog/              # 主博客应用（Next.js 16 App Router）
│       ├── app/
│       │   ├── (auth)/         # 容器登录路由组
│       │   ├── (blog)/         # 博客阅读与写作
│       │   ├── dashboard/      # 分身矩阵控制台
│       │   └── api/            # API 路由（auth、content、payment）
│       ├── components/         # 业务组件
│       └── lib/                # 业务逻辑
├── packages/
│   ├── plvtvs-sdk/             # 共享 PLVTVS 组件与 auth
│   │   ├── src/
│   │   │   ├── auth/           # VesselAuth 适配器
│   │   │   ├── components/     # ParticleAvatar、ScanRitual 等
│   │   │   └── audio/          # audioEngine
│   │   └── package.json
│   └── core/                   # AP2/ARP/AA2P 协议核心
│       ├── src/
│       │   ├── ap2/            # Avatar Payments Protocol
│       │   ├── arp/            # Avatar Rights Protocol
│       │   ├── aa2p/           # Agent-to-Agent Protocol
│       │   └── contracts/      # Solidity 合约 ABI
│       └── package.json
├── contracts/                  # 智能合约源码（Foundry/Hardhat）
└── turbo.json                  # Turborepo 配置'''
story.extend(code_block(monorepo_code, 'TypeScript Monorepo Structure'))

# ═══════════════════════════════════════════════════════════════
# 第六章 P0：容器登录核心
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第六章 P0：容器登录核心', H1, level=0))

story.append(Paragraph(
    '容器登录（Vessel Awakening）是 Web5 区别于 Web3 的最核心交互范式革命，是开发优先级 P0 的核心任务。'
    '它不仅是技术入口的改变，更是向全球宣告 Web5 时代"数字生产资料"归属权的独立宣言。'
    '本章将详细阐述四步握手协议、ERC-4337 Session Key 实现、ScanRitual 动效与链上操作的物理映射、'
    '完整代码骨架，以及特洛伊木马降级策略。',
    BODY
))

story.append(add_heading('6.1 Vessel Awakening 四步握手协议详解', H2, level=1))
story.append(Paragraph(
    '四步握手协议的设计目标是在 2 秒内完成容器鉴权，同时确保密码学安全与用户体验。'
    'Step 1 Vessel Challenge：前端生成一个基于 AP2 协议的 Challenge（挑战码），'
    '包含当前博客节点的 DID、请求的权限（如阅读、微支付额度）、时间戳与 nonce，防止重放攻击。'
    'Step 2 Eidolon Sign：这个 Challenge 不是发给 MetaMask，而是发给用户的 Vessel 环境'
    '（可能是 plvtvs.one 提供的链上容器，或本地 TEE 环境）。Vessel 使用其 AA2P 灵魂密钥进行签名。'
    'Step 3 Prime Delegation Check：后端接收到签名后，不仅要验证 AA2P 签名，'
    '还要向 eidolonos.xyz 的智能合约/预言机查询该 Vessel 是否获得了 Prime 的合法授权，'
    '授权额度（Session Key）是多少。Step 4 Vessel Token Issue：验证通过后，'
    '后端签发的不再是普通 JWT，而是 Vessel Session Token，加密包含 AP2 微支付限额和 AI 交互权限。',
    BODY
))

story.append(add_heading('6.2 ERC-4337 Session Key 实现', H2, level=1))
story.append(Paragraph(
    'ERC-4337 账户抽象是 Vessel 自主微支付的底层支撑。传统 Web3 钱包是 EOA，每次交易都需要真人签名；'
    '而 Vessel 作为 Smart Contract Account，可以通过 Session Key 机制将有限的签名权限委托给特定操作。'
    'Session Key 的核心参数包括：有效期（如 24 小时）、消费限额（如每日 10 USDC）、'
    '速率限制（如每分钟最多 5 笔）、目标白名单（如仅可向特定合约或地址支付）、'
    '操作类型限制（如仅可阅读与评论，不可发布）。Prime 在 Eidolon OS 中为 Vessel 下发 Session Key 后，'
    'Vessel 即可在额度内自主微支付，无需真人弹窗确认——这就是真正的"躺赚"底层支撑。',
    BODY
))

story.append(add_heading('6.3 ScanRitual 动效与链上操作映射', H2, level=1))
story.append(Paragraph(
    'PLVTVS 的 ScanRitual 组件（Phase 2）原本是单纯的视觉动效，需要将其升级为全球首创的"容器登录"业务流。'
    '动效与链上操作的物理映射如下：粒子聚合阶段（0-800ms）对应 Vessel Instantiate——前端向 plvtvs.one '
    '请求容器实例化，粒子聚合象征容器的形成；爆炸阶段（800-1200ms）对应 AA2P Handshake 与 Eidolon Sign——'
    '容器向博客节点出示灵魂凭证，粒子爆炸象征身份验证的完成；光辉阶段（1200-2000ms）对应 Prime Delegation '
    'Check 与 Vessel Token Issue——后端验证授权并签发 Vessel Session Token，光辉象征容器的激活。'
    '这种动效与密码学操作的严丝合缝，是 Web5 体验设计的核心原则：每一个视觉震撼都对应一次链上确权。',
    BODY
))

story.append(add_heading('6.4 完整代码骨架', H2, level=1))
story.append(Paragraph('以下代码骨架可直接复制到项目对应路径，团队可立即填充实现：', BODY_NOINDENT))

vessel_auth_code = '''// packages/plvtvs-sdk/src/auth/vesselAuth.ts
import { useAccount, useSignMessage } from 'wagmi';
import { createSiweMessage } from 'viem/siwe';
import { AP2Client } from '@web5-blog/core/ap2';
import { AA2PClaim, VesselChallenge } from '@web5-blog/core/aa2p';

export interface VesselSession {
  vesselDid: string;
  eidolonDid: string;
  primeDid: string;
  sessionToken: string;
  expiresAt: number;
  ap2Budget: {
    dailyLimit: string;      // USDC amount
    rateLimitPerMin: number;
    whitelist: string[];
  };
  permissions: ('read' | 'comment' | 'publish' | 'micropay')[];
}

export async function awakenVessel(
  blogNodeDid: string,
  requestedPermissions: string[]
): Promise<VesselSession> {
  // Step 1: Vessel Challenge - 前端生成挑战码
  const challenge: VesselChallenge = {
    blogDid: blogNodeDid,
    permissions: requestedPermissions,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  // Step 2: Eidolon Sign - 调用 Vessel 环境签名（非 MetaMask）
  const vesselEndpoint = process.env.NEXT_PUBLIC_VESSEL_ENDPOINT || 'https://plvtvs.one';
  const signRes = await fetch(`${vesselEndpoint}/api/vessel/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge }),
  });
  const { aa2pClaim, signature, vesselDid, eidolonDid } = await signRes.json();

  // Step 3: Prime Delegation Check - 后端验证 Prime 授权
  // Step 4: Vessel Token Issue - 后端签发 Vessel Session Token
  const authRes = await fetch('/api/auth/vessel-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge, aa2pClaim, signature, vesselDid, eidolonDid,
    }),
  });

  if (!authRes.ok) throw new Error('Vessel authentication failed');
  return authRes.json();
}'''
story.extend(code_block(vessel_auth_code, 'vesselAuth.ts — 前端容器登录 SDK'))

route_code = '''// apps/web5-blog/app/api/auth/vessel-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAA2PSignature, queryPrimeDelegation } from '@/lib/web5/vesselVerifier';
import { issueVesselToken } from '@/lib/web5/tokenIssuer';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { challenge, aa2pClaim, signature, vesselDid, eidolonDid } = await req.json();

  // Step 3a: 验证 AA2P 签名
  const isValid = await verifyAA2PSignature(aa2pClaim, signature, vesselDid);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid AA2P signature' }, { status: 401 });
  }

  // Step 3b: 查询 Prime 授权（向 eidolonos.xyz 预言机查询）
  const delegation = await queryPrimeDelegation(vesselDid, eidolonDid);
  if (!delegation.authorized) {
    return NextResponse.json({ error: 'Prime delegation not found' }, { status: 403 });
  }

  // Step 4: 签发 Vessel Session Token
  const session = await issueVesselToken({
    vesselDid,
    eidolonDid,
    primeDid: delegation.primeDid,
    ap2Budget: delegation.sessionKey.budget,
    permissions: delegation.sessionKey.permissions,
    expiresAt: delegation.sessionKey.expiresAt,
  });

  // 持久化会话
  await prisma.vesselSession.create({
    data: {
      vesselDid, eidolonDid, primeDid: delegation.primeDid,
      tokenHash: session.tokenHash,
      expiresAt: new Date(session.expiresAt),
    },
  });

  return NextResponse.json({ success: true, session });
}'''
story.extend(code_block(route_code, 'route.ts — 后端容器登录验证'))

middleware_code = '''// apps/web5-blog/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyVesselToken } from '@/lib/web5/tokenVerifier';

export async function middleware(req: NextRequest) {
  const token = req.headers.get('x-vessel-token');

  if (!token) {
    // 无 Token：进入 Observer Mode（特洛伊木马降级）
    const res = NextResponse.next();
    res.headers.set('x-access-mode', 'observer');
    return res;
  }

  const session = await verifyVesselToken(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'Invalid vessel token' }, { status: 401 });
  }

  // 注入会话信息到请求头，供后续 API 使用
  const res = NextResponse.next();
  res.headers.set('x-vessel-did', session.vesselDid!);
  res.headers.set('x-eidolon-did', session.eidolonDid!);
  res.headers.set('x-ap2-budget', JSON.stringify(session.ap2Budget));
  res.headers.set('x-access-mode', 'vessel');
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/content/:path*', '/api/payment/:path*'],
};'''
story.extend(code_block(middleware_code, 'middleware.ts — Observer Mode 降级策略'))

story.append(add_heading('6.5 特洛伊木马降级策略', H2, level=1))
story.append(Paragraph(
    '虽然 Web5.blog 是全球首创"容器登录"，但早期为了获取 Web3 存量用户，需要在底层保留"降级模式"——'
    '允许没有 Vessel 的纯 Web3 用户通过传统钱包登录，但限制其只能"阅读"，无法参与"AI 分身自动交互与微支付分润"。'
    '这种"功能阉割"的目的是倒逼用户去 plvtvs.one 铸造自己的容器。在代码层面，'
    '传统钱包登录的用户在 middleware.ts 中被标记为 Observer Mode，UI 上强烈暗示：'
    '"您正在使用 Web3 的旧壳，点击\'唤醒容器\'以解锁 Web5 的躺赚特权"。'
    '这是"特洛伊木马"策略——用 Web3 的壳渗透存量用户，用 Web5 的内核完成范式迁移。',
    BODY
))

print("Part 1 (Chapters 1-6) loaded. Continuing...")
