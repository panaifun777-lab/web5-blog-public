// ════════════════════════════════════════════════════════════════
// src/lib/web5/payments/hot-wallet.ts
// Hot-wallet exposure rails for the Arc treasury (P0, checklist 4.3).
//
// Two pure functions, no I/O, no signing:
//
//   checkHotWalletCeiling({ balanceWei, pendingPayoutWei })
//       Refuses a payout *before* any send when the hot wallet holds more
//       than HOT_WALLET_MAX_USDC (default 20), when it cannot cover the
//       payout, or when the amount is not positive.
//
//   planSweep({ balance, reserve, coldAddress })
//       Plans a balance reduction to the cold address. Planning only: the
//       returned amount must still be signed by a human/KMS. USDC is the gas
//       token on Arc, so the reserve is never allowed under the gas headroom
//       floor — a sweep can never strand the wallet without gas.
//
// USDC on Arc has 18 decimals; every amount here is bigint wei. No floats are
// used for arithmetic (env parsing is decimal-string based).
// ════════════════════════════════════════════════════════════════

import { isAddress } from 'viem';

export type Address = `0x${string}`;

export const USDC_DECIMALS = 18;
export const USDC_UNIT = 10n ** 18n;

/** Hard default for the hot-wallet balance ceiling (USDC). */
export const DEFAULT_HOT_WALLET_MAX_USDC = 20;
/** Default operating float kept behind by a sweep (USDC). */
export const DEFAULT_SWEEP_RESERVE_USDC = 5;
/** Minimum float a sweep may leave behind; USDC is gas on Arc (0.1 USDC). */
export const GAS_HEADROOM_WEI = USDC_UNIT / 10n;
/** Sweeps smaller than this are not worth a transaction (0.5 USDC). */
export const MIN_SWEEP_WEI = USDC_UNIT / 2n;

/** Decimal-safe "12.5" → 12500000000000000000n. Rejects exponents/negatives. */
export function parseUsdcToWei(value: string | number): bigint {
  const raw = (typeof value === 'number' ? String(value) : value).trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid USDC amount: ${raw}`);
  }
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > USDC_DECIMALS) {
    throw new Error(`Invalid USDC amount (max ${USDC_DECIMALS} decimals): ${raw}`);
  }
  const fraction = frac.padEnd(USDC_DECIMALS, '0');
  return BigInt(whole) * USDC_UNIT + (fraction ? BigInt(fraction) : 0n);
}

/** Wei → "20" / "20.000000000000000001" (trailing zeros trimmed, no float). */
export function formatUsdc(wei: bigint): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / USDC_UNIT;
  const frac = (abs % USDC_UNIT).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/**
 * HOT_WALLET_MAX_USDC, clamped down to the hard default: like the 5/25 payout
 * caps, the env var may only tighten the rail, never raise it above 20.
 * An unparsable value falls back to the default (never disables the rail).
 */
export function getHotWalletCeilingWei(): bigint {
  const raw = (process.env.HOT_WALLET_MAX_USDC || '').trim();
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

/** HOT_WALLET_SWEEP_RESERVE_USDC (default 5 USDC), used when a caller omits `reserve`. */
export function getSweepReserveWei(): bigint {
  const raw = (process.env.HOT_WALLET_SWEEP_RESERVE_USDC || '').trim();
  if (!raw) return BigInt(DEFAULT_SWEEP_RESERVE_USDC) * USDC_UNIT;
  try {
    return parseUsdcToWei(raw);
  } catch {
    return BigInt(DEFAULT_SWEEP_RESERVE_USDC) * USDC_UNIT;
  }
}

// ── Ceiling ──────────────────────────────────────────────────────

export type HotWalletRefusalReason =
  | 'INVALID_PAYOUT_AMOUNT'
  | 'HOT_WALLET_CEILING_EXCEEDED'
  | 'INSUFFICIENT_HOT_WALLET_BALANCE';

export type HotWalletDecision = {
  ok: boolean;
  reason: 'WITHIN_CEILING' | HotWalletRefusalReason;
  detail: string;
  balanceWei: bigint;
  pendingPayoutWei: bigint;
  ceilingWei: bigint;
  /** Distance from the ceiling, floored at 0. */
  headroomWei: bigint;
};

/**
 * Decide whether a payout may be attempted at all.
 *
 * Order matters: an over-exposed hot wallet (balance above the ceiling) is
 * refused even when it could technically pay, because the correct reaction is
 * to sweep first — a compromised VPS must not be able to drain an oversized
 * float. `ceilingWei` is an explicit override for pre-flight what-if checks;
 * production callers omit it and get getHotWalletCeilingWei().
 */
export function checkHotWalletCeiling(input: {
  balanceWei: bigint;
  pendingPayoutWei: bigint;
  ceilingWei?: bigint;
}): HotWalletDecision {
  const balanceWei = input.balanceWei;
  const pendingPayoutWei = input.pendingPayoutWei;
  const ceilingWei = input.ceilingWei ?? getHotWalletCeilingWei();
  const headroomWei = balanceWei >= ceilingWei ? 0n : ceilingWei - balanceWei;
  const base = { balanceWei, pendingPayoutWei, ceilingWei, headroomWei };

  if (typeof pendingPayoutWei !== 'bigint' || pendingPayoutWei <= 0n) {
    return {
      ...base,
      ok: false,
      reason: 'INVALID_PAYOUT_AMOUNT',
      detail: 'Payout amount must be a positive integer amount of wei',
    };
  }

  if (balanceWei > ceilingWei) {
    return {
      ...base,
      ok: false,
      reason: 'HOT_WALLET_CEILING_EXCEEDED',
      detail:
        `HOT_WALLET_CEILING_EXCEEDED: treasury balance ${formatUsdc(balanceWei)} USDC exceeds the ` +
        `${formatUsdc(ceilingWei)} USDC hot-wallet ceiling; sweep to the cold address before paying out`,
    };
  }

  if (pendingPayoutWei > balanceWei) {
    return {
      ...base,
      ok: false,
      reason: 'INSUFFICIENT_HOT_WALLET_BALANCE',
      detail:
        `INSUFFICIENT_HOT_WALLET_BALANCE: payout ${formatUsdc(pendingPayoutWei)} USDC but the ` +
        `treasury holds ${formatUsdc(balanceWei)} USDC`,
    };
  }

  return {
    ...base,
    ok: true,
    reason: 'WITHIN_CEILING',
    detail:
      `Payout ${formatUsdc(pendingPayoutWei)} USDC within the ${formatUsdc(ceilingWei)} USDC ` +
      `hot-wallet ceiling (balance ${formatUsdc(balanceWei)} USDC)`,
  };
}

// ── Sweep planner (planning only, never executes) ─────────────────

export type SweepRefusalReason =
  | 'INVALID_BALANCE'
  | 'INVALID_COLD_ADDRESS'
  | 'RESERVE_BELOW_GAS_HEADROOM'
  | 'NOTHING_TO_SWEEP'
  | 'BELOW_MIN_SWEEP';

export type SweepPlan =
  | {
      ok: true;
      reason: 'SWEEP';
      detail: string;
      to: Address;
      amountWei: bigint;
      amountUsdc: string;
      balanceWei: bigint;
      reserveWei: bigint;
      remainingWei: bigint;
    }
  | {
      ok: false;
      reason: SweepRefusalReason;
      detail: string;
      to: Address | null;
      amountWei: 0n;
      amountUsdc: '0';
      balanceWei: bigint;
      reserveWei: bigint;
      remainingWei: bigint;
    };

/**
 * Plan moving the float above `reserve` to `coldAddress`.
 *
 * Pure: returns what should be signed, never signs or sends. Invariants:
 *   - amountWei is 0n or positive, never negative;
 *   - remainingWei (what stays in the hot wallet) is always >= reserve, and
 *     reserve is always >= GAS_HEADROOM_WEI, so the hot wallet keeps gas;
 *   - below-reserve balances are a no-op, not a refund of the reserve;
 *   - dust sweeps (< MIN_SWEEP_WEI) are skipped rather than broadcast.
 */
export function planSweep(input: {
  balance: bigint;
  reserve?: bigint;
  coldAddress: string;
}): SweepPlan {
  const balanceWei = input.balance;
  const reserveWei = input.reserve ?? getSweepReserveWei();
  const remainingWei = balanceWei > reserveWei ? reserveWei : balanceWei;

  const refuse = (reason: SweepRefusalReason, detail: string): SweepPlan => ({
    ok: false,
    reason,
    detail,
    to: null,
    amountWei: 0n,
    amountUsdc: '0',
    balanceWei,
    reserveWei,
    remainingWei,
  });

  if (typeof balanceWei !== 'bigint' || balanceWei < 0n) {
    return refuse('INVALID_BALANCE', 'Balance must be a non-negative integer amount of wei');
  }
  if (!isAddress(input.coldAddress)) {
    return refuse('INVALID_COLD_ADDRESS', 'Cold address is not a valid address');
  }
  if (typeof reserveWei !== 'bigint' || reserveWei < GAS_HEADROOM_WEI) {
    return refuse(
      'RESERVE_BELOW_GAS_HEADROOM',
      `Reserve ${formatUsdc(reserveWei < 0n ? 0n : reserveWei)} USDC is below the ` +
        `${formatUsdc(GAS_HEADROOM_WEI)} USDC gas headroom floor; USDC is gas on Arc, ` +
        'so sweeping this much would strand the hot wallet'
    );
  }
  if (balanceWei <= reserveWei) {
    return refuse(
      'NOTHING_TO_SWEEP',
      `Balance ${formatUsdc(balanceWei)} USDC is at or below the ${formatUsdc(reserveWei)} USDC reserve`
    );
  }

  const amountWei = balanceWei - reserveWei;
  if (amountWei < MIN_SWEEP_WEI) {
    return refuse(
      'BELOW_MIN_SWEEP',
      `Sweep of ${formatUsdc(amountWei)} USDC is below the ${formatUsdc(MIN_SWEEP_WEI)} USDC minimum`
    );
  }

  return {
    ok: true,
    reason: 'SWEEP',
    detail:
      `Sweep ${formatUsdc(amountWei)} USDC to ${input.coldAddress}, keeping ` +
      `${formatUsdc(reserveWei)} USDC of float/gas in the hot wallet`,
    to: input.coldAddress as Address,
    amountWei,
    amountUsdc: formatUsdc(amountWei),
    balanceWei,
    reserveWei,
    remainingWei,
  };
}
