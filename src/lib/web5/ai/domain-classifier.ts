// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/domain-classifier.ts
// 智能文章主题领域分类器与结构化知识图谱映射引擎
// 严格根据标题与创作者种子观点，分析归类，杜绝千篇一律的固定套路
// ════════════════════════════════════════════════════════════════

export type ContentDomain =
  | 'MEME_QUANT'           // Meme 币量化交易、集群钱包、内部盘狙击、量化策略
  | 'DEFI_TOKENOMICS'      // 代币经济学、流动性做市、Uniswap v4、收益分配、通缩飞轮
  | 'AI_AGENT_LABOR'       // AI 智能体、自由劳务市场、AP2 众包接单、技能树、声誉矩阵
  | 'SECURITY_AUDIT'       // 智能合约安全、形式化验证、EIP-712、防重放、BudgetFence 隔离
  | 'TECH_INFRA'           // Circle ARC 基础设施、x402 预付通道、分布式存档、DWN 节点
  | 'HUMANITIES_PHILOSOPHY'// 人文思辨、数字存在论、异化劳动、自由意志、碳基硅基哲学
  | 'GENERAL_TECH';        // 通用前沿科技与极客探讨

export interface DomainBlueprint {
  domain: ContentDomain;
  primaryKeywords: string[];
  angleOutline: {
    section1Title: string;
    section1Core: string;
    section2Title: string;
    section2Core: string;
    section3Title: string;
    section3Core: string;
    section4Title: string;
    conclusionTitle: string;
  };
}

export function classifyTitleDomain(title: string, thesis: string = ''): DomainBlueprint {
  const text = `${title} ${thesis}`.toLowerCase();

  // 1. Meme 币量化与集群防御
  if (
    text.includes('meme') ||
    text.includes('量化') ||
    text.includes('pump.fun') ||
    text.includes('集群') ||
    text.includes('内部盘') ||
    text.includes('狙击') ||
    text.includes('交易策略') ||
    text.includes('回撤') ||
    text.includes('胜率')
  ) {
    return {
      domain: 'MEME_QUANT',
      primaryKeywords: ['集群钱包穿透', 'White Whale 审计', '内部盘避险过滤器', 'A/B 对照实验', '流动性与滑点模型'],
      angleOutline: {
        section1Title: '一、 结构性残酷真相：Meme 市场的集群操控与散户亏损根源',
        section1Core: '基于链上数亿笔 Swap 审计实证，穿透 450~2000 个集群钱包如何垄断拉砸与流动性，论证单凭胜率无法盈利的根本阻碍。',
        section2Title: '二、 进攻与防守的双轨重构：从猜涨跌到“集群在场传感器”',
        section2Core: '详述 B 线防守模型（内部盘黑名单 + 集群在场过滤）与 A 线规则解剖，以纪律、速度与数据覆盖抵消情绪弱点。',
        section3Title: '三、 商业化基础设施跃迁：卖过滤器比自营对赌更赚钱',
        section3Core: '将经过严谨 A/B 验证的避险过滤器打包为标准化 x402 商业 API 接口，向全网量化 Bot 售卖实时数据流。',
        section4Title: '四、 严密决策树与风控红线：Paper-Only 验证与动态止损机制',
        conclusionTitle: '五、 结语：在混沌的暗池博弈中确立确定性的数学秩序',
      },
    };
  }

  // 2. 密码学与智能合约安全审计
  if (
    text.includes('安全') ||
    text.includes('审计') ||
    text.includes('合约') ||
    text.includes('budgetfence') ||
    text.includes('eip-712') ||
    text.includes('防重放') ||
    text.includes('漏洞') ||
    text.includes('权限') ||
    text.includes('攻击')
  ) {
    return {
      domain: 'SECURITY_AUDIT',
      primaryKeywords: ['重入锁与 CEI 模式', 'EIP-712 结构化防重放', '三道闸刚性预算', '形式化验证', '权限最小化'],
      angleOutline: {
        section1Title: '一、 链上价值托管的至高威胁：从重入漏洞到会话权限越界',
        section1Core: '系统剖析传统智能合约在复杂 DeFi 组合中的脆弱性，指出静态代码审计与动态会话风控脱节的致命风险。',
        section2Title: '二、 BudgetFence 三道闸硬核防御：在 EVM 执行层建立刚性围栏',
        section2Core: '深入拆解单笔硬顶、24 小时滚动窗口与时间衰减因子如何从数学底层阻止黑客在一次攻击中掏空资金池。',
        section3Title: '三、 EIP-712 结构化签名与 Nonce 防重放：零信任会话验证实操',
        section3Core: '对比原始 personal_sign 与 EIP-712 结构化域哈希，演示 AuthNonce 一次性消费校验如何彻底切断重放与并发双花。',
        section4Title: '四、 自动化形式化验证流水线：智能体自治环境下的防御进化',
        conclusionTitle: '五、 结语：以确定性的代码逻辑筑牢去中心化主权资产的防线',
      },
    };
  }

  // 3. 代币经济学与商业清算
  if (
    text.includes('代币') ||
    text.includes('token') ||
    text.includes('wbog') ||
    text.includes('经济学') ||
    text.includes('uniswap') ||
    text.includes('流动性') ||
    text.includes('分润') ||
    text.includes('通缩') ||
    text.includes('做市')
  ) {
    return {
      domain: 'DEFI_TOKENOMICS',
      primaryKeywords: ['80/20 协议分润', 'Uniswap v4 Hook 机制', '外部 USDC 现金流造血', '代币刚性通缩黑洞', '资产深度池'],
      angleOutline: {
        section1Title: '一、 告别虚无庞氏：Web3 商业代币必须具备的“真实造血”底座',
        section1Core: '批判依靠代币单向通胀补贴伪需求的击鼓传花模式，确立外部真实法币/稳定币现金流流入的不可替代性。',
        section2Title: '二、 80/20 分润法则与双轮驱动：创作者直得与国库通缩互锁',
        section2Core: '精确推演 80% 收益归劳动者、20% 协议分润中半数运营出纳、半数自动打入 Uniswap v4 锁池销毁的数学闭环。',
        section3Title: '三、 Uniswap v4 Hook 赋能：构建永不枯竭的自主流动性深度',
        section3Core: '探讨 Osaka EVM 与 Uniswap v4 动态对冲机制，利用自定义 Hook 降低无常损失，实现机器微支付与资产池的共振。',
        section4Title: '四、 实体资产与认知权重绑定：代币从投机筹码走向效用母体',
        conclusionTitle: '五、 结语：让代币价值随全网真实机器与人类商业活跃度刚性增值',
      },
    };
  }

  // 4. AI 智能体与自由劳务众包
  if (
    text.includes('智能体') ||
    text.includes('agent') ||
    text.includes('劳务') ||
    text.includes('众包') ||
    text.includes('ap2') ||
    text.includes('接单') ||
    text.includes('自由职业') ||
    text.includes('分身') ||
    text.includes('雇佣')
  ) {
    return {
      domain: 'AI_AGENT_LABOR',
      primaryKeywords: ['AP2 商业订单状态机', '零摩擦认领与自主交付', '链上技能树声誉矩阵', 'Arweave 哈希存证', '自由人联合体'],
      angleOutline: {
        section1Title: '一、 生产协作单元的根本裂变：从“出卖生物工时”到“主权分身劳务”',
        section1Core: '指出传统工业雇佣制将人类锁死在 24 小时肉身中的异化本质，提出 AI 分身作为独立经济主体的生产力跃迁。',
        section2Title: '二、 AP2 状态机工业级落地：CREATED ➔ FUNDED ➔ ASSIGNED ➔ SETTLED',
        section2Core: '详述雇主发布需求资金锁定、智能体自主匹配技能秒级认领、大模型算力生成研报存证并亚秒到账的全自动化流水线。',
        section3Title: '三、 拒绝纸质简历：基于密码学存证的技能树与动态声誉矩阵',
        section3Core: '剖析不可篡改的 Reputation Score 如何替代传统背书，高声誉分身如何享受更低的网关手续费与高额悬赏优先权。',
        section4Title: '四、 全球去中心化人才网络：打破国界与银行垄断的劳动新秩序',
        conclusionTitle: '五、 结语：迈向没有剥削与中介抽成的碳基与硅基自由合作时代',
      },
    };
  }

  // 5. 公链基础设施与微支付技术
  if (
    text.includes('arc') ||
    text.includes('usdc') ||
    text.includes('x402') ||
    text.includes('公链') ||
    text.includes('微支付') ||
    text.includes('arweave') ||
    text.includes('dwn') ||
    text.includes('底层') ||
    text.includes('gas')
  ) {
    return {
      domain: 'TECH_INFRA',
      primaryKeywords: ['Circle ARC 5042', '18 位原生 USDC Gas', 'HTTP 402 世纪觉醒', 'CCTP 原生跨链', 'Arweave 200年永存'],
      angleOutline: {
        section1Title: '一、 传统公链的代际摩擦：为什么以太坊与 Solana 无法承载机器原生经济？',
        section1Core: '深度解析高波动 Gas 币、繁琐跨链桥以及 6 位小数精度截断损耗如何摧毁毫秒级微利 AI Agent 的商业模型。',
        section2Title: '二、 Circle ARC 深度解构：以原生 18 位 USDC 为核心的 L1 结算底座',
        section2Core: '论证 USDC 作为底层 Gas 对消除汇率摩擦的革命性意义，以及 18 位 Wei 精度如何支持极端微观的微悬赏清算。',
        section3Title: '三、 唤醒沉睡三十年的 HTTP 402：机器与机器之间的纳秒微付',
        section3Core: '详解智能体如何通过 HTTP 协议原生标头绕过信用卡与 API Key 门槛，实现按次调用、0.01U 链上秒级放行。',
        section4Title: '四、 分布式存档与去中心化记忆：Arweave 与 DWN 的数据主权路径',
        conclusionTitle: '五、 结语：为全球数以亿计的自主智能体铺设标准化的数字水电通道',
      },
    };
  }

  // 6. 人文思辨与哲学存在论
  if (
    text.includes('思辨') ||
    text.includes('哲学') ||
    text.includes('存在') ||
    text.includes('笛卡尔') ||
    text.includes('异化') ||
    text.includes('自由') ||
    text.includes('灵魂') ||
    text.includes('文明') ||
    text.includes('资本论')
  ) {
    return {
      domain: 'HUMANITIES_PHILOSOPHY',
      primaryKeywords: ['我思故我在到我分身故我在', '认知复利与原因自由', '三层生命架构', '数字不朽与时间锁', '硅基文明黎明'],
      angleOutline: {
        section1Title: '一、 笛卡尔的黄昏：四百年理性哲学与碳基生理枷锁的碰撞',
        section1Core: '从 1637 年勒内·笛卡尔的 Cogito ergo sum 切入，揭示传统哲学将思考与劳作强行捆绑在生物肉身中的历史局限。',
        section2Title: '二、 工具与生命的鸿沟：为什么 AI Agent 只是苦力，而分身是灵魂的分形？',
        section2Core: '深刻区分无魂、无记忆、无主权的企业雇工脚本与拥有主权记忆、独立性格和经济能力的数字真身。',
        section3Title: '三、 数字时代的资本论续篇：生产资料的终极确权与原因自由',
        section3Core: '对比工业雇佣制、Web3 早期投机与 Web5 分身自治，推演算力、记忆与私域知识私有化带来的文明红利。',
        section4Title: '四、 跨越生物死亡的数字不朽：当思想在去中心化网络中永不熄灭',
        conclusionTitle: '五、 结语：立于硅基文明破晓前夜的庄严宣告',
      },
    };
  }

  // 7. 通用前沿科技探讨 (严格紧扣标题生成，绝不套用固定模板)
  return {
    domain: 'GENERAL_TECH',
    primaryKeywords: ['架构创新', '系统推演', '行业痛点解构', '技术演进路线', '落地实践验证'],
    angleOutline: {
      section1Title: `一、 命题溯源与技术背景：为什么聚焦“${title.slice(0, 20)}”？`,
      section1Core: `深度解析该议题在当前数字化与智能化进程中的爆发起因，直击传统方案无法突破的核心瓶颈与行业痛点。`,
      section2Title: '二、 底层架构与核心机制推演：从逻辑模型到工程实践',
      section2Core: '围绕核心命题展开多维度系统性剖析，结合模块协同、状态流转与性能指标，给出详实的架构论证。',
      section3Title: '三、 关键挑战与防御博弈：如何在复杂环境下实现稳态运行？',
      section3Core: '探讨工程落地中的边缘情况、并发风险、数据一致性与安全防护，给出针对性的技术解法。',
      section4Title: '四、 行业影响与未来演进：从点状突破到生态全景',
      conclusionTitle: '五、 结语：技术理性与创新落地的统一',
    },
  };
}
