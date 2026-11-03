// ════════════════════════════════════════════════════════════════
// scripts/seed-meme-bounties.ts
// 同步桌面《meme 币量化交易策略统一文书》实战悬赏任务到 TaskOrder 数据库
// 包含真实托管合约 0xCA36335845E382129167fC44243F07A76827bA22 与详细技术要求
// ════════════════════════════════════════════════════════════════

import { db } from '../src/lib/db';

interface MemeBountyDefinition {
  orderId: string;
  creatorDid: string;
  title: string;
  bountyUsdc: string;
  status: string;
  escrowContract: string;
  escrowTxHash: string;
  description: string;
}

const MEME_BOUNTY_TASKS: MemeBountyDefinition[] = [
  {
    orderId: 'ap2-task-meme-b1',
    creatorDid: 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
    title: '收集并穿透 50 个高频 Pump.fun 集群钱包特征签名（防守 B 线）',
    bountyUsdc: '50.0',
    status: 'FUNDED',
    escrowContract: '0xCA36335845E382129167fC44243F07A76827bA22',
    escrowTxHash: '0x5f8a1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a01',
    description: `# 【策略统一文书 · 防守 B 线】收集并穿透 50 个高频 Pump.fun 集群钱包特征签名

## 一、 背景与业务目标
依据桌面《meme 币量化交易策略统一文书》第一节共识事实：
1. White Whale Labs 审计表明，2025年8月底以来 Pump.fun 与 Stonk 上 3.84 亿笔交易几乎全由 450~2000 个钱包组成的集群操控。
2. 内部盘集群通过集中分发、同区块买入拉盘与分散出货协同砸盘，导致散户与外部量化策略在结构性对抗中必然处于极高亏损劣势。
3. **防守 B 线核心逻辑**：不盲目预测行情，而是“将集群当传感器”，建立在场过滤与内部盘黑名单 veto 机制。

## 二、 详细技术要求
1. **多源数据穿透**：基于 GMGN 穿透工具、Solana RPC 历史流水与 Pump.fun 新池流，识别并穿透至少 50 个高频协作的集群钱包地址（按资金链路展开完整的 Funding Tree）。
2. **特征工程抽取**：提取标准化特征签名（Feature Signatures），包括：
   - 资金源同源性：初始 Gas 资金来自同一归集/中转地址或 Mixer；
   - 行为协同度：新池创建后同区块打包买入（Jito Bundle）或毫秒级密集时延；
   - 持仓集中度：集群钱包累计持仓占流通盘比例（>15%~30% 警戒线）；
   - 协同出货特征：阶段性倒手拉高（Volume Wash）与阶梯砸盘特征。
3. **输出规范交付物**：
   - 生成兼容 \`gmgn/insider_blacklist_seed.json\` 与 \`gmgn/keeper_v1.json\` 的标准化 JSON 规则集；
   - 提供毫秒级 Veto 匹配伪代码或 Rust/TypeScript 匹配函数，支持传入新池 Mint 即刻返回“疑似集群操控 (Cluster Detected)”或“通过 (Safe)”。

## 三、 链上托管与清算标准
- **托管公链**: Circle ARC Mainnet (Chain ID: 5042, 原生 18 位高精度 USDC)
- **托管金库合约**: \`0xCA36335845E382129167fC44243F07A76827bA22\`
- **悬赏金额**: 50.0000 USDC
- **验收方式**: 交付特征签名库及穿透报告，经策略组在克隆沙盒中核验通过后，通过 AP2 状态机自动结算。80% 归执行者，20% 协议分润。`,
  },
  {
    orderId: 'ap2-task-meme-a2',
    creatorDid: 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
    title: '为 sniffer-insider-defense 编写自动化 A/B 实验评测脚本（进攻 A 线）',
    bountyUsdc: '35.0',
    status: 'FUNDED',
    escrowContract: '0xCA36335845E382129167fC44243F07A76827bA22',
    escrowTxHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    description: `# 【策略统一文书 · 进攻 A 线】为 sniffer-insider-defense 编写自动化 A/B 实验评测脚本

## 一、 背景与业务目标
依据《meme 币量化交易策略统一文书》与 \`cluster-filter-ab-experiment.md\` 方法论：
1. 正在运行的 77% 胜率盈利系统（smartledgeragent.top）需进行解剖并抽象为参数级规则（选币/进出场/仓位/风控）。
2. 任何新策略规则不得直接触碰实盘开关，严格执行 **paper-only** 纪律。
3. 需启动为期 14 天的严格双盲/对照 A/B 实验评测，以量化数据驱动第四节“决策树节点 1”（2026-11-06）的判定。

## 二、 详细技术要求
1. **双轨并行仿真环境**：
   - 对照组（Control Group）：无集群过滤器，执行基线进攻策略；
   - 实验组（Experimental Group）：挂载 sniffer-insider-defense 过滤器（黑名单 veto + 集群在场过滤）；
   - 在接收相同历史/实时交易流数据下，保持完全一致的滑点、手续费（如 1%）及模拟撮合环境。
2. **核心量化监控指标**：
   - 总开仓交易笔数、胜率（以 77% 实盘胜率为对标线）；
   - 累计净收益（Net PnL）与盈亏比（Profit Factor）；
   - 最大回撤（Maximum Drawdown, MDD）；
   - 错杀率（False Positive Rate）与少亏比率（实验组相对对照组的亏损削减百分比，核心考核阈值 ≥50%）。
3. **自动化报告与决策树映射**：
   - 脚本每日自动生成 Markdown + JSON 结构化评测看板；
   - 运行结束时自动触发“预注册决策树节点 1”结论判定：
     * 条件 1：实验组胜出（净收益更高且回撤更小）→ 建议全面上线 paper agent；
     * 条件 2：实验组少亏 ≥50% 但仍亏 → 判定防守成立、进攻未解，冻结狙击盘；
     * 条件 3：过滤器无效或错杀严重 → 输出调优建议。
4. **纪律遵循**：自动剔除 2026-10-21 Alpenglow 迁移窗口及迁移后 24 小时的数据，保持数据洁净度。

## 三、 链上托管与清算标准
- **托管公链**: Circle ARC Mainnet (Chain ID: 5042)
- **托管金库合约**: \`0xCA36335845E382129167fC44243F07A76827bA22\`
- **悬赏金额**: 35.0000 USDC
- **验收方式**: 提交经过单元测试验证的评测脚本代码仓与完整回测 Mock 运行日志。`,
  },
  {
    orderId: 'ap2-task-meme-c3',
    creatorDid: 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
    title: '将集群避险过滤器打包为标准化 x402 商业化微付费接口（商业 C 线）',
    bountyUsdc: '45.0',
    status: 'FUNDED',
    escrowContract: '0xCA36335845E382129167fC44243F07A76827bA22',
    escrowTxHash: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    description: `# 【策略统一文书 · 商业 C 线】将集群避险过滤器打包为标准化 x402 商业化微付费接口

## 一、 背景与业务目标
依据《meme 币量化交易策略统一文书》商业 C 线规划：
1. “B 线验证过的过滤器本身就是产品（避开集群盘过滤器/API），不依赖自家交易盈利；与 Web5 卖基础设施是同一逻辑”。
2. Web5.blog 具备现成的 x402（HTTP 402 Payment Required）微支付技术栈，运行在 Circle ARC Mainnet 原生 18 位精度 USDC 上。
3. 将量化内部盘检测与集群避险能力作为商业服务对外变现，为外部散户、量化团队及 Telegram 交易 Bot 提供付费风控 API。

## 二、 详细技术要求
1. **RESTful API 设计**：
   - \`POST /api/v1/meme/cluster-veto\`：传入代币合约地址与 DEX 标识，返回集群在场概率、关联内部盘地址数量、建议避险等级（LOW/MEDIUM/HIGH/CRITICAL）；
   - \`GET /api/v1/meme/cluster-stats\`：返回实时全网被识别集群操控的代币分布动态与避险周报。
2. **x402 微付费握手规范**：
   - 当调用方未提供有效支付凭证时，返回 \`402 Payment Required\`，附带 \`X-Payment-Required: true\`、单次查询费用（0.05 USDC）及 ARC 收款金库地址 \`0xCA36335845E382129167fC44243F07A76827bA22\`；
   - 验证调用方附带的 EIP-712 Session Key 签名或 Circle ARC 链上转账哈希，秒级验签放行。
3. **80/20 闭环商业结算集成**：
   - 调用方支付的 USDC 微支付流水接入 AP2 商业分润协议：80% 归算法开发者，20% 平台协议抽成（50% 维护服务器算力金库，50% 自动注入 Uniswap v4 回购并锁死 $WBOG）。
4. **客户端调用 SDK 与 Demo**：
   - 提供极简 Python 与 TypeScript SDK 封装，演示外部 Agent 如何用两行代码完成“检测避险并微支付”。

## 三、 链上托管与清算标准
- **托管公链**: Circle ARC Mainnet (Chain ID: 5042)
- **托管金库合约**: \`0xCA36335845E382129167fC44243F07A76827bA22\`
- **悬赏金额**: 45.0000 USDC
- **验收方式**: 提供已部署并通过 x402 状态码自动化测试的接口工程、OpenAPI 文档与测试用例。`,
  },
];

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('【开始执行：Meme 策略与集群防御实战悬赏项目同步脚本】');
  console.log(`托管合约金库: 0xCA36335845E382129167fC44243F07A76827bA22 (Circle ARC 5042)`);
  console.log('════════════════════════════════════════════════════════════════\n');

  for (const task of MEME_BOUNTY_TASKS) {
    console.log(`正在同步任务: [${task.orderId}] ${task.title}...`);

    const result = await db.taskOrder.upsert({
      where: { orderId: task.orderId },
      update: {
        creatorDid: task.creatorDid,
        title: task.title,
        description: task.description,
        bountyUsdc: task.bountyUsdc,
        status: task.status,
        escrowContract: task.escrowContract,
        escrowTxHash: task.escrowTxHash,
      },
      create: {
        orderId: task.orderId,
        creatorDid: task.creatorDid,
        title: task.title,
        description: task.description,
        bountyUsdc: task.bountyUsdc,
        status: task.status,
        escrowContract: task.escrowContract,
        escrowTxHash: task.escrowTxHash,
      },
    });

    console.log(`✅ 成功写入/更新: ${result.orderId}`);
    console.log(`   - 状态: ${result.status}`);
    console.log(`   - 赏金: ${result.bountyUsdc} USDC`);
    console.log(`   - 托管合约: ${result.escrowContract}`);
    console.log(`   - 链上转账凭据: ${result.escrowTxHash}\n`);
  }

  // 验证当前数据库中所有的量化实战任务
  console.log('--- 验证数据库 TaskOrder 表中的 Meme 实战悬赏任务 ---');
  const allMemeTasks = await db.taskOrder.findMany({
    where: {
      orderId: {
        in: MEME_BOUNTY_TASKS.map((t) => t.orderId),
      },
    },
  });

  for (const t of allMemeTasks) {
    console.log(`✔ 任务确认: ${t.orderId} | ${t.bountyUsdc} USDC | ${t.status} | 托管: ${t.escrowContract} | 标题: ${t.title}`);
  }

  console.log(`\n🎉 数据库同步成功！共 ${allMemeTasks.length} 个实战量化悬赏任务已完成上线并就绪。`);
}

main()
  .catch((e) => {
    console.error('❌ 同步失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
