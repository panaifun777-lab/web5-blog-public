// ════════════════════════════════════════════════════════════════
// src/instrumentation.ts
// Next.js 服务器启动钩子 — 启动常驻无头守护进程
// 负责：同行评审 / 认知信标 / AP2 任务自动交付清算 / 外部机会周期抓取
//
// 注意：仅在 Node.js runtime 启动；Edge runtime 直接跳过。
// ════════════════════════════════════════════════════════════════

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.AGENT_DAEMON_ENABLED !== 'true') {
    console.log('[instrumentation] Agent daemon disabled (AGENT_DAEMON_ENABLED != true)');
    return;
  }
  if (process.env.DISABLE_AGENT_DAEMON === 'true') {
    console.log('[instrumentation] Agent daemon disabled via env');
    return;
  }

  try {
    const { agentDaemon } = await import('@/lib/web5/daemon/agent-daemon');
    const intervalMs = Number(process.env.AGENT_DAEMON_INTERVAL_MS || 60000);
    agentDaemon.start(intervalMs);
    console.log(
      `[instrumentation] Agent daemon started (interval ${intervalMs}ms)`
    );
  } catch (err: any) {
    console.error('[instrumentation] Failed to start agent daemon:', err?.message);
  }
}
