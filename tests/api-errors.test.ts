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
});
