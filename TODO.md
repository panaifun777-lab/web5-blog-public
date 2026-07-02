# 设计改进清单 — 当前完成与待办

> 2026-07-02 15:51 更新

## ✅ 已完成

| 任务 | 状态 | 说明 |
|------|------|------|
| z.ai 引用删除 | ✅ | `eidolon-writer.ts` 注释移除 |
| Footer 组件 | ✅ | `src/components/web5/footer.tsx` — 合约地址、社交、版权 |
| Footer 集成 | ✅ | page.tsx 中替换原简陋 footer |
| 布局改为左对齐 | ✅ | 使用 5 列 grid，内容占 3/5，右面板占 2/5 |
| 重复文件清理 | ✅ | `src/components/web5/matrix-rain.tsx` 已删除 |
| MatrixRain 背景 | ✅ | 原有 `effects/matrix-rain.tsx` 已生效 |
| 项目总结文档 | ✅ | `PROJECT_SUMMARY.md` |
| 合约指南文档 | ✅ | `CONTRACT_GUIDE.md` |

## ❌ 待完成

| 任务 | 优先级 | 说明 |
|------|--------|------|
| App 视图背景 | P1 | 登录后的 app view 缺少 MatrixRain |
| LanguageSwitcher | P2 | 组件存在但未渲染（上下文/渲染问题） |
| 导航项占位页 | P1 | 众筹/众包/悬赏 点击需有反馈 |
| 上传 VPS | P0 | 所有改动需要同步到 VPS |
