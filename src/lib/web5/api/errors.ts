// ════════════════════════════════════════════════════════════════
// src/lib/web5/api/errors.ts
// API 错误响应：稳定 error code + 按 Accept-Language 返回中/英文文案
// 机器调用方（无 Accept-Language）拿到英文，浏览器保持中文
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export type ApiLocale = 'en' | 'zh';

type CatalogEntry = { status: number; en: string; zh: string };

export const API_ERRORS = {
  RATE_LIMITED: {
    status: 429,
    en: 'Too many requests, please retry shortly.',
    zh: '请求过于频繁，请稍后再试。',
  },
  CLAIM_PARAMS_REQUIRED: {
    status: 400,
    en: 'Wallet address and signature are required.',
    zh: '钱包地址与签名必填',
  },
  CLAIM_SIGNATURE_EXPIRED: {
    status: 401,
    en: 'Signature expired, please sign again.',
    zh: '签名已过期，请重新签名',
  },
  CLAIM_SIGNATURE_INVALID: {
    status: 401,
    en: 'Signature verification failed.',
    zh: '签名验证失败',
  },
  CLAIM_TRANSFER_FAILED: {
    status: 500,
    en: 'Airdrop transfer failed, please retry later.',
    zh: '空投划拨失败，请稍后重试',
  },
  TX_NOT_FOUND: {
    status: 400,
    en: 'Transaction not found on Arc, make sure it is confirmed on chain.',
    zh: '无法在 Arc 主网查询到该交易，请确认交易已上链',
  },
  TX_NOT_CONFIRMED: {
    status: 400,
    en: 'Transaction is unconfirmed or reverted, please retry.',
    zh: '交易未确认或执行失败，请重试',
  },
  RECIPIENT_MISMATCH: {
    status: 400,
    en: 'Recipient mismatch, expected treasury {address}.',
    zh: '收款方不匹配，应为平台金库 {address}',
  },
  SENDER_MISMATCH: {
    status: 400,
    en: 'Sender does not match the current session identity.',
    zh: '付款方与当前会话身份不一致',
  },
  AMOUNT_MISMATCH: {
    status: 400,
    en: 'On-chain amount does not match the declared amount.',
    zh: '链上金额与申报金额不一致，请重新核对',
  },
  REPLAY: {
    status: 409,
    en: 'This transaction is already settled.',
    zh: '该交易已入账，不能重复结算',
  },
  MISSING_ID: {
    status: 400,
    en: 'Missing id.',
    zh: '缺少 id',
  },
  OPPORTUNITY_NOT_FOUND: {
    status: 404,
    en: 'Opportunity not found.',
    zh: '机会不存在',
  },
  OPPORTUNITY_ALREADY_IMPORTED: {
    status: 409,
    en: 'Opportunity already imported.',
    zh: '该机会已导入',
  },
  BOUNTY_AMOUNT_UNCONFIRMED: {
    status: 409,
    en: 'Reward is still a proposal, confirm it before creating a bounty.',
    zh: '该机会的金额仍为提案（未确认），请确认后再创建悬赏',
  },
  INTERNAL_ERROR: {
    status: 500,
    en: 'Internal error, please retry later.',
    zh: '服务内部错误，请稍后重试',
  },
  TDPO_BLOCKED: {
    status: 403,
    en: 'Prompt blocked by the TDPO cognitive firewall.',
    zh: '提示词触发认知防火墙拦截。',
  },
} as const satisfies Record<string, CatalogEntry>;

export type ApiErrorCode = keyof typeof API_ERRORS;

export function requestLocale(req?: Request | null): ApiLocale {
  const raw = req?.headers.get('accept-language');
  if (!raw) return 'en';
  const first = raw.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('zh') ? 'zh' : 'en';
}

function render(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

export function apiErrorMessage(
  code: ApiErrorCode,
  locale: ApiLocale,
  params?: Record<string, string | number>
): string {
  const entry = API_ERRORS[code];
  return render(locale === 'zh' ? entry.zh : entry.en, params);
}

export function apiError(
  code: ApiErrorCode,
  options: {
    request?: Request | null;
    status?: number;
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
    extra?: Record<string, unknown>;
  } = {}
): NextResponse {
  const entry = API_ERRORS[code];
  return NextResponse.json(
    {
      error: apiErrorMessage(code, requestLocale(options.request), options.params),
      code,
      ...(options.extra ?? {}),
    },
    {
      status: options.status ?? entry.status,
      headers: { Vary: 'Accept-Language', ...(options.headers ?? {}) },
    }
  );
}
