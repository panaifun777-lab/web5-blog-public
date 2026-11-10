// tests/vessel-identity-gate.test.ts
// Item 3 硬门槛回归：从 beta 模拟身份走向真实资金时的 fail-closed 行为。
// 任何身份断言默认视为模拟，只有真实密码学验签 + 预言机授权才能标记为 real。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AA2PClaim, VesselChallenge } from '@/lib/web5/types';

function makeChallenge(overrides: Partial<VesselChallenge> = {}): VesselChallenge {
  return {
    blogDid: process.env.NEXT_PUBLIC_WEB5_BLOG_DID || 'did:web5blog:default',
    permissions: ['read', 'comment', 'micropay'],
    timestamp: Date.now(),
    nonce: 'nonce-1234',
    ...overrides,
  };
}

function makeMockClaim(): AA2PClaim {
  const challenge = makeChallenge();
  return {
    vesselDid: 'did:vessel:node-abcdef0123456789',
    eidolonDid: 'did:eidolon:node-0123456789abcdef',
    signature: '0x' + 'a'.repeat(130),
    challenge,
    expiresAt: Date.now() + 60_000,
    simulated: true,
  };
}

function makeRealLookingClaim(vesselId = '0x1111111111111111111111111111111111111111'): AA2PClaim {
  const challenge = makeChallenge();
  return {
    vesselDid: `did:vessel:${vesselId}`,
    eidolonDid: 'did:eidolon:0x2222222222222222222222222222222222222222',
    signature: '0x' + 'a'.repeat(130),
    challenge,
    expiresAt: Date.now() + 60_000,
  };
}

describe('verifyAA2PSignature — beta 默认（REAL_VESSEL_IDENTITY 关闭）', () => {
  it('允许模拟身份登录，但明确标记 real=false', async () => {
    const { verifyAA2PSignature } = await import('@/lib/web5/vessel-verifier');
    const res = await verifyAA2PSignature(makeMockClaim(), 'did:vessel:node-abcdef0123456789');
    expect(res.verified).toBe(true);
    expect(res.real).toBe(false);
  });

  it('拒绝 DID 不匹配', async () => {
    const { verifyAA2PSignature } = await import('@/lib/web5/vessel-verifier');
    const res = await verifyAA2PSignature(makeMockClaim(), 'did:vessel:node-different999');
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('VESSEL_DID_MISMATCH');
  });
});

describe('verifyAA2PSignature — real 模式（REAL_VESSEL_IDENTITY 开启，fail-closed）', () => {
  beforeEach(() => {
    vi.stubEnv('REAL_VESSEL_IDENTITY', 'true');
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('拒绝客户端模拟桩（mock DID）', async () => {
    const { verifyAA2PSignature } = await import('@/lib/web5/vessel-verifier');
    const res = await verifyAA2PSignature(makeMockClaim(), 'did:vessel:node-abcdef0123456789');
    expect(res.verified).toBe(false);
    expect(res.real).toBe(false);
    expect(res.reason).toBe('MOCK_IDENTITY_IN_REAL_MODE');
  });

  it('缺少 TEE 公钥（无内嵌地址/DID 非地址形态）时拒绝', async () => {
    const { verifyAA2PSignature } = await import('@/lib/web5/vessel-verifier');
    const res = await verifyAA2PSignature(
      makeRealLookingClaim('opaque-non-address-id'),
      'did:vessel:opaque-non-address-id'
    );
    expect(res.verified).toBe(false);
    expect(res.real).toBe(false);
    expect(res.reason).toBe('AA2P_KEY_UNCONFIGURED');
  });

  it('内嵌地址形态 DID + 伪造签名时，真实验签被拒绝（verifyMessage 实际生效）', async () => {
    const { verifyAA2PSignature } = await import('@/lib/web5/vessel-verifier');
    const res = await verifyAA2PSignature(
      makeRealLookingClaim('0x1111111111111111111111111111111111111111'),
      'did:vessel:0x1111111111111111111111111111111111111111'
    );
    expect(res.verified).toBe(false);
    expect(res.real).toBe(false);
    expect(res.reason).toBe('SIGNATURE_INVALID');
  });
});

describe('queryPrimeDelegation — real 模式新 Vessel fail-closed', () => {
  beforeEach(() => {
    vi.stubEnv('REAL_VESSEL_IDENTITY', 'true');
    // 不设置 EIDOLON_ORACLE_URL/TOKEN → 必须拒绝。
    vi.stubEnv('EIDOLON_ORACLE_URL', '');
    vi.stubEnv('EIDOLON_ORACLE_TOKEN', '');
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('未配置预言机时拒绝为全新 Vessel 授权', async () => {
    const { queryPrimeDelegation } = await import('@/lib/web5/vessel-verifier');
    const res = await queryPrimeDelegation(
      'did:vessel:0xdeadbeef00000000000000000000000000000001',
      'did:eidolon:0xbeef000000000000000000000000000000000002'
    );
    expect(res.authorized).toBe(false);
    expect(res.real).toBe(false);
  });
});

describe('realIdentityRequiredForMoney — 真实资金硬门槛', () => {
  it('资金关闭时放行（无资金流动，无需真实身份）', async () => {
    vi.stubEnv('MONEY_FLOWS_ENABLED', 'false');
    vi.resetModules();
    const { realIdentityRequiredForMoney } = await import('@/lib/launch/flags');
    expect(realIdentityRequiredForMoney({ identityReal: false }).ok).toBe(true);
    expect(realIdentityRequiredForMoney({ identityReal: true }).ok).toBe(true);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('资金开启时，仅真实身份可结算；模拟身份被拒', async () => {
    vi.stubEnv('MONEY_FLOWS_ENABLED', 'true');
    vi.resetModules();
    const { realIdentityRequiredForMoney } = await import('@/lib/launch/flags');
    expect(realIdentityRequiredForMoney({ identityReal: true }).ok).toBe(true);
    const blocked = realIdentityRequiredForMoney({ identityReal: false });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe('SIMULATED_IDENTITY_NO_MONEY');
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
