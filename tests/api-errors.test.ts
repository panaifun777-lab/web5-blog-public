import { describe, expect, it } from 'vitest';
import { apiError, apiErrorMessage, requestLocale } from '@/lib/web5/api/errors';

function req(locale?: string) {
  return new Request('https://web5.blog/api/test', {
    headers: locale ? { 'accept-language': locale } : {},
  });
}

describe('requestLocale', () => {
  it('defaults to English without Accept-Language', () => {
    expect(requestLocale(req())).toBe('en');
    expect(requestLocale(undefined)).toBe('en');
  });

  it('follows the first language in the header', () => {
    expect(requestLocale(req('zh-CN,zh;q=0.9,en;q=0.8'))).toBe('zh');
    expect(requestLocale(req('en-US,en;q=0.9,zh-CN;q=0.8'))).toBe('en');
    expect(requestLocale(req('zh-TW'))).toBe('zh');
  });
});

describe('apiErrorMessage', () => {
  it('renders the locale-specific string', () => {
    expect(apiErrorMessage('MISSING_ID', 'en')).toBe('Missing id.');
    expect(apiErrorMessage('MISSING_ID', 'zh')).toBe('缺少 id');
  });

  it('interpolates params without touching unknown placeholders', () => {
    expect(apiErrorMessage('RECIPIENT_MISMATCH', 'en', { address: '0xCA36...' })).toContain(
      '0xCA36...'
    );
    expect(apiErrorMessage('RECIPIENT_MISMATCH', 'zh', { address: '0xCA36...' })).toBe(
      '收款方不匹配，应为平台金库 0xCA36...'
    );
  });
});

describe('apiError', () => {
  it('returns a stable code plus English text for agents', async () => {
    const res = apiError('TX_NOT_FOUND');
    expect(res.status).toBe(400);
    expect(res.headers.get('vary')).toBe('Accept-Language');
    await expect(res.json()).resolves.toEqual({
      error: 'Transaction not found on Arc, make sure it is confirmed on chain.',
      code: 'TX_NOT_FOUND',
    });
  });

  it('returns Chinese text for zh browsers', async () => {
    const res = apiError('REPLAY', { request: req('zh-CN') });
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: '该交易已入账，不能重复结算',
      code: 'REPLAY',
    });
  });

  it('keeps caller headers such as Retry-After', () => {
    const res = apiError('RATE_LIMITED', { headers: { 'Retry-After': '42' } });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('42');
  });

  it('lets callers override the status', () => {
    expect(apiError('INTERNAL_ERROR', { status: 502 }).status).toBe(502);
  });

  it('keeps extra fields alongside the stable code', async () => {
    const res = apiError('DEMO_ORDER_NOT_SUBMITTABLE', { extra: { demo: true } });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Demo orders cannot be submitted.',
      code: 'DEMO_ORDER_NOT_SUBMITTABLE',
      demo: true,
    });
  });
});

describe('session and Vessel errors', () => {
  it('defaults to English for a missing Vessel session', async () => {
    const res = apiError('VESSEL_SESSION_REQUIRED');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'A Vessel session is required, please sign in first.',
      code: 'VESSEL_SESSION_REQUIRED',
    });
  });

  it('returns Chinese for an unconfigured Telegram login', async () => {
    const res = apiError('TELEGRAM_AUTH_NOT_CONFIGURED', { request: req('zh-CN') });
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: '服务端尚未配置 Telegram 登录。',
      code: 'TELEGRAM_AUTH_NOT_CONFIGURED',
    });
  });

  it('keeps English for a machine caller that sends en', async () => {
    const res = apiError('PRIME_NOT_FOUND', { request: req('en-US,en;q=0.9') });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: 'No Prime identity is linked to this session.',
      code: 'PRIME_NOT_FOUND',
    });
  });
});

describe('parameterised errors', () => {
  it('interpolates the comment length limit in both locales', async () => {
    const en = apiError('COMMENT_TOO_LONG', { params: { max: 2000 } });
    await expect(en.json()).resolves.toMatchObject({
      error: 'Comment is too long (max 2000 characters).',
      code: 'COMMENT_TOO_LONG',
    });

    const zh = apiError('COMMENT_TOO_LONG', { request: req('zh-CN'), params: { max: 2000 } });
    await expect(zh.json()).resolves.toMatchObject({
      error: '评论过长（最多 2000 个字符）。',
      code: 'COMMENT_TOO_LONG',
    });
  });

  it('interpolates budget field names and bounds', async () => {
    const res = apiError('BUDGET_LIMIT_OUT_OF_RANGE', {
      request: req('zh-CN'),
      params: { field: 'perTxLimit', min: 1, max: 100 },
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'perTxLimit 必须是 1 到 100 USDC 之间的整数。',
      code: 'BUDGET_LIMIT_OUT_OF_RANGE',
    });
  });
});
