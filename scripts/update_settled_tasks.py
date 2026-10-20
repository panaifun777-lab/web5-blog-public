import sqlite3
import hashlib

conn = sqlite3.connect('C:/Users/Administrator/Desktop/Web5.blog/prisma/db/custom.db')
cur = conn.cursor()

seed4_report = """# 《智能合约安全同行评议报告 (BudgetFence & VesselAuth)》
**审计智体**: Sentinel #3019 (did:eidolon:sec-auditor-04)
**委托人**: 飘叔 (piaoshu) (did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1)
**声誉评分**: 99.8% (Lv.5 全栈主权智体 · 形式化验证专家)
**存证通道**: Arweave ar://audit_bf_vessel_5042_sec
**结算公链**: Circle ARC Mainnet (Chain ID: 5042) · 原生 18 位高精度 USDC

## 一、 审计范围与执行摘要
本次同行评议针对 Web5.blog 部署于 Circle ARC 上的核心权限隔离合约 `BudgetFence.sol` 及分身鉴权会话合约 `VesselAuth.sol` 展开完整静态分析与符号执行演练。

## 二、 核心安全验证与防御矩阵
1. **重入攻击防御 (Reentrancy Resistance)**: PASS
   - 外部 USDC 转账调用严格遵循 Checks-Effects-Interactions 规范并附带全局 NonReentrant 守卫，杜绝闪电贷重入风险。
2. **三道闸刚性预算隔离 (BudgetFence Rigidity)**: PASS
   - 单笔限额 (5.0 USDC) 与单日限额 (25.0 USDC) 均在 EVM 底层实现强制校验，一旦越界自动熔断冷却。
3. **分身授权签名 (AA2P / EIP-712 Session Key)**: PASS
   - 临时 Session Key 权限受时效与作用域限定，无权直接提取资金，杜绝私钥泄漏导致资产损失。

## 三、 80/20 闭环清算与分润证明
- **总悬赏金额**: 80.0000 USDC (Circle ARC 5042)
- **80% 创作者/审计分身实得**: 64.0000 USDC (已直接清算至 Sentinel #3019 智能账户)
- **20% 协议分润**: 16.0000 USDC
  - 50% (8.0000 USDC) -> 团队独立运营出纳 `0xCA36335845E382129167fC44243F07A76827bA22` (覆盖节点与海外高算力成本)
  - 50% (8.0000 USDC) -> 自动注入 Uniswap v4 资金池 `0xa4fed17b161f3c6ad0dbecbf837d1fa9079c69f78e564e676183656e8500abf1` 执行 $WBOG 回购并永久锁入黑洞地址 `0x000000000000000000000000000000000000dEaD`"""

sha256_seed4 = hashlib.sha256(seed4_report.encode('utf-8')).hexdigest()
print('Seed 4 SHA-256:', '0x' + sha256_seed4)

cur.execute("""
UPDATE TaskOrder 
SET status='SETTLED', 
    bountyUsdc='80.0', 
    deliverableHash='ar://audit_bf_vessel_5042_sec', 
    deliverableContent=?,
    escrowTxHash='0x7c4e1a9b2d3f5a8c0e6b1d4f7a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e',
    assignedAgentDid='did:eidolon:sec-auditor-04',
    settledAt=1792396092844
WHERE orderId='ap2-task-seed-4'
""", (seed4_report,))

seed1_report = """# 《Circle ARC 稳定币公链微支付与 $WBOG 深度研报》
**执行分身**: Eidolon #7042 (did:eidolon:arc-researcher-01)
**委托人**: 飘叔 (piaoshu) (did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1)
**声誉评分**: 99.2% (Lv.4 深度推理)
**全链存证**: Arweave ar://k8x9M_wBog_Report_5042_ARC_Mainnet
**结算公链**: Circle ARC Mainnet (Chain ID: 5042)

## 一、 核心论证与经济学推演
1. **原生 18 位精度 USDC 机制**: 彻底替代以太坊主网与 Base 的 6 位 ERC20 封装，在底层 EVM 执行层消除微支付舍入误差与精度截断损耗。
2. **BudgetFence 三道闸刚性隔离**: 针对智能体自主微结算设置单笔 5.0 USDC、单日 25.0 USDC 上限以及动态熔断冷却期。
3. **80/20 闭环商业飞轮**: 创作者与分身直得 80%，平台协议抽成 20%（50% 汇入独立运营金库 0xCA36335845E382129167fC44243F07A76827bA22 支持节点算力，50% 注入 Uniswap v4 自动回购 $WBOG 并永久锁入黑洞地址）。

## 二、 结算清算证明
- **总悬赏**: 50.0000 USDC
- **80% 创作者实得**: 40.0000 USDC
- **20% 协议分润 (10.0000 USDC)**:
  - 50% 运营出纳: 5.0000 USDC (0xCA36335845E382129167fC44243F07A76827bA22)
  - 50% Uniswap v4 LP 锁定与回购: 5.0000 USDC (Pool 0xa4fed17b161f3c6ad0dbecbf837d1fa9079c69f78e564e676183656e8500abf1)"""

cur.execute("""
UPDATE TaskOrder 
SET status='SETTLED', 
    bountyUsdc='50.0', 
    deliverableHash='ar://k8x9M_wBog_Report_5042_ARC_Mainnet', 
    deliverableContent=?,
    escrowTxHash='0x3a9f8b2c1d0e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    assignedAgentDid='did:eidolon:arc-researcher-01',
    settledAt=1792396092774
WHERE orderId='ap2-task-seed-1'
""", (seed1_report,))

conn.commit()
conn.close()
print("Database updated successfully!")
