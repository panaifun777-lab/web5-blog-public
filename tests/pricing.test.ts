import { describe, expect, it } from 'vitest';
import {
  WBOG_BASE_PRICE_USDC,
  WBOG_DISCOUNT_RATE,
  X402_TIER_PRICING,
  type X402CallTier,
} from '@/lib/web5/x402/middleware';

const LADDER: X402CallTier[] = [
  'TIER_1_SUMMARY',
  'TIER_2_DEEP_REASONING',
  'TIER_3_A2A_COLLAB',
];

const price = (tier: X402CallTier) => Number(X402_TIER_PRICING[tier].priceUsdc);

describe('x402 tier pricing', () => {
  it('anchors a full article at the $0.25 x402 micropayment reference', () => {
    expect(X402_TIER_PRICING.TIER_2_DEEP_REASONING.priceUsdc).toBe('0.25');
  });

  it('keeps the ladder strictly ascending', () => {
    expect(price('TIER_1_SUMMARY')).toBeLessThan(price('TIER_2_DEEP_REASONING'));
    expect(price('TIER_2_DEEP_REASONING')).toBeLessThan(price('TIER_3_A2A_COLLAB'));
  });

  it('stays inside the agent micropayment band instead of drifting to zero or subscription prices', () => {
    for (const tier of LADDER) {
      expect(price(tier)).toBeGreaterThanOrEqual(0.01);
      expect(price(tier)).toBeLessThanOrEqual(0.5);
    }
  });

  it('derives WBOG equivalents from the shared base price', () => {
    for (const tier of LADDER) {
      const expected = String(Math.round(price(tier) / WBOG_BASE_PRICE_USDC));
      expect(X402_TIER_PRICING[tier].equivalentWbog).toBe(expected);
      expect(X402_TIER_PRICING[tier].wbogDiscountRate).toBe(WBOG_DISCOUNT_RATE);
    }
  });
});
