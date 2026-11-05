// The autonomous agent surface must not be able to act on its own unless the
// explicit switch is on. `/api/autonomous/tick` was already gated; the headless
// daemon previously booted on AGENT_DAEMON_ENABLED alone, which let unattended
// peer reviews, auto-delivery and crawling run while "autonomous agents" were
// reported as disabled. These tests pin the shared gate.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/web5/autonomous/scheduler', () => ({
  autonomousTick: vi.fn(async () => []),
}));

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

const SWITCHES = ['AUTONOMOUS_AGENTS_ENABLED', 'AGENT_DAEMON_ENABLED', 'DISABLE_AGENT_DAEMON'];

const originalEnv = { ...process.env };

// Flags are frozen at module load, so env changes need a fresh module graph.
async function flagsWith(env: Record<string, string>) {
  vi.resetModules();
  for (const name of SWITCHES) delete process.env[name];
  for (const [name, value] of Object.entries(env)) {
    process.env[name] = value;
  }
  const mod = await import('@/lib/launch/flags');
  return {
    active: mod.agentDaemonActive(),
    daemonOn: mod.AGENT_DAEMON_ENABLED,
    agentsOn: mod.AUTONOMOUS_AGENTS_ENABLED,
  };
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('autonomous agent gate', () => {
  it('keeps the daemon off when nothing is opted in', async () => {
    const flags = await flagsWith({});
    expect(flags.agentsOn).toBe(false);
    expect(flags.daemonOn).toBe(false);
    expect(flags.active).toBe(false);
  });

  it('refuses to start the daemon on AGENT_DAEMON_ENABLED alone', async () => {
    const flags = await flagsWith({ AGENT_DAEMON_ENABLED: 'true' });
    expect(flags.daemonOn).toBe(true);
    expect(flags.active).toBe(false);
  });

  it('starts only when both switches are on, and accepts 1 as well as true', async () => {
    expect((await flagsWith({ AUTONOMOUS_AGENTS_ENABLED: 'true', AGENT_DAEMON_ENABLED: 'true' })).active).toBe(true);
    expect((await flagsWith({ AUTONOMOUS_AGENTS_ENABLED: '1', AGENT_DAEMON_ENABLED: '1' })).active).toBe(true);
  });

  it('lets the ops kill switch override both switches', async () => {
    for (const value of ['true', '1']) {
      const flags = await flagsWith({
        AUTONOMOUS_AGENTS_ENABLED: 'true',
        AGENT_DAEMON_ENABLED: 'true',
        DISABLE_AGENT_DAEMON: value,
      });
      expect(flags.active).toBe(false);
    }
  });

  it('refuses to schedule the daemon loop while the gate is off', async () => {
    vi.resetModules();
    for (const name of SWITCHES) delete process.env[name];
    const setIntervalSpy = vi.fn();
    vi.stubGlobal('setInterval', setIntervalSpy);
    const { agentDaemon } = await import('@/lib/web5/daemon/agent-daemon');
    agentDaemon.start(60_000);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('refuses the cron tick with a 503 while autonomous agents are off', async () => {
    vi.resetModules();
    for (const name of SWITCHES) delete process.env[name];
    const { POST } = await import('@/app/api/autonomous/tick/route');
    const req = new NextRequest('http://localhost/api/autonomous/tick', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'AUTONOMOUS_AGENTS_DISABLED', demo: true });
  });
});
