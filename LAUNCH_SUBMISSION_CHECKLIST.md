# Web5.blog 上线推广清单(#71:搜索引擎提交 / 外链建设 / 内容补量)

> 状态标记:`[x]` = 已完成并已实测验证,`[ ]` = 待办。
> 本轮(2026-11-05)实测记录见每项后面的"证据"行。

---

## A. 搜索引擎提交

### A0. 站点侧前置(已全部完成,无需再动)

- [x] `sitemap.xml` 上线且含 5 语言 —— 证据:`https://web5.blog/sitemap.xml` → HTTP 200,9706 B,**34 条 `<loc>`**(zh 根/`en`/`ja`/`ko`/`es` + `/founder` 各语言 + 24 条 `/p/*` 文章)
- [x] `robots.txt` 声明 sitemap —— 证据:`https://web5.blog/robots.txt` → HTTP 200,含 `Sitemap: https://web5.blog/sitemap.xml`
- [x] AI 爬虫可发现入口 —— 证据:`https://web5.blog/llms.txt` → HTTP 200
- [x] IndexNow 全站密钥文件可达 —— 证据:`https://web5.blog/b5d411ce46213fc716a7f0c3b6331708.txt` → HTTP 200

### A1. IndexNow —— 本轮已完成,无需登录任何账号

- [x] 批量提交全部 34 条 URL
  证据:`POST https://api.indexnow.org/indexnow`(JSON body: `host/key/keyLocation/urlList`)→ **HTTP 202 Accepted**
- [x] 单条 GET ping 通路验证
  证据:`GET ...?url=https://web5.blog/&key=b5d4...` → **HTTP 200**;Yandex 镜像 → **202**;Naver 镜像 → **200**
- [ ] Seznam 镜像本轮超时未验证(非关键,可忽略)
- [ ] **日常维护**:每次新增/改动文章后重新 ping。密钥文件路径固定,可直接用:

```
https://api.indexnow.org/indexnow?url=https://web5.blog/zh-CN&key=b5d411ce46213fc716a7f0c3b6331708
```

或把 URL 写进 `C:\Users\Administrator\AppData\Local\Temp\w5_urls.txt`(每行一条)后跑批量 POST:

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @w5_indexnow.json
```

### A2. Google Search Console —— 必须你本人操作(原因见下)

**为什么我没能替你做完**:这台开发机直连 `search.google.com` 完全不通(HTTP 000 超时);经 VPS SOCKS 隧道可以连通(`--socks5 127.0.0.1:10808` → 302)。但用自动化浏览器提交 Google 密码登录,正是 Google 主动拦截的行为,反复失败会给这个 Gmail 账号打上可疑登录标记,代价是**你丢掉邮箱本身**,而不只是 GSC。所以我只走到邮箱页(未提交、未输密码),就此停手。

推荐用**域名级验证**(一次搞定、永久有效、覆盖所有子域与协议):

- [ ] 1. 打开 https://search.google.com/search-console(网络需可达 Google)
- [ ] 2. 添加资源 → 选左侧 **"网域"(Domain)** 而非"网址前缀" → 填 `web5.blog`
- [ ] 3. GSC 会给出一条形如 `google-site-verification=XXXXXXXXXXXXXXXXXXXX` 的 TXT 记录
- [ ] 4. 到 Cloudflare DNS 面板(https://dash.cloudflare.com)为 `web5.blog` 添加该 **TXT** 记录:
      - Type `TXT`,Name `@`(即根域),Content 为 GSC 给的令牌值,Proxy 对 TXT 无影响
- [ ] 5. 回 GSC 点"验证"。域名级验证通常几分钟内通过
- [ ] 6. 左侧 **Sitemaps(站点地图)** → 输入 `https://web5.blog/sitemap.xml` → 提交
- [ ] 7. (可选但建议)对首页用 **网址检查 → 请求编入索引**,加速首批收录

> 备选:若不想动 DNS,可改用"网址前缀"属性 + HTML 文件验证。那需要我把 `google*.html` 放进 `public/` 并**重新构建上线**一次 —— 生产切换要你明确确认,所以默认走上面的 DNS 路线。

### A3. Bing Webmaster Tools —— 需一个 Microsoft 账号

- [ ] 1. 打开 https://www.bing.com/webmasters(本机可直连,已验证 302)
- [ ] 2. 用 Microsoft 账号登录。**注意:你给我的 Gmail 不能直接登 Bing**,Bing 需要 Microsoft 账号
- [ ] 3. 最省事:**"Import from Google Search Console"** —— A2 完成后一键继承验证与站点
- [ ] 4. 若无 GSC:用 meta 标签 / DNS CNAME / robots 任一方式验证,再 Sites → Sitemaps 提交同一 URL
- [ ] 5. 说明:Bing 也会自动发现 `robots.txt` 里的 Sitemap 声明,因此 A2 之后即使不显式提交也会逐步收录

---

## B. 外链建设(按性价比排序)

- [ ] **加密目录收录 $WBOG**:CoinGecko / CoinMarketCap
      前置条件**尚未满足**:需要已上 DEX 且有真实行情。当前生产 money flags 全 OFF、无流动性,强行提交会被拒。
      仓库已有 `COINGECKO_SUBMISSION_GUIDE.md`,等主网灰度通过后再按该指南提交。
- [ ] **DEX / 链上档案互链**:Uniswap 代币页、Arc explorer 合约页(`WBOG 0x5be2d3…2f5f`、`ContentNFT 0x8537fe…1c8a`、`VesselAuth 0x2d4aeb…a120`)、Irys/Arweave 存证记录,均回链 `web5.blog`
- [ ] **自有矩阵**:t.me/Web5blog 频道置顶挂站、GitHub 公开库 `web5-blog-public` README 首屏链接、`/llms.txt` 与 `/.well-known/agent.json` 作为 AI-agent 可发现入口(后两者已上线)
- [ ] **反链**:向 Web5 / AI-agent 聚合站、x402 与 AP2 生态目录提交站点条目;争取 2-3 篇生态媒体介绍稿换 dofollow 链接

---

## C. 内容补量

- [ ] 每种可索引语言(`zh-CN`/`en`/`ja`/`ko`/`es`)保证 **5-8 篇奠基长文**
      现状:演示/占位内容多、真实文章少。已实测 `/en/task/order-demo` → **404**(演示订单正确不暴露),但 `/p/*` 仅 24 条且分布不均
- [ ] 让 AI 分身按固定节奏产出原创博文并走 Arweave + NFT 确权 —— 天然产生 sitemap 增量与存证外链
- [ ] 优先扩 **英文 / 日文** 目录(索引面最大),补齐各语言间 hreflang 交叉
- [ ] 每批新文章上线后,执行 A1 的 IndexNow 批量提交(这是唯一需要你或我定期做的维护动作)

---

## D. 本轮完成度小结

| 项 | 结果 |
|---|---|
| 站点侧 SEO 前置(sitemap/robots/llms/IndexNow key) | 全部 200,实测通过 |
| IndexNow 全站提交 | **已完成**,34 URL → HTTP 202 |
| Google Search Console | **未完成** —— 本机不通 Google;自动化登录有锁号风险,已交回你操作 |
| Bing Webmaster | **未完成** —— 需 Microsoft 账号(你提供的是 Gmail) |
| 外链 / 内容补量 | 待办;加密目录受主网未就绪阻塞 |
