import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import {
  DEFAULT_HOT_WALLET_MAX_USDC,
  DEFAULT_SWEEP_RESERVE_USDC,
  GAS_HEADROOM_WEI,
  MIN_SWEEP_WEI,
  USDC_UNIT,
  checkHotWalletCeiling,
  formatUsdc,
  getHotWalletCeilingWei,
  getSweepReserveWei,
  parseUsdcToWei,
  planSweep,
} from '@/lib/web5/payments/hot-wallet';
import {
  LocalKeySigner,
  PayoutSignerError,
  RemoteKmsSigner,
  SIGNER_ENV,
  assertPayoutSignerReady,
  describeSigner,
  resolveSigner,
} from '@/lib/web5/payments/signer';

// ── Frozen environment ────────────────────────────────────────────
// No network and no signing happen here: the only "remote" calls are stubbed
// fetch implementations, and the local signer is only asked for its address
// (a pure key → address derivation).

const ENV_KEYS = [
  'HOT_WALLET_MAX_USDC',
  'HOT_WALLET_SWEEP_RESERVE_USDC',
  'KMS_SIGNER_URL',
  'KMS_SIGNER_TOKEN',
  'KMS_SIGNER_ADDRESS',
  'TREASURY_PAYOUT_PRIVATE_KEY',
  'TREASURY_ADDRESS',
  'NEXT_PUBLIC_ACTIVE_CHAIN',
] as const;

const ORIGINAL_ENV: Record<string, string | undefined> = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

function resetEnv() {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const USDC = USDC_UNIT;
const CEILING_20 = BigInt(DEFAULT_HOT_WALLET_MAX_USDC) * USDC;
const COLD = '0x00000000000000000000000000000000000000c0';
const RECIPIENT = '0x1111111111111111111111111111111111111111';

// Deterministic test key (anvil/hardhat account #0). Never used on any chain.
const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ADDRESS = privateKeyToAccount(TEST_KEY).address;

beforeEach(() => {
  resetEnv();
});

afterEach(() => {
  resetEnv();
  vi.unstubAllGlobals();
});

// ── Hot-wallet ceiling ────────────────────────────────────────────

describe('checkHotWalletCeiling', () => {
  it('allows a payout while the balance is exactly at the 20 USDC ceiling', () => {
    const decision = checkHotWalletCeiling({
      balanceWei: CEILING_20,
      pendingPayoutWei: 5n * USDC,
    });
    expect(decision).toMatchObject({
      ok: true,
      reason: 'WITHIN_CEILING',
      ceilingWei: CEILING_20,
      headroomWei: 0n,
    });
  });

  it('allows a payout equal to the whole balance at the ceiling', () => {
    const decision = checkHotWalletCeiling({
      balanceWei: CEILING_20,
      pendingPayoutWei: CEILING_20,
    });
    expect(decision).toMatchObject({ ok: true, reason: 'WITHIN_CEILING' });
  });

  it('refuses one wei above the ceiling', () => {
    const decision = checkHotWalletCeiling({
      balanceWei: CEILING_20 + 1n,
      pendingPayoutWei: 1n * USDC,
    });
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe('HOT_WALLET_CEILING_EXCEEDED');
    expect(decision.headroomWei).toBe(0n);
    expect(decision.detail).toContain('HOT_WALLET_CEILING_EXCEEDED');
  });

  it('refuses a payout one wei larger than the balance', () => {
    const decision = checkHotWalletCeiling({
      balanceWei: 3n * USDC,
      pendingPayoutWei: 3n * USDC + 1n,
    });
    expect(decision).toMatchObject({
      ok: false,
      reason: 'INSUFFICIENT_HOT_WALLET_BALANCE',
    });
  });

  it('refuses a non-positive payout amount', () => {
    for (const amount of [0n, -1n]) {
      expect(
        checkHotWalletCeiling({ balanceWei: 10n * USDC, pendingPayoutWei: amount })
      ).toMatchObject({ ok: false, reason: 'INVALID_PAYOUT_AMOUNT' });
    }
  });

  it('honours HOT_WALLET_MAX_USDC when it tightens the ceiling', () => {
    process.env.HOT_WALLET_MAX_USDC = '10';
    expect(getHotWalletCeilingWei()).toBe(10n * USDC);
    expect(
      checkHotWalletCeiling({ balanceWei: 10n * USDC + 1n, pendingPayoutWei: USDC }).ok
    ).toBe(false);
  });

  it('never lets env raise the ceiling above the 20 USDC hard default', () => {
    process.env.HOT_WALLET_MAX_USDC = '100';
    expect(getHotWalletCeilingWei()).toBe(CEILING_20);
    process.env.HOT_WALLET_MAX_USDC = 'not-a-number';
    expect(getHotWalletCeilingWei()).toBe(CEILING_20);
    expect(getHotWalletCeilingWei()).toBe(BigInt(DEFAULT_HOT_WALLET_MAX_USDC) * USDC);
  });

  it('parses and formats USDC without floats', () => {
    expect(parseUsdcToWei('20')).toBe(CEILING_20);
    expect(parseUsdcToWei('0.000000000000000001')).toBe(1n);
    expect(parseUsdcToWei(2.5)).toBe(25n * USDC / 10n);
    expect(formatUsdc(CEILING_20 + 1n)).toBe('20.000000000000000001');
    expect(formatUsdc(CEILING_20)).toBe('20');
    expect(() => parseUsdcToWei('1e-7')).toThrow();
    expect(() => parseUsdcToWei('-1')).toThrow();
  });
});

// ── Signer selection ──────────────────────────────────────────────

describe('resolveSigner', () => {
  it('selects the unchanged local key when no KMS variable is set', () => {
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    const signer = resolveSigner();
    expect(signer.kind).toBe('local-key');
    expect(signer).toBeInstanceOf(LocalKeySigner);
  });

  it('selects the remote KMS signer when URL and token are configured', () => {
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'test-token';

    const signer = resolveSigner();
    expect(signer.kind).toBe('remote-kms');
    expect(signer).toBeInstanceOf(RemoteKmsSigner);
  });

  it('does not fall back to the local key when only the KMS URL is set', async () => {
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(resolveSigner().kind).toBe('remote-kms');
    expect(describeSigner()).toMatchObject({ active: 'remote-kms', ready: false });
    expect(() => assertPayoutSignerReady()).toThrowError(PayoutSignerError);
    try {
      assertPayoutSignerReady();
    } catch (err) {
      expect((err as PayoutSignerError).code).toBe('KMS_NOT_CONFIGURED');
      expect((err as Error).message).toContain('KMS_SIGNER_TOKEN');
    }

    await expect(
      resolveSigner().sendNativeUsdc(RECIPIENT as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'KMS_NOT_CONFIGURED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not fall back to the local key when only the KMS token is set', async () => {
    process.env.KMS_SIGNER_TOKEN = 'test-token';
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    expect(resolveSigner().kind).toBe('remote-kms');
    await expect(
      resolveSigner().sendNativeUsdc(RECIPIENT as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'KMS_NOT_CONFIGURED' });
  });

  it('never signs locally when the remote signer fails', async () => {
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'test-token';
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    await expect(
      resolveSigner().sendNativeUsdc(RECIPIENT as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'KMS_REQUEST_FAILED' });
  });

  it('posts the documented KMS wire contract and returns the reported hash', async () => {
    delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN; // pin Arc mainnet 5042
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'test-token';
    const txHash = `0x${'ab'.repeat(32)}`;
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ txHash }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await resolveSigner().sendNativeUsdc(
      RECIPIENT as `0x${string}`,
      (5n * USDC) / 2n
    );
    expect(result).toBe(txHash);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchSpy.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(url).toBe('https://kms.example.test/sign');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-token');
    expect(JSON.parse(String(init.body))).toEqual({
      to: RECIPIENT,
      amount: '2500000000000000000',
      chainId: 5042,
    });
  });

  it('rejects a KMS response without a valid txHash', async () => {
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ txHash: '0x1234' }), { status: 200 })));

    await expect(
      resolveSigner().sendNativeUsdc(RECIPIENT as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'KMS_BAD_RESPONSE' });
  });

  it('refuses a plain-http KMS URL that is not loopback', () => {
    process.env.KMS_SIGNER_URL = 'http://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'test-token';

    expect(() => assertPayoutSignerReady()).toThrowError(PayoutSignerError);
    try {
      assertPayoutSignerReady();
    } catch (err) {
      expect((err as PayoutSignerError).code).toBe('KMS_URL_INVALID');
    }
  });

  it('reports the active signer without leaking secrets', () => {
    process.env.KMS_SIGNER_URL = 'https://kms.example.test/sign';
    process.env.KMS_SIGNER_TOKEN = 'super-secret-token';
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    const description = describeSigner();
    expect(description).toMatchObject({
      active: 'remote-kms',
      source: 'KMS_SIGNER_URL',
      ready: true,
      remote: { requested: true, urlConfigured: true, tokenConfigured: true, missingEnv: [] },
    });
    expect(JSON.stringify(description)).not.toContain('super-secret-token');
    expect(JSON.stringify(description)).not.toContain('kms.example.test');
  });

  it('reports local-key mode when only the payout key is configured', () => {
    delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN; // pin Arc mainnet 5042
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    expect(describeSigner()).toMatchObject({
      active: 'local-key',
      source: 'TREASURY_PAYOUT_PRIVATE_KEY',
      ready: true,
      remote: { requested: false },
      local: { keyConfigured: true, keyMatchesTreasury: true },
      chainId: 5042,
    });
  });
});

// ── Local key signer (today's behaviour) ──────────────────────────

describe('LocalKeySigner', () => {
  it('derives the treasury address from TREASURY_PAYOUT_PRIVATE_KEY', async () => {
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    await expect(new LocalKeySigner().address()).resolves.toBe(TEST_ADDRESS);
  });

  it('throws a typed error when the payout key is missing', async () => {
    await expect(new LocalKeySigner().address()).rejects.toMatchObject({
      code: 'LOCAL_KEY_MISSING',
    });
    await expect(
      new LocalKeySigner().sendNativeUsdc(RECIPIENT as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'LOCAL_KEY_MISSING' });
  });

  it('refuses a key that does not belong to the treasury address', async () => {
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = '0x2222222222222222222222222222222222222222';

    await expect(new LocalKeySigner().address()).rejects.toMatchObject({
      code: 'LOCAL_KEY_TREASURY_MISMATCH',
    });
  });

  it('rejects an invalid recipient or amount before touching the chain', async () => {
    process.env.TREASURY_PAYOUT_PRIVATE_KEY = TEST_KEY;
    process.env.TREASURY_ADDRESS = TEST_ADDRESS;

    await expect(
      new LocalKeySigner().sendNativeUsdc('not-an-address' as `0x${string}`, USDC)
    ).rejects.toMatchObject({ code: 'INVALID_RECIPIENT' });
    await expect(
      new LocalKeySigner().sendNativeUsdc(RECIPIENT as `0x${string}`, 0n)
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
  });
});

// ── Sweep planner (planning only) ─────────────────────────────────

describe('planSweep', () => {
  it('sweeps everything above the reserve to the cold address', () => {
    const plan = planSweep({ balance: 30n * USDC, reserve: 5n * USDC, coldAddress: COLD });
    expect(plan).toMatchObject({
      ok: true,
      reason: 'SWEEP',
      to: COLD,
      amountWei: 25n * USDC,
      amountUsdc: '25',
      reserveWei: 5n * USDC,
      remainingWei: 5n * USDC,
    });
  });

  it('leaves the gas reserve untouched and is exact at 18 decimals', () => {
    const balance = 5n * USDC + USDC / 2n + 7n;
    const plan = planSweep({ balance, reserve: 5n * USDC, coldAddress: COLD });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.amountWei).toBe(USDC / 2n + 7n);
    expect(plan.remainingWei).toBe(5n * USDC);
    expect(plan.amountWei + plan.remainingWei).toBe(balance);
    expect(plan.amountWei > 0n).toBe(true);
    expect(plan.remainingWei >= GAS_HEADROOM_WEI).toBe(true);
  });

  it('is a no-op when the balance is at the reserve', () => {
    const plan = planSweep({ balance: 5n * USDC, reserve: 5n * USDC, coldAddress: COLD });
    expect(plan).toMatchObject({
      ok: false,
      reason: 'NOTHING_TO_SWEEP',
      amountWei: 0n,
      to: null,
    });
  });

  it('is a no-op below the reserve and never moves the reserve out', () => {
    const plan = planSweep({ balance: 2n * USDC, reserve: 5n * USDC, coldAddress: COLD });
    expect(plan).toMatchObject({ ok: false, reason: 'NOTHING_TO_SWEEP', amountWei: 0n });
    expect(plan.remainingWei).toBe(2n * USDC);
  });

  it('skips a dust-sized sweep instead of broadcasting it', () => {
    const plan = planSweep({ balance: 5n * USDC + 1n, reserve: 5n * USDC, coldAddress: COLD });
    expect(plan).toMatchObject({ ok: false, reason: 'BELOW_MIN_SWEEP', amountWei: 0n });
    expect(MIN_SWEEP_WEI).toBe(USDC / 2n);
  });

  it('refuses a reserve below the gas headroom floor', () => {
    for (const reserve of [0n, GAS_HEADROOM_WEI - 1n]) {
      expect(planSweep({ balance: 30n * USDC, reserve, coldAddress: COLD })).toMatchObject({
        ok: false,
        reason: 'RESERVE_BELOW_GAS_HEADROOM',
        amountWei: 0n,
      });
    }
  });

  it('defaults the reserve to HOT_WALLET_SWEEP_RESERVE_USDC', () => {
    expect(getSweepReserveWei()).toBe(BigInt(DEFAULT_SWEEP_RESERVE_USDC) * USDC);
    process.env.HOT_WALLET_SWEEP_RESERVE_USDC = '7';
    expect(getSweepReserveWei()).toBe(7n * USDC);
    expect(planSweep({ balance: 10n * USDC, coldAddress: COLD })).toMatchObject({
      ok: true,
      amountWei: 3n * USDC,
      reserveWei: 7n * USDC,
    });
  });

  it('rejects an invalid cold address or negative balance', () => {
    expect(planSweep({ balance: 30n * USDC, reserve: 5n * USDC, coldAddress: '0x1234' })).toMatchObject({
      ok: false,
      reason: 'INVALID_COLD_ADDRESS',
      amountWei: 0n,
    });
    expect(planSweep({ balance: -1n, reserve: 5n * USDC, coldAddress: COLD })).toMatchObject({
      ok: false,
      reason: 'INVALID_BALANCE',
      amountWei: 0n,
    });
  });
});

// ── Env contract sanity ───────────────────────────────────────────

describe('signer env contract', () => {
  it('uses the documented variable names', () => {
    expect(SIGNER_ENV).toEqual({
      localKey: 'TREASURY_PAYOUT_PRIVATE_KEY',
      kmsUrl: 'KMS_SIGNER_URL',
      kmsToken: 'KMS_SIGNER_TOKEN',
      kmsAddress: 'KMS_SIGNER_ADDRESS',
    });
  });
});
