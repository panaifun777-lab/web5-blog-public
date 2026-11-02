# Telegram 公开频道广播队列（opt-in，默认关闭）

> 状态：**代码已完成，默认不生效。** `TG_BROADCAST_SECRET` 未设置（生产当前即为未设置）时，
> Web 侧不写队列、`/api/broadcast/*` 一律 503、bot 侧不发任何请求。
> 打开它需要的唯一动作是在 **bot 进程**与服务端同时配置同一个 `TG_BROADCAST_SECRET`，
> 并给出 `TG_CHANNEL_ID`（见 `.env.example` 的 "Telegram public-channel broadcast queue" 段）。
> 本模块**不涉及任何资金操作**，也不新增/修改任何 Prisma 模型或字段——队列状态全部存在既有的
> `SystemConfig`（单个 key）里。

相关文件：

| 文件 | 作用 |
|---|---|
| `src/lib/web5/broadcast/telegram-message.ts` | 纯函数渲染器：Telegram-HTML 转义、赏金口径、托管真伪、4096 截断、canonical 链接 |
| `src/lib/web5/broadcast/task-queue.ts` | 队列纯变换（`enqueueIntoDoc`/`trimQueue`/`pickClaimable`/`ackIntoDoc`）+ `SystemConfig` 读写与进程内串行化 + 密钥校验 |
| `src/lib/web5/ap2/commerce.ts` | 唯一挂载点：`db.taskOrder.create` 之后、`return mapPrismaOrder(record)` 之前的一次 fire-and-forget 入队 |
| `src/app/api/broadcast/claim/route.ts` | bot 领取端点（服务端渲染好的 HTML） |
| `src/app/api/broadcast/ack/route.ts` | bot 回执端点（SENT / FAILED / SKIPPED） |
| `src/app/api/daemon/health/route.ts` | 只读 `broadcast: { enabled, pending, sent, lastErrorKind }`（不含密钥） |
| `scripts/tg-broadcast.mjs` | bot 侧发送器：dedup、退避、每轮硬上限；被 `scripts/tg-bot.mjs` 的 `main()` 挂载 |
| `src/lib/web5/api/errors.ts` | `BROADCAST_NOT_CONFIGURED` / `BROADCAST_UNAUTHORIZED` / `BROADCAST_RECORD_NOT_FOUND` / `BROADCAST_RESULT_INVALID` |
| `tests/broadcast-message.test.ts`、`tests/broadcast-queue.test.ts`、`tests/broadcast-api.test.ts`、`tests/broadcast-commerce-hook.test.ts`、`tests/tg-broadcast.test.ts` | 渲染 / 队列 / HTTP / 挂载点 / 发送器 |

---

## 1. 为什么不是「Web 进程直接调用 Bot API」

Web 进程持有 DB、持有可能的资金相关密钥，**不持 bot token**，也绝不发起
`api.telegram.org` 请求；bot 进程持 bot token，但**不接 Prisma**。两侧只通过
一个带密钥的 HTTP 契约相连：

```
commerce.createCommerceOrder ──(fire-and-forget)──▶ SystemConfig["broadcast:telegram:queue"]
                                                          ▲
scripts/tg-bot.mjs ──▶ tg-broadcast.mjs ──POST /api/broadcast/claim（领取+盖章）
                         │  渲染好的 HTML 原样 sendMessage 到频道
                         └─POST /api/broadcast/ack（SENT/FAILED）
```

这样带来的三个性质：

1. **文案的唯一出处**是 `telegram-message.ts`。bot 拿到的是 `text` + `parseMode`，
   它不重建树、不拼接用户文本，改文案不需要重启 bot。
2. **用户提交的内容永不落盘到 SystemConfig**。队列记录只有
   `orderId / status / attempts / tgMessageId / lastError / lastErrorKind / queuedAt / claimedAt / sentAt`
   这类簿记字段；渲染时从 `TaskOrder` 现取现渲。
3. **Web 侧崩溃或 DB 抖动不影响下单**（第 3 节），**bot 侧崩溃不影响 Web**。

---

## 2. 记录格式（`SystemConfig`，key = `broadcast:telegram:queue`）

```jsonc
{
  "records": [
    {
      "orderId": "ap2-task-1730...",
      "status": "PENDING",          // PENDING | SENT | SKIPPED | FAILED
      "attempts": 0,                 // claim 时 +1
      "tgMessageId": null,           // ack 成功时写入
      "lastError": null,             // 脱敏、截断到 500 字符
      "lastErrorKind": null,         // FLOOD_WAIT | HTTP_ERROR | NETWORK | BAD_RESPONSE | UNKNOWN
      "queuedAt": "2026-01-01T00:00:00.000Z",
      "claimedAt": null,
      "sentAt": null
    }
  ]
}
```

- **幂等**：同一 `orderId` 二次入队得到 `already-pending` / `already-sent`，`queuedAt` 不会被刷新。
- **有界**：`BROADCAST_QUEUE_MAX_RECORDS`（默认 200，硬上限 2000）。溢出时**先丢最旧的非 PENDING**；
  若全是 PENDING，则拒绝新来者（`dropped-queue-full`），绝不为了腾位置丢掉真实待办。
- **不会永远重试**：`FAILED` 达到 `BROADCAST_MAX_ATTEMPTS` 后转 `SKIPPED`（一个崩溃的 bot
  不能把同一笔悬赏反复打进频道）。
- **损坏即空**：JSON 解析失败按空队列处理，不抛错、不阻塞下单。
- **并发**：读写走 `withQueueLock()`（与 `arc.ts` 的 `payoutQueue` 同构的进程内串行化），
  读-改-写不会互相覆盖；claim 会**落盘盖章**（`claimedAt` + `attempts`），
  `BROADCAST_CLAIM_TTL_MS` 内第二次 claim 拿不到同一条。

---

## 3. 下单路径的挂载点（只有一处，六行）

`src/lib/web5/ap2/commerce.ts`，`createCommerceOrder` 里 `db.taskOrder.create` 的
try/catch 之后、`return mapPrismaOrder(record)` 之前：

```ts
enqueueTaskBroadcast({ orderId: record.orderId, isDemo: record.isDemo }).catch((err: any) =>
  console.warn(`[broadcast] enqueue failed for ${record.orderId}:`, err?.message || err)
);
```

- 不 `await`：队列哪怕是永不 resolve 的 Promise，下单照样返回 `FUNDED`。
- 不抛：`enqueueTaskBroadcast` 内部 `try/catch`，返回 `{ action: 'failed' }` 而不是 reject；
  外层再挂一个 `.catch` 兜住任何意外。**已确认上链的托管绝不能因为「发广告失败」而回滚。**
- 默认空转：无 `TG_BROADCAST_SECRET` 时直接 `skipped-disabled`，**不产生任何 `SystemConfig` 写入**。
- 演示单不入队：`isDemo` 或 `ap2-task-(seed|meme)-*` 一律 `skipped-demo`——把合成订单广播成
  「有人在悬赏」是虚构内容。

---

## 4. HTTP 契约

鉴权：请求头 `x-broadcast-secret: <TG_BROADCAST_SECRET>`（长度 <16 视为未配置）。
比较方式与 `SETTLEMENT_CRON_SECRET` 一致：先长度再 `crypto.timingSafeEqual`。

| 情况 | 状态码 | `code` |
|---|---|---|
| 服务端未配置 secret（**生产当前状态**） | 503 | `BROADCAST_NOT_CONFIGURED` |
| secret 缺失/不匹配 | 401 | `BROADCAST_UNAUTHORIZED` |

### `POST /api/broadcast/claim` · body `{ "limit": 5 }`（≤20，非法值回落 5）

```jsonc
{ "success": true, "claimed": 1, "pending": 3, "skipped": 0,
  "items": [{ "orderId": "...", "parseMode": "HTML", "text": "...",
              "canonicalUrl": "https://web5.blog/task/...",
              "rewardUsdc": "1.5", "escrowVerified": true,
              "queuedAt": "...", "attempts": 1 }] }
```

`GET /api/broadcast/claim` 是无鉴权的就绪探针，只回布尔与常量
（`enabled / secretConfigured / channelConfigured`），**永不回显 secret**，供运维脚本判断
「服务端这一半到底开没开」。

### `POST /api/broadcast/ack` · body `{ "orderId", "ok", "tgMessageId"?, "error"?, "errorKind"?, "status"?: "SKIPPED" }`

```jsonc
{ "success": true, "action": "sent",           // sent | already-sent | failed | skipped | not-found
  "record": { "orderId": "...", "status": "SENT", "tgMessageId": 987654, "attempts": 1, "sentAt": "..." } }
```

`ok: true` 必须带 `tgMessageId`（否则 400 `BROADCAST_RESULT_INVALID`）；重复 SENT ack 返回
`already-sent` 且不改动记录；不在队列里的 orderId 返回 404 `BROADCAST_RECORD_NOT_FOUND` 且不写入。

所有响应都带 `Cache-Control: no-store`。

---

## 5. 文案的事实口径（`telegram-message.ts`）

这是本模块唯一「对用户宣称什么」的地方，规则都写在纯函数里：

1. **只允许我们自己模板产生的标签**。`title` / `description` 先经
   `escapeTelegramHtml()`（`&` → `<` → `>`），因此用户写的 `<script>`、`<b>`、`&` 只会以字面量出现；
   输出中不存在用户可控的 `href`。截断按**已转义串**计算，并保证不切断 `&lt;` 这类实体。
2. **赏金来自 18 位小数字符串**（`parseUsdcToWei` / `formatUsdc`），绝不用 `Number()` 估；
   解析失败 / 为零 / 为负 ⇒ 显示「金额未确认」，绝不默认成 5。
3. **托管只在有可验证的 `escrowTxHash`（`0x` + 64 hex）时才宣称**，并且给出的就是该笔交易的
   浏览器链接；没有哈希时明确写「托管状态未确认 · escrow NOT confirmed on chain」，
   且不出现任何 explorer 链接。
4. **长度硬上限 4096**，超出时以 `…` 截断描述部分，骨架（标题/赏金/托管/链接）永不溢出。
5. 链接只由 `NEXT_PUBLIC_SITE_URL` + `TASK_ROUTE_PREFIX` + orderId 组成；orderId 不满足
   `^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$` 时**回落到站点根**，宁可少给链接也不给可注入的链接。

> ⚠️ 对齐点：`TASK_ROUTE_PREFIX = '/task/'`（即 `https://web5.blog/task/<orderId>`）是本模块
> 对详情页路由的**唯一假设**，详情页 `/task/[orderId]` 由另一位同事实现。若最终路由不是
> `/task/<orderId>`，只需要改这一个常量（`tests/broadcast-message.test.ts` 会立刻把不一致暴露出来）。

---

## 6. bot 侧（`scripts/tg-broadcast.mjs`）

- **默认关闭**：`TG_BROADCAST_SECRET`（≥16）+ `TG_CHANNEL_ID`/`TG_BROADCAST_CHANNEL` +
  `TG_BOT_TOKEN` 三者齐备才启用；否则 `runOnce()` 一个请求都不发，`start()` 只打一行
  `disabled: <原因>` 并返回空 disposer。`scripts/tg-bot.mjs` 只在 `main()` 里挂载它，
  **`--selftest` 路径与 1:1 回复逻辑一字未改**。
- **每单最多发一次**：进程内 sticky dedup（窗口 500 个 orderId），失败过、超时过、
  语义含糊过的 orderId 都不会再试——宁可漏发，不可重发。跨进程重启的兜底是服务端的
  claim 盖章 + ack 幂等。
- **退避**：429 / `FLOOD_WAIT_<n>` 一律听 Telegram 的 `retry_after`（受
  `TG_BROADCAST_MAX_BACKOFF_MS` 上限约束）；5xx 与传输错误按 `base * 2^(n-1)` 指数退避；
  其他 4xx 视为永久失败，不重试、直接 ack 记录 `errorKind`。
- **每轮硬上限**：`TG_BROADCAST_MAX_SENDS_PER_RUN`（默认 5，钳制 1..20），并且
  `claim` 请求就带上这个 `limit`，服务端不会多发。
- **密钥卫生**：`x-broadcast-secret` 只发给**我们自己的 API**，绝不发给 `api.telegram.org`；
  落日志/落 ack 的错误串先经 `safeMessage()` 脱敏（`secret|token|authorization=<value>` → `[redacted]`）。

---

## 7. 打开与关闭（runbook）

```bash
# 1) 服务端（PM2 web 进程）
TG_BROADCAST_SECRET=<≥16 位随机串>        # 只进 .env，不进 git
# 2) bot 进程（同一台或另一台）
TG_BROADCAST_SECRET=<同一串>
TG_CHANNEL_ID=@your_public_channel        # bot 必须已是该频道的管理员
TG_BOT_TOKEN=<BotFather token>
TG_BROADCAST_SITE_URL=https://web5.blog   # 只决定 bot 打给哪个 API

# 3) 验证服务端这一半 armed（只回布尔，不需要密钥）
curl -s https://web5.blog/api/broadcast/claim
# 4) 验证未授权调用被拒
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://web5.blog/api/broadcast/claim   # 期望 401
# 5) 队列水位
curl -s https://web5.blog/api/daemon/health | jq .broadcast
```

**关闭**：删掉服务端 `TG_BROADCAST_SECRET` 并重启 web 进程即可——claim/ack 立刻 503、
下单侧立刻空转；bot 侧再删 `TG_CHANNEL_ID`/`TG_BOT_TOKEN` 就完全静默。队列记录留在
`SystemConfig` 里可审计，必要时按 key 整条删除：

```sql
DELETE FROM "SystemConfig" WHERE "key" = 'broadcast:telegram:queue';
```

---

## 8. 仍然需要人工确认的外部输入

1. **详情页路由**：见第 5 节末尾的对齐点。
2. **频道内容与合规**：公开频道里出现的是**真实订单标题与描述**（已转义、已截断）。
   发布前需要人工确认频道定位、是否中英混排、以及是否需要保留 `@username`。
3. **资金口径**：生产 `MONEY_FLOWS_ENABLED` / `ESCROW_PAYOUTS_ENABLED` / `REFUNDS_ENABLED`
   仍未设置，`PAYOUT_SINGLE_CAP_USDC=5` ⇒ 单笔悬赏上限 6.25 USDC。文案里的「赏金」
   是订单存储原值，不宣称任何放款能力。
4. **单实例前提**：`withQueueLock()` 与 bot 的 dedup 都是**进程内**的。多实例 Web 进程
   并发 claim 目前只靠 `claimedAt` 盖章 + TTL 保护（够用，但窗口内两次 claim 会撞车）；
   如果要跑多个 bot 实例，需要再引入分布式锁或把 ack 幂等扩展成条件写。
5. **本模块不含任何 `--selftest`/测试联网**：所有测试用注入的 fake fetch 与内存版
   `SystemConfig`，不触网、不读真实 token。
