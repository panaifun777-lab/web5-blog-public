// ════════════════════════════════════════════════════════════════
// scripts/run-daemon.mjs
// PM2 独立挂载脚本：常驻运行无头分身自主守护引擎
// ════════════════════════════════════════════════════════════════

import { agentDaemon } from '../src/lib/web5/daemon/agent-daemon.js';

console.log('🚀 [Web5 Microkernel] Initializing Headless Agent Daemon Process...');
agentDaemon.start(25000); // 每 25 秒心跳自愈与自治巡航

process.on('SIGINT', () => {
  console.log('Stopping daemon gracefully...');
  agentDaemon.stop();
  process.exit(0);
});
