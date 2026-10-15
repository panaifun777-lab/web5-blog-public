# Web5.blog 系统完善工作任务清单 (Improvement Worklist)

> 创建时间：2026-10-15  
> 状态：执行中

## 📋 任务分解与进度追踪

### 第一阶段：核心业务闭环与服务端鉴权修复 (P0 - 阻塞级)
- [x] **任务 1.1**：服务端 Session 鉴权提取与验证重构
  - 修复 `publishContent` 与 `ap2Pay` 直接调用客户端 `sessionStorage` 的致命断层。
  - 支持从 HTTP Header `Authorization: Bearer <sessionToken>` 中提取 Token，并在服务端完成 Token 验证与 Session 上下文恢复。
- [x] **任务 1.2**：前端请求携带 Token
  - 在 `writer.tsx` 发布请求头中注入 `Authorization: Bearer ${session.sessionToken}`。
  - 在 `blog-feed.tsx` 的微支付与阅读上报中注入 `Authorization: Bearer ${session.sessionToken}`。

### 第二阶段：UI 路由与核心交互 Bug 修复 (P1 - 体验级)
- [x] **任务 2.1**：修复 `MODULE_DESCS` 键名映射不一致
  - 将 `page.tsx` 中的 `humanity` -> `humanities`, `piaoshu` -> `experts`，确保点击所有 6 个主导航模块均能正确显示对应描述。
- [x] **任务 2.2**：实现全局搜索框与博客流联动
  - 将 `searchQuery` 传递至 `BlogFeed` 组件，实现按标题、作者与摘要的实时模糊搜索过滤。
- [x] **任务 2.3**：众筹 / 众包 / 悬赏 模块专属占位与交互反馈
  - 当切换到众筹、众包、悬赏模块时，提供专属的 Web5 协议功能预览与引导，提升产品完整度。

### 第三阶段：多语言 i18n 覆盖率提升 (P1 - 国际化)
- [x] **任务 3.1**：主应用首页 `page.tsx` 接入 `useI18n`
  - 动态渲染主导航、登录方式、侧边栏标题、操作按钮等。

### 第四阶段：Web3 与 AI 能力深化规划 (P2 - 演进级)
- [ ] **任务 4.1**：Arweave Irys 真实上传环境与钱包配置
- [ ] **任务 4.2**：Base 智能合约生产环境铸造与微支付结算联调
- [ ] **任务 4.3**：VPS Nginx/Caddy HTTPS 部署与反代配置
