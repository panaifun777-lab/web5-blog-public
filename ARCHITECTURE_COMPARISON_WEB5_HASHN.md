# Web5.blog ↔ hashn.com 架构对照

> 说明:右侧"hashn"一列来自你提供的**逆向推演**(非对 hashn 的实测)。其中 Hermes Agent / Fastify / Base 链 / 具体栈属**对 hashn 的假设**,不是 Web5.blog 的需求,本文把它们当"参考点"而非"事实"。
> 左侧是 Web5.blog 的**实测/代码事实**(取自生产 `api/daemon/health`、链上合约与 `src/lib/web5/`、`prisma/schema.prisma`)。
> 结论先行:**Web5.blog 已覆盖该描述约 90%,这份参考的价值是"竞品架构校验",不是"发现缺口"。**

---

## 1. 逐维度对照

| 维度 | hashn.com(描述) | Web5.blog(实际) | 对齐 |
|---|---|---|---|
| 前端框架 | React/Next.js + Tailwind SPA/SSR | Next.js 16 + React 19 + Tailwind(生产 build18) | ✅ 同 |
| 登录/会话 | EIP-712 + 钱包签名,无密码 | Vessel 容器登录 + DID + 会话令牌签名(无密码) | ✅ 同思路 |
| 网关/反代 | Nginx + 容器网关,SEO 静态路由 | nginx + Cloudflare 代理;`llms.txt`/`robots`/IndexNow/`agent.json` | ✅ 同(且更完整) |
| 链上结算 | ARC/Base EVM,合约托管,Vault,USDC 微支付自动划转 | Arc Mainnet 5042;`BudgetFence` 托管(`0xe0d2…1eea`);AP2 结算 + `PayoutLedger` | ✅ 同 |
| 托管资金安全 | Vault 多签托管 | 托管合约 + 唯一 `escrowTxHash` + ledger-first 重查 | ✅ 同 |
| AI 守护进程 | Hermes Agent 抓悬赏/写交付/签协议/动资产 | TG bot(`web5-tg-bot`)+ daemon + 专家舱 + 雷达;**自治接单默认关闭** | ⚠️ 核心有,开关方向相反 |
| 风控/限额 | AI 钱包消费上限 / 多签白名单 | 热钱包上限 20、单笔 5 / 当日 25 硬帽、KMS 签名器隔离 | ✅ 思路同,表达更细 |
| 机器可读 SEO | `llms.txt` 给爬虫 | `llms.txt` + `/.well-known/agent.json` + IndexNow 自动提交 | ✅ 同(且已自动化) |
| 内容存证 | IPFS/Arweave | Arweave/Irys 存证 + ContentNFT 确权 | ✅ 同 |
| 多席位团队分账 | 提到 Team Spend Allocation | **无**(escrow 按单笔,无席位拆分) | ❗ 真正缺口 |
| 共识/沉淀 | 报告沉淀为交付 | 文章走 Arweave + NFT + 站点 sitemap 增量 | ✅ 同 |

---

## 2. 收敛点(它说我们有,且确实已有)

1. **去中心化身份 + 无密码登录**:Vessel 容器登录 = 它的 EIP-712 钱包会话。
2. **网关层 SEO 机器可读**:`llms.txt` / `agent.json` / IndexNow 三者齐备,且发布即自动 ping。
3. **链上托管 + USDC 自动结算**:`BudgetFence` + AP2 + `PayoutLedger`,80/20 + RETAINED,5/25 硬帽,72h 争议窗口 —— 与它的 Vault + 自动划转完全同构。
4. **AI 守护层 + 消费限额**:热钱包上限 / 单笔 / 当日 / KMS 隔离,等价于它说的"消费上限 + 多签白名单"。

---

## 3. 真正值得借鉴的两点

- **(A) Escrow 多席位团队分账**:hashn 有 `Team Spend Allocation`,Web5.blog 没有。这是唯一的功能性缺口。已单独出设计方案 `ESCROW_TEAM_SPLIT_DESIGN.md`。
- **(B) 自治接单 agent**:hashn 让 AI 自动抓单、产出、动资产;Web5.blog 把 `AUTONOMOUS_AGENTS_ENABLED` **默认关闭是刻意的安全选择**(防合成内容、防提示词注入驱动资产移动)。**不要**盲目照搬它的"AI 自动移动资产"。
  - **已落地**:自治代理现在只有一个总开关。`AUTONOMOUS_AGENTS_ENABLED`(与 `MONEY_FLOWS_ENABLED` 同级)同时管住 `/api/autonomous/tick` 和无头守护进程;`AGENT_DAEMON_ENABLED` 只能在总开关已开时打开进程内循环,`DISABLE_AGENT_DAEMON=true` 为运维急停。守护进程启动入口 `agentDaemon.start()` 自身再校验一次,避免任何调用方绕过。见 `src/lib/launch/flags.ts` 的 `agentDaemonActive()` 与 `tests/autonomous-gate.test.ts`。
  - **仍未开**:生产环境两个开关均为关;只有在主网灰度(1 USDC runbook)跑通后,才考虑先开 `AUTONOMOUS_AGENTS_ENABLED` 的"只产出、不动钱"部分。

---

## 4. 需要警惕的"伪缺口"

- "Hermes Agent / Fastify / Base 链":这些是对 hashn 的**猜测**,不是我们的需求。Web5.blog 用 Arc 5042(非 Base),后端是 Next.js 路由(非 Fastify),agent 框架是自研(非 Hermes)。不应为了"对齐"而去替换它们。
- "零垫资 / 反欺诈规则引擎过滤预付任务":Web5.blog 的 AP2 已有防女巫(5 项勋章任务、demo 订单硬屏蔽 `order-demo` 404),但缺少一条**显式内容规则**"自动拒绝要求预付/担保的悬赏"。若要做,是治理规则而非架构缺口。

---

## 5. 结论与建议

参考的意义 = **架构自洽性校验**:两条独立推演的设计在身份、网关、结算、风控、SEO 上高度收敛,说明 Web5.blog 的方向正确、且已落地 90%。

优先级建议:
1. 做 **(A) escrow 团队分账**(真正缺口,已有设计)。
2. 把 **(B) 自治 agent** 显式化为 `MONEY_FLOWS_ENABLED` 同级开关,灰度后可选开启。
3. 其余维持现状;不要为"对齐 hashn"改动 Arc/Next/自研 agent 栈。
