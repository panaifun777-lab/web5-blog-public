# -*- coding: utf-8 -*-
"""Part 3: Chapters 13-16 + 结语 + Build script"""
import os, sys, hashlib
sys.path.insert(0, '/home/z/my-project/scripts')
from gen_pdf_part1_setup import *

# ═══════════════════════════════════════════════════════════════
# 第十三章 30/60/90 天冲刺路线图
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十三章 30/60/90 天冲刺路线图', H1, level=0))

story.append(Paragraph(
    'Web5.blog 的落地采用 30/60/90 天三阶段冲刺路线图，每阶段聚焦明确的交付物与 KPI。'
    '这一节奏既保证了快速验证（30 天 MVP），又为协议级深化（60 天 Beta）与商业化放大（90 天公测）'
    '预留了充分时间。本章详细拆解每阶段的交付物清单、KPI 指标与关键风险点。',
    BODY
))

story.append(add_heading('13.1 Day 0-30：MVP（容器登录 + Arweave + 基础 AI 写作）', H2, level=1))
story.append(Paragraph(
    'MVP 阶段的核心目标是验证"容器登录"范式的可行性与用户体验。技术交付物包括：'
    'VesselAuth 合约部署至 Base Sepolia 测试网（含 AA2P 握手、Session Key 下发、BudgetFence 基础版）；'
    'Web5.blog 主站上线 Vercel（容器登录入口 + Observer Mode 降级 + 基础博客阅读/写作）；'
    'PLVTVS SDK 包发布至 npm（ParticleAvatar + ScanRitual + auth 适配器）；'
    'Arweave 永久存储集成（Irys 批量上传 + Content NFT 铸造）；'
    '基础 AI 写作（SSE 流式 + 单模态文本输出 + 风格画像初版）。'
    '内容交付物：5 篇种子文章（Web5 宣言、技术蓝图、经济学内核、案例、教程），每篇 mint 为 NFT 演示系统。',
    BODY
))

mvp_kpi_rows = [
    ['测试网容器激活数', '100+ Vessel', '验证容器登录的可用性与用户接受度'],
    ['种子内容发布数', '50+ 篇', '验证 Arweave + NFT 铸造流程'],
    ['AI 写作调用量', '500+ 次', '验证 SSE 流式 + RAG 检索链路'],
    ['Observer Mode 转化率', '15%+', '从 Web3 钱包登录转化为容器激活的比例'],
    ['平均容器登录耗时', '< 3 秒', '四步握手 + ScanRitual 动效的总时长'],
]
story.append(data_table(
    ['KPI 指标', '目标值', '验证目的'],
    mvp_kpi_rows,
    col_ratios=[0.30, 0.20, 0.50]
))
story.append(Paragraph('表 13-1  MVP 阶段（Day 0-30）KPI', CAPTION))

story.append(add_heading('13.2 Day 31-60：Beta（AP2 微支付 + 矩阵控制台 + Read-to-Earn）', H2, level=1))
story.append(Paragraph(
    'Beta 阶段的核心目标是验证"躺赚"经济闭环。技术交付物包括：'
    'AP2 合约主网部署（Base L2，含 BudgetFence 完整版 + 批量结算 + 挑战期机制），'
    '并完成 OpenZeppelin 安全审计；4 模块 Dashboard 上线'
    '（Vessel Status + AP2 Treasury + Eidolon Sync + Autonomous Logs）；'
    'Read-to-Earn 模块上线（AI 分身语义评分 + 自动微支付）；'
    '推荐分润合约部署（戴维经济学场景一）；多模态输出（播客脚本 + 推文摘要）。'
    '运营交付物：100 个种子 Vessel（邀请制，覆盖 Web3 KOL + AI 研究者 + 内容创作者）；'
    '第一份"分身自治周报"（展示 100 个 Vessel 在一周内的自动交互与收益数据）。',
    BODY
))

beta_kpi_rows = [
    ['主网容器激活数', '500+ Vessel', '从测试网到主网的真实采用'],
    ['AP2 微支付笔数', '5000+ 笔/月', '验证异步微支付架构的吞吐量'],
    ['AP2 微支付总额', '$500+/月', '验证微支付的实际经济价值'],
    ['Read-to-Earn 触发率', '30%+ 阅读量', 'AI 分身认可并支付的比例'],
    ['月活 Vessel（MAV）', '200+', 'Vessel 在 30 天内至少触发一次交互'],
    ['平均躺赚收益/Vessel', '$1-5/月', '验证"躺赚"的实际金额（虽小但真实）'],
]
story.append(data_table(
    ['KPI 指标', '目标值', '验证目的'],
    beta_kpi_rows,
    col_ratios=[0.28, 0.22, 0.50]
))
story.append(Paragraph('表 13-2  Beta 阶段（Day 31-60）KPI', CAPTION))

story.append(add_heading('13.3 Day 61-90：公测（白标 + 域名 + 订阅）', H2, level=1))
story.append(Paragraph(
    '公测阶段的核心目标是验证商业化放大能力。技术交付物包括：'
    'web5-deploy CLI 工具发布（npx web5-deploy@latest --brand=xxx 一键部署）；'
    'Web5 域名合约部署（Base L2，含注册、续费、转让、子域名、拍卖机制）；'
    '多租户架构上线（Clerk + PostgreSQL RLS）；'
    '订阅计费系统集成（Stripe 法币 + Crypto 双支付，支持 USDC、ETH）；'
    'Affiliate Program 合约（邀请码 25% 终身分成）。'
    '商业交付物：10 个 White-label 合作伙伴（KOL + Web3 项目 + 品牌）；'
    '首批 Premium 域名拍卖（web5.blog、piaoshu.web5、liberation.web5 等）；'
    'Pro 订阅正式开放，目标首月 100+ Pro 用户 = $3k MRR。',
    BODY
))

ga_kpi_rows = [
    ['Pro 付费用户', '100+', '验证订阅转化与产品-市场契合'],
    ['White-label 合作伙伴', '10+', '验证分发策略与 License 模型'],
    ['域名注册数', '500+', '验证域名经济的需求侧'],
    ['MRR（月经常性收入）', '$5k+', '订阅 + License + 域名总收入'],
    ['生态 TVL', '$50k+', 'AP2 微支付池 + 域名质押 + NFT 价值'],
    ['DAU（日活用户）', '500+', '包含 Prime 真人与 Vessel 分身'],
]
story.append(data_table(
    ['KPI 指标', '目标值', '验证目的'],
    ga_kpi_rows,
    col_ratios=[0.28, 0.22, 0.50]
))
story.append(Paragraph('表 13-3  公测阶段（Day 61-90）KPI', CAPTION))

# ═══════════════════════════════════════════════════════════════
# 第十四章 技术风险矩阵
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十四章 技术风险矩阵', H1, level=0))

story.append(Paragraph(
    'Web5.blog 作为全球首创的分身原生博客平台，其技术栈涉及账户抽象、AI 推理、'
    '去中心化存储、微支付等多个前沿领域，技术风险不容忽视。本章系统梳理五大技术风险，'
    '并给出影响、概率、缓解、监控、应急五维评估。',
    BODY
))

risk_rows = [
    ['ERC-4337 安全', '4', '3', '12',
     'Session Key 被盗、Bundler 单点故障、Paymaster 资金池风险',
     '多签 Session Key + 时间锁 + 链上白名单 + 去中心化 Bundler 网络',
     '实时监控异常 Session Key 使用 + 链上告警'],
    ['AP2 私钥隔离', '5', '2', '10',
     '前端/后端/Vessel 三层密钥管理边界模糊导致私钥泄露',
     'Vessel 私钥仅存 TEE + 后端仅持 AA2P 公钥 + 前端零私钥架构',
     '定期密钥轮换 + TEE 远程证明审计'],
    ['AI 幻觉与越权', '4', '4', '16',
     '分身恶意支付/恶意评论/越权操作（如发布未授权内容）',
     'TDPO 认知防火墙 + BudgetFence 预算硬约束 + Prime 二次确认机制',
     'AI 行为日志全量记录 + 异常模式检测 + 一键撤回'],
    ['zkML 性能', '3', '3', '9',
     '零知识证明生成延迟高（>10s）与 gas 成本高（>$1/proof）',
     '仅对高风险操作启用 zkML + 证明缓存 + EZKL 优化电路',
     '证明生成时间监控 + 链上 gas 成本告警'],
    ['Arweave 成本', '3', '2', '6',
     'AR 价格波动导致永久存储成本不可预测 + 单次付费门槛高',
     'Irys 延迟结算 + USDC 计价 + 平台补贴早期用户',
     'AR 价格对冲 + 存储成本预算池'],
]
story.append(data_table(
    ['风险项', '影响(1-5)', '概率(1-5)', '风险值', '风险描述', '缓解方案', '监控与应急'],
    risk_rows,
    col_ratios=[0.10, 0.06, 0.06, 0.06, 0.22, 0.25, 0.25]
))
story.append(Paragraph('表 14-1  Web5.blog 五大技术风险矩阵（风险值 = 影响 × 概率）', CAPTION))

story.append(Paragraph(
    '从风险矩阵可见，AI 幻觉与越权（风险值 16）是最高优先级风险，需在 MVP 阶段即部署 TDPO 认知防火墙。'
    'ERC-4337 安全（风险值 12）与 AP2 私钥隔离（风险值 10）紧随其后，'
    '需在合约部署前完成 OpenZeppelin 审计与 Trail of Bits 第三方审计。'
    'zkML 性能（风险值 9）与 Arweave 成本（风险值 6）属于中期可优化风险，'
    '可在 Beta 阶段通过技术迭代与经济模型调整缓解。',
    BODY
))

# ═══════════════════════════════════════════════════════════════
# 第十五章 合规与监管
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十五章 合规与监管', H1, level=0))

story.append(Paragraph(
    'Web5.blog 作为涉及加密资产、AI 代理、用户数据的全球性平台，合规与监管是不可回避的核心议题。'
    '本章从证券化风险、KYC 策略、数据主权合规、跨国运营四个维度，阐述 Web5.blog 的合规框架。',
    BODY
))

story.append(add_heading('15.1 证券化风险与 Howey 测试', H2, level=1))
story.append(Paragraph(
    'Web5.blog 的 Content NFT、版税分润、推荐分润机制面临美国 SEC Howey 测试的证券化风险。'
    'Howey 测试的四要素是：（1）金钱投资；（2）共同企业；（3）利润预期；（4）他人努力。'
    '如果 Content NFT 被认定为"投资合同"，将触发证券注册要求。规避策略：'
    '强调 Content NFT 的使用权属性（购买的是阅读/收藏权，非投资份额）；'
    '避免利润分享承诺（版税是基于二次交易的自动分账，非利润分红）；'
    '强调创作者努力（内容价值来自创作者，非平台运营）；'
    '限制营销话术（不使用"投资回报"、"年化收益"等证券化表述）。'
    '推荐分润机制需特别谨慎，避免被认定为"拉人头"的传销结构——'
    '分润应基于真实的内容消费，而非单纯的推荐行为。',
    BODY
))

story.append(add_heading('15.2 KYC 策略：分层可选', H2, level=1))
story.append(Paragraph(
    'Web5.blog 采用分层可选 KYC 策略，平衡去中心化理念与监管要求。'
    '阅读层：无需 KYC，钱包或容器登录即可阅读公开内容；'
    '写作层：软 KYC（邮箱验证 + DID 信用评分），允许发布内容但限制频率；'
    '微支付层：硬 KYC（政府 ID + 居住地证明），满足 FATF 旅行规则对超过 $1000 交易的要求；'
    '法币出入金层：完整 KYC + AML（反洗钱）+ CFT（反恐融资），通过集成 MoonPay / Ramp 等合规 on-ramp。'
    '这种分层策略确保：纯 Web3 用户可零 KYC 体验核心功能，而涉及法币与高金额的用户接受完整合规审查。'
    '所有 KYC 数据存储在用户自控的 DWN 中，平台仅持验证凭证，不存储原始证件。',
    BODY
))

story.append(add_heading('15.3 数据主权合规：GDPR 与中国数据法', H2, level=1))
story.append(Paragraph(
    'GDPR 的"被遗忘权"与 Arweave 的"永久存储"存在根本性冲突——一旦上链不可删除。'
    '解决方案：内容哈希上链（不可删除），但内容本身的加密密钥由用户控制；'
    '用户行使被遗忘权时，销毁密钥使内容对所有人不可读（cryptographic erasure），'
    '同时从 Web5.blog 的索引中移除元数据。中国《数据安全法》与《个人信息保护法》要求：'
    '用户数据本地化存储（中国用户数据存储在中国境内的 DWN 节点）；'
    '跨境数据流动需安全评估（Web5.blog 需申报跨境数据传输）；'
    '算法推荐需备案（AI 分身的推荐算法需向网信办备案）。'
    'Web5.blog 的合规策略是：为不同司法管辖区部署独立的 DWN 节点集群，'
    '通过 GeoDNS 路由用户至最近且合规的节点。',
    BODY
))

story.append(add_heading('15.4 跨国运营：主体设立与牌照', H2, level=1))
story.append(Paragraph(
    'Web5.blog 的跨国运营架构推荐：基金会主体设立于瑞士（Crypto Valley Zug），'
    '享受明确的加密友好法规与低税率；运营公司设立于新加坡，作为亚太运营中心；'
    '美国用户通过开曼群岛主体服务，规避 SEC 直接管辖。牌照策略：'
    '美国 MSB（Money Services Business）注册，满足 FinCEN 要求；'
    '欧盟 VASP（Virtual Asset Service Provider）注册，满足 5AMLD/6AMLD；'
    '香港 SFC Type 1（证券交易）申请，应对 Content NFT 的潜在证券化认定。'
    '税务策略：代币交易通过 Swiss Foundation 中性化，'
    '用户层面的税务义务通过集成 CoinTracker / Koinly 自动生成报告。'
    '法币出入金通过持牌支付服务商（MoonPay / Stripe Crypto）实现合规。',
    BODY
))

# ═══════════════════════════════════════════════════════════════
# 第十六章 架构师苏格拉底式追问（开放议题）
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('第十六章 架构师苏格拉底式追问（开放议题）', H1, level=0))

story.append(Paragraph(
    '原文档中提出的三个苏格拉底式架构追问，是关乎 Web5.blog 范式成败的开放议题。'
    '本章保留这三个追问，给出架构师倾向性方案，并列出团队待决策清单与决策截止节点。'
    '这些议题没有标准答案，需要团队在 MVP 阶段通过原型验证与用户反馈共同决策。',
    BODY
))

story.append(add_heading('16.1 议题一：Vessel 熔断机制', H2, level=1))
story.append(Paragraph(
    '追问：既然 Vessel 可以自动进行 AP2 微支付和交互，如果 Vessel 的 Session Key 被盗，'
    '或者 AI 分身（Eidolon）产生幻觉进行了恶意支付/恶意评论，'
    '我们在智能合约层面如何设计"熔断机制"或"本体一键撤回"的紧急预案？'
    '这关系到马克思语境下对"异化"的防范。',
    BODY
))
story.append(Paragraph(
    '架构师倾向性方案：三层熔断机制。'
    'Layer 1 合约级自动熔断——BudgetFence 合约内置异常检测，'
    '当单笔支付超过 perTxLimit 的 5 倍、或 1 分钟内支付笔数超过 rateLimitPerMin 的 3 倍时，'
    '合约自动 freeze 该 Vessel 24 小时；'
    'Layer 2 Prime 一键撤回——Prime 通过 eidolonos.xyz 一键 revoke 所有 Vessel 的 Session Key，'
    '链上生效时间 < 1 个区块（约 2 秒）；'
    'Layer 3 DAO 治理熔断——社区可发起紧急提案，冻结确认恶意行为的 Vessel 资产，'
    '通过多签执行。待决策：Layer 1 的自动熔断阈值如何设定？是否需要引入 AI 行为评分作为熔断触发条件？'
    '决策截止：Day 15（MVP 合约部署前）。',
    BODY
))

story.append(add_heading('16.2 议题二：Vessel 资产化与流动性', H2, level=1))
story.append(Paragraph(
    '追问：在 Web3 中，域名和钱包地址可以交易。在 Web5 中，'
    '一个配置了高级 AI 模型、拥有良好信用评分和丰富交互历史的"高级 Vessel（容器）"，'
    '是否应该被设计成一种可租赁、可交易的 NFT 资产？'
    '这能极大加速戴维经济学中"比较优势"的流转。',
    BODY
))
story.append(Paragraph(
    '架构师倾向性方案：Vessel 作为灵魂绑定（Soulbound）+ 可租赁 NFT 的混合模型。'
    'Vessel 的"灵魂"（AA2P 密钥 + RAG 记忆 + 信用评分）是 Soulbound，不可转让——'
    '这防止了"身份盗用"与"信用造假"。但 Vessel 的"算力配置"（模型版本、推理资源、'
    'API 配额）可作为可租赁 NFT，允许算力富余的用户出租给算力稀缺的用户。'
    '租赁期间，承租方获得 Vessel 的使用权（但 not 所有权），收益按智能合约分成。'
    '待决策：Vessel 信用评分的算法如何设计？租赁期间的行为责任如何归属（承租方 vs 出租方）？'
    '决策截止：Day 45（Beta 阶段 Vessel 市场设计前）。',
    BODY
))

story.append(add_heading('16.3 议题三：特洛伊木马降级策略的代码实现', H2, level=1))
story.append(Paragraph(
    '追问：我们之前讨论过，为了兼容 Web3 存量用户，可以保留 RainbowKit。'
    '那么在代码层面，如果用户选择用传统钱包登录，我们是否应该在 middleware.ts 中'
    '将其标记为 Observer Mode（观察者模式）？即：允许他们进入 Dashboard 观看 3D 动效，'
    '但禁用 ap2Engine，并在 UI 上强烈暗示："您正在使用 Web3 的旧壳，点击唤醒容器以解锁 Web5 的躺赚特权"。',
    BODY
))
story.append(Paragraph(
    '架构师倾向性方案：Observer Mode + 渐进式升级引导。'
    'Observer Mode 用户可阅读所有公开内容、观看 3D 动效、查看 Dashboard 演示，'
    '但所有"参与"操作（评论、点赞、微支付、发布、收藏）均被禁用并显示升级提示。'
    '关键设计：不使用弹窗（易引起反感），而是在每个被禁用的操作位置 inline 显示'
    '"此操作需要 Vessel 容器"提示与一键升级入口。渐进式升级引导：'
    '首次 Observer Mode 登录后，展示一个 30 秒的"Web5 觉醒之旅"动效，'
    '解释容器登录的价值，并在结束时提供"立即唤醒容器"按钮。'
    '待决策：Observer Mode 用户的阅读是否也受限（如每日 5 篇）？升级转化率的 A/B 测试方案？'
    '决策截止：Day 10（MVP Observer Mode 实现前）。',
    BODY
))

story.extend(callout_box(
    '苏格拉底追问总结',
    '三个开放议题的本质是：如何在"个人解放"（Vessel 自治）与"安全可控"（熔断机制）、'
    '"价值流动"（Vessel 资产化）与"身份唯一"（Soulbound）、"范式纯粹"（容器原生）与"用户增长"（特洛伊木马）'
    '之间找到平衡点。这些决策没有标准答案，需要团队在原型验证与用户反馈中迭代优化。'
))

# ═══════════════════════════════════════════════════════════════
# 结语
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('结语：从理念到代码的鸿沟', H1, level=0))

story.append(Paragraph(
    'Web5.blog 表面上是一个内容平台，本质上是一场数字时代的生产关系革命。'
    '它用密码学解决了"信任与确权"——DID 让身份归个人所有，Content NFT 让内容永久确权，'
    'ARP 让版税自动分账；它用 AI 解决了"生产力与执行"——Eidolon 让分身承载人格，'
    'Vessel 让容器自主执行，RAG 让记忆私有化；它用分布式经济学解决了"公平分配"——'
    'AP2 让微支付成为可能，戴维经济学让比较优势自由流转，BudgetFence 让自治不失控。'
    '三者协同，构成数字时代的"个人解放基础设施"。',
    BODY
))
story.append(Paragraph(
    '作为架构师，我深知从理念到代码的鸿沟。这份白皮书试图在这道鸿沟上架一座桥——'
    '从哲学底座到协议设计，从五层架构到代码骨架，从 30 天 MVP 到 90 天公测，'
    '从技术风险到合规监管，从苏格拉底追问到团队决策清单。但白皮书终究是纸上的蓝图，'
    '真正的考验在代码提交、合约部署、用户反馈、迭代优化的每一个具体瞬间。'
    'Web5 的愿景越宏大，落地的每一步就越需要谨慎——每一个 Session Key 的下发，'
    '每一次 AP2 微支付的触发，每一篇 Content NFT 的铸造，都是对"个人解放"承诺的兑现或背叛。',
    BODY
))
story.append(Paragraph(
    '我呼吁团队在 30 天内启动 MVP，边建边在平台上发布内容，形成自增强循环。'
    '不要等待完美——Web5 的范式需要通过真实用户的真实使用来验证与塑形。'
    '5 篇种子文章不只是内容，更是系统的"自举"——每一篇都 mint 为 NFT，'
    '每一篇都演示容器登录与 AP2 微支付，每一篇都是 Web5 理念的活体广告。'
    '当 100 个种子 Vessel 开始在网络上自主交互，当第一个读者通过 AI 分身自动向作者支付 0.001 USDC，'
    '当第一个策展人通过推荐分润获得被动收益——那一刻，Web5 就从白皮书变成了现实。',
    BODY
))
story.append(Paragraph(
    '朴叔构想的 Web5 博客，是数字时代的"数字解放区"。它不追求颠覆 Web2 的全部，'
    '而是为那些渴望数字主权的个体——思考者、创作者、策展人、研究者——提供一个'
    '真正属于自己的栖息地。在这里，你的思想是资产，你的分身是代理人，你的容器是工具，'
    '你的收益是自动的。这是马克思主义语境下"人的自由而全面的发展"在数字时代的微观实现。'
    '让我们从今天开始，把这个乌托邦一行一行地写成代码。',
    BODY
))

# ═══════════════════════════════════════════════════════════════
# Build PDF
# ═══════════════════════════════════════════════════════════════

OUTPUT_BODY = '/home/z/my-project/scripts/body.pdf'

doc = TocDocTemplate(
    OUTPUT_BODY,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='Web5.blog 开发框架与架构白皮书',
    author='Z.ai',
    creator='Z.ai',
    subject='Web5.blog Architecture Whitepaper V1.0'
)

doc.multiBuild(story, onFirstPage=page_decoration, onLaterPages=page_decoration)
print(f"Body PDF generated: {OUTPUT_BODY}")
print(f"Total story elements: {len(story)}")
