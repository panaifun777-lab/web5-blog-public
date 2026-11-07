// x402 money flags must live in src/lib/launch/flags.ts and follow the
// centralized, fail-closed pattern. Previously the x402 gate read
// process.env directly with inverted fail semantics (only paused when
// explicitly 'false', so unset meant charge-by-default). These tests pin
// the centralized flags so a misconfigured env can never silently enable
// charging.

import { afterEach, describe, expect, it, vi } from 'vitest';

const SWITCHES = ['MONEY_FLOWS_ENABLED', 'X402_PAYMENTS_ENABLED', 'X402_REQUIRE_PREPAID'];

const originalEnv = { ...process.env };

// Flags are frozen at module load, so env changes need a fresh module graph.
async function flagsWith(env: Record<string, string>) {
  vi.resetModules();
  for (const name of SWITCHES) delete process.env[name];
  for (const [name, value] of Object.entries(env)) {
    process.env[name] = value;
  }
  return await import('@/lib/launch/flags');
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('x402 centralized money flags', () => {
  it('keeps everything off with safe defaults when nothing is set', async () => {
    const flags = await flagsWith({});
    expect(flags.X402_PAYMENTS_LIVE).toBe(false);
    expect(flags.X402_REQUIRE_PREPAID).toBe(true);
  });

  it('refuses to go live on X402_PAYMENTS_ENABLED alone (master link)', async () => {
    const flags = await flagsWith({ X402_PAYMENTS_ENABLED: 'true' });
    expect(flags.X402_PAYMENTS_ENABLED).toBe(true);
    expect(flags.X402_PAYMENTS_LIVE).toBe(false);
  });

  it('goes live only when both master and x402 switches are on', async () => {
    const flags = await flagsWith({
      MONEY_FLOWS_ENABLED: 'true',
      X402_PAYMENTS_ENABLED: 'true',
    });
    expect(flags.X402_PAYMENTS_LIVE).toBe(true);
  });

  it('requires prepaid settlement by default and only disables on explicit false', async () => {
    expect((await flagsWith({})).X402_REQUIRE_PREPAID).toBe(true);
    expect((await flagsWith({ X402_REQUIRE_PREPAID: 'false' })).X402_REQUIRE_PREPAID).toBe(false);
  });

  it('accepts 1 as well as true for the payments switch', async () => {
    expect(
      (
        await flagsWith({ MONEY_FLOWS_ENABLED: '1', X402_PAYMENTS_ENABLED: '1' })
      ).X402_PAYMENTS_LIVE
    ).toBe(true);
  });
});
