// ════════════════════════════════════════════════════════════════
// ops-common.mjs — shared helpers for Web5.blog ops scripts
//
// SINGLE SOURCE OF TRUTH for the pure money math is
//   src/lib/web5/payments/hot-wallet.ts  (in the app repo).
// The mirrors below are intentionally byte-faithful copies so these
// out-of-git ops scripts can be exercised offline (no viem / no RPC).
// If you change the app's rails, change them here too — the unit tests
// in tests/hot-wallet.test.ts are the enforcement point.
//
// No network, no viem imports in this file — keep it that way so the
// dry-run paths are fully offline-testable.
// ════════════════════════════════════════════════════════════════

export const USDC_UNIT = 10n ** 18n;
export const DEFAULT_HOT_WALLET_MAX_USDC = 20;
export const DEFAULT_SWEEP_RESERVE_USDC = 5;
/** USDC is the gas token on Arc, so a sweep may never strand the wallet. */
export const GAS_HEADROOM_WEI = USDC_UNIT / 10n; // 0.1 USDC
export const MIN_SWEEP_WEI = USDC_UNIT / 2n; // 0.5 USDC

/** Production treasury (Arc Mainnet). Override at runtime with TREASURY_ADDRESS. */
export const DEFAULT_TREASURY = '0xCA36335845E382129167fC44243F07A76827bA22';

/** Arc Mainnet is the default active chain. Mirrors src/lib/web5/contracts/addresses.ts. */
export const ARC_MAINNET = {
  id: 5042,
  name: 'Arc Mainnet',
  rpcUrl: 'https://rpc.mainnet.arc.io',
  explorer: 'https://explorer.arc.io',
  usdcDecimals: 18,
};

function envValue(name) {
  return (process.env[name] || '').trim();
}

function isAddressLike(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

// ── USDC parsing (decimal-string only; no floats) ────────────────

export function parseUsdcToWei(value) {
  const raw = (typeof value === 'number' ? String(value) : value).trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid USDC amount: ${raw}`);
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > 18) throw new Error(`Invalid USDC amount (max 18 decimals): ${raw}`);
  const fraction = frac.padEnd(18, '0');
  return BigInt(whole) * USDC_UNIT + (fraction ? BigInt(fraction) : 0n);
}

export function formatUsdc(wei) {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / USDC_UNIT;
  const frac = (abs % USDC_UNIT).toString().padStart(18, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

// ── Env-driven rails (mirror of hot-wallet.ts) ───────────────────

export function getHotWalletCeilingWei() {
  const raw = envValue('HOT_WALLET_MAX_USDC');
  if (!raw) return BigInt(DEFAULT_HOT_WALLET_MAX_USDC) * USDC_UNIT;
  try {
    const parsed = parseUsdcToWei(raw);
    const hardMax = BigInt(DEFAULT_HOT_WALLET_MAX_USDC) * USDC_UNIT;
    if (parsed <= 0n) return hardMax;
    return parsed < hardMax ? parsed : hardMax;
  } catch {
    return BigInt(DEFAULT_HOT_WALLET_MAX_USDC) * USDC_UNIT;
  }
}

export function getSweepReserveWei() {
  const raw = envValue('HOT_WALLET_SWEEP_RESERVE_USDC');
  if (!raw) return BigInt(DEFAULT_SWEEP_RESERVE_USDC) * USDC_UNIT;
  try {
    return parseUsdcToWei(raw);
  } catch {
    return BigInt(DEFAULT_SWEEP_RESERVE_USDC) * USDC_UNIT;
  }
}

// ── Ceiling decision (mirror of hot-wallet.ts checkHotWalletCeiling) ─

export function checkHotWalletCeiling({ balanceWei, pendingPayoutWei, ceilingWei }) {
  const cWei = ceilingWei ?? getHotWalletCeilingWei();
  const headroomWei = balanceWei >= cWei ? 0n : cWei - balanceWei;
  const base = { balanceWei, pendingPayoutWei, ceilingWei: cWei, headroomWei };

  if (typeof pendingPayoutWei !== 'bigint' || pendingPayoutWei <= 0n) {
    return { ...base, ok: false, reason: 'INVALID_PAYOUT_AMOUNT', detail: 'Payout amount must be a positive integer amount of wei' };
  }
  if (balanceWei > cWei) {
    return { ...base, ok: false, reason: 'HOT_WALLET_CEILING_EXCEEDED', detail: `treasury balance ${formatUsdc(balanceWei)} USDC exceeds the ${formatUsdc(cWei)} USDC hot-wallet ceiling; sweep to the cold address before paying out` };
  }
  if (pendingPayoutWei > balanceWei) {
    return { ...base, ok: false, reason: 'INSUFFICIENT_HOT_WALLET_BALANCE', detail: `payout ${formatUsdc(pendingPayoutWei)} USDC but the treasury holds ${formatUsdc(balanceWei)} USDC` };
  }
  return { ...base, ok: true, reason: 'WITHIN_CEILING', detail: `payout ${formatUsdc(pendingPayoutWei)} USDC within the ${formatUsdc(cWei)} USDC hot-wallet ceiling (balance ${formatUsdc(balanceWei)} USDC)` };
}

// ── Sweep planner (mirror of hot-wallet.ts planSweep) ────────────

export function planSweep({ balance, reserve, coldAddress }) {
  const balanceWei = balance;
  const reserveWei = reserve ?? getSweepReserveWei();
  const remainingWei = balanceWei > reserveWei ? reserveWei : balanceWei;

  const refuse = (reason, detail) => ({ ok: false, reason, detail, to: null, amountWei: 0n, amountUsdc: '0', balanceWei, reserveWei, remainingWei });

  if (typeof balanceWei !== 'bigint' || balanceWei < 0n) {
    return refuse('INVALID_BALANCE', 'Balance must be a non-negative integer amount of wei');
  }
  if (!isAddressLike(coldAddress)) {
    return refuse('INVALID_COLD_ADDRESS', 'Cold address is not a valid address');
  }
  if (typeof reserveWei !== 'bigint' || reserveWei < GAS_HEADROOM_WEI) {
    return refuse('RESERVE_BELOW_GAS_HEADROOM', `Reserve ${formatUsdc(reserveWei < 0n ? 0n : reserveWei)} USDC is below the ${formatUsdc(GAS_HEADROOM_WEI)} USDC gas headroom floor; USDC is gas on Arc`);
  }
  if (balanceWei <= reserveWei) {
    return refuse('NOTHING_TO_SWEEP', `Balance ${formatUsdc(balanceWei)} USDC is at or below the ${formatUsdc(reserveWei)} USDC reserve`);
  }
  const amountWei = balanceWei - reserveWei;
  if (amountWei < MIN_SWEEP_WEI) {
    return refuse('BELOW_MIN_SWEEP', `Sweep of ${formatUsdc(amountWei)} USDC is below the ${formatUsdc(MIN_SWEEP_WEI)} USDC minimum`);
  }
  return { ok: true, reason: 'SWEEP', detail: `Sweep ${formatUsdc(amountWei)} USDC to ${coldAddress}, keeping ${formatUsdc(reserveWei)} USDC of float/gas in the hot wallet`, to: coldAddress, amountWei, amountUsdc: formatUsdc(amountWei), balanceWei, reserveWei, remainingWei };
}

// ── Address / chain resolution (mirror of addresses.ts) ──────────

export function getTreasuryAddress() {
  const override = envValue('TREASURY_ADDRESS');
  return isAddressLike(override) ? override : DEFAULT_TREASURY;
}

export function getActiveChain() {
  const target = envValue('NEXT_PUBLIC_ACTIVE_CHAIN').toLowerCase() || 'arc-mainnet';
  if (target === 'arc-testnet') {
    return { id: 5042002, name: 'Arc Testnet', rpcUrl: envValue('ARC_TESTNET_RPC') || 'https://rpc.testnet.arc.io', explorer: 'https://explorer.testnet.arc.io', usdcDecimals: 18 };
  }
  return { id: ARC_MAINNET.id, name: ARC_MAINNET.name, rpcUrl: envValue('ARC_MAINNET_RPC') || ARC_MAINNET.rpcUrl, explorer: ARC_MAINNET.explorer, usdcDecimals: 18 };
}

// ── Authorization gate ───────────────────────────────────────────
// Every script that can move real money MUST call this and refuse
// unless --authorize was passed on the command line. No exceptions.

export class AuthorizationError extends Error {
  constructor() {
    super('REFUSED: this is a DRY RUN. Re-run with --authorize to actually broadcast a transaction.');
    this.name = 'AuthorizationError';
  }
}

export function requireAuthorize(flags) {
  if (!flags.authorize) throw new AuthorizationError();
}

// ── Tiny argv helper (no dependency) ────────────────────────────

export function parseFlags(argv, { boolean = [], string = [] } = {}) {
  const flags = {};
  for (const key of boolean) flags[key] = false;
  for (const key of string) flags[key] = undefined;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    if (boolean.includes(name)) {
      flags[name] = true;
    } else if (string.includes(name)) {
      flags[name] = argv[i + 1];
      i++;
    }
  }
  return flags;
}
