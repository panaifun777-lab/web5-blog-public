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

  // ── 身份与鉴权 ──
  UNAUTHORIZED: {
    status: 401,
    en: 'Authentication required.',
    zh: '需要登录后再操作。',
  },
  ADMIN_AUTH_REQUIRED: {
    status: 401,
    en: 'Admin authorization required: sign in with an admin wallet or send a valid API key.',
    zh: '需要管理员授权：请使用管理员钱包登录，或提供有效的 API Key。',
  },
  ADMIN_CHALLENGE_INVALID: {
    status: 401,
    en: 'Login challenge expired or invalid, please start again.',
    zh: '登录挑战已过期或无效，请重新发起登录。',
  },
  ADMIN_CHALLENGE_MISMATCH: {
    status: 401,
    en: 'The signature does not match this login challenge.',
    zh: '签名与本次登录挑战不匹配。',
  },
  ADMIN_LOGIN_FAILED: {
    status: 500,
    en: 'Admin sign-in failed, please retry.',
    zh: '管理员登录失败，请重试。',
  },
  LOGIN_FAILED: {
    status: 500,
    en: 'Sign-in failed, please retry later.',
    zh: '登录失败，请稍后重试。',
  },
  LOGIN_SIGNATURE_EXPIRED: {
    status: 401,
    en: 'Sign-in signature expired or does not match this wallet, please sign again.',
    zh: '登录签名已过期或与钱包不匹配，请重新签名。',
  },
  INVALID_WALLET_ADDRESS: {
    status: 400,
    en: 'That wallet address is not valid.',
    zh: '钱包地址格式不正确。',
  },
  WALLET_NOT_AUTHORIZED: {
    status: 403,
    en: 'This wallet is not allowed to sign in here.',
    zh: '该钱包没有登录权限。',
  },
  INVALID_ADDRESS_OR_SIGNATURE: {
    status: 400,
    en: 'Address or signature format is invalid.',
    zh: '地址或签名格式不正确。',
  },
  SIGNATURE_REQUIRED: {
    status: 401,
    en: 'A wallet signature is required.',
    zh: '请先完成钱包签名。',
  },
  SIGNATURE_INVALID: {
    status: 401,
    en: 'Signature verification failed, please sign again.',
    zh: '签名验证失败，请重新签名。',
  },
  SIGNATURE_EXPIRED: {
    status: 400,
    en: 'Signature expired, please sign again.',
    zh: '签名已过期，请重新签名。',
  },
  SIGNATURE_ALREADY_USED: {
    status: 409,
    en: 'This signature has already been used, please sign again.',
    zh: '该签名已被使用，请重新签名。',
  },
  NONCE_ALREADY_USED: {
    status: 409,
    en: 'This signature or nonce has already been used.',
    zh: '该签名或 nonce 已被使用。',
  },
  BIND_WALLET_FAILED: {
    status: 400,
    en: 'Wallet binding failed, check the signed payload and try again.',
    zh: '钱包绑定失败，请核对签名内容后重试。',
  },
  WITHDRAWAL_FAILED: {
    status: 400,
    en: 'Withdrawal failed, check the request and try again.',
    zh: '提现失败，请核对信息后重试。',
  },

  // ── 请求参数 ──
  MISSING_FIELDS: {
    status: 400,
    en: 'Missing required fields.',
    zh: '缺少必填字段。',
  },
  MISSING_DID: {
    status: 400,
    en: 'Missing did.',
    zh: '缺少 did',
  },
  MISSING_ALERT_ID: {
    status: 400,
    en: 'Missing alertId.',
    zh: '缺少 alertId。',
  },
  MISSING_HASH: {
    status: 400,
    en: 'Missing content hash.',
    zh: '缺少内容哈希。',
  },
  MISSING_NAME: {
    status: 400,
    en: 'A name is required.',
    zh: '请填写名称。',
  },
  NAME_TOO_LONG: {
    status: 400,
    en: 'Name is too long (max {max} characters).',
    zh: '名称过长（最多 {max} 个字符）。',
  },
  COMMENT_TOO_LONG: {
    status: 400,
    en: 'Comment is too long (max {max} characters).',
    zh: '评论过长（最多 {max} 个字符）。',
  },
  MISSING_PROMPT: {
    status: 400,
    en: 'A prompt is required.',
    zh: '请填写提示词。',
  },
  MISSING_WITHDRAWAL_FIELDS: {
    status: 400,
    en: 'Missing withdrawal fields: masterWalletAddress, backupWalletAddress, amountAtomic, nonce, deadline, signature.',
    zh: '缺少提现字段：masterWalletAddress、backupWalletAddress、amountAtomic、nonce、deadline、signature。',
  },
  INVALID_AMOUNT: {
    status: 400,
    en: 'Amount must be greater than zero.',
    zh: '金额必须大于 0。',
  },
  INVALID_TX_HASH: {
    status: 400,
    en: 'Transaction hash is invalid.',
    zh: '交易哈希格式不正确。',
  },
  INVALID_ADDRESS: {
    status: 400,
    en: 'Invalid address.',
    zh: '地址格式不正确。',
  },
  INVALID_REGISTRATION_PARAMS: {
    status: 400,
    en: 'Address, nonce or deadline is invalid.',
    zh: '地址、nonce 或 deadline 格式不正确。',
  },
  INVALID_STATUS: {
    status: 400,
    en: 'That status value is not supported.',
    zh: '不支持的状态值。',
  },
  INVALID_SECTION: {
    status: 400,
    en: 'Unknown section.',
    zh: '未知的栏目。',
  },
  UNKNOWN_ACTION: {
    status: 400,
    en: 'Unknown action.',
    zh: '未知操作。',
  },

  // ── Vessel 会话 ──
  VESSEL_SESSION_REQUIRED: {
    status: 401,
    en: 'A Vessel session is required, please sign in first.',
    zh: '请先登录容器会话。',
  },
  VESSEL_DID_REQUIRED: {
    status: 401,
    en: 'Vessel DID is required in the x-vessel-did header.',
    zh: '请求头缺少 x-vessel-did（容器 DID）。',
  },
  VESSEL_NOT_FOUND: {
    status: 404,
    en: 'Vessel not found.',
    zh: '容器不存在。',
  },
  NO_ACTIVE_VESSEL: {
    status: 404,
    en: 'No active Vessel found.',
    zh: '没有可用的活跃容器。',
  },
  VESSEL_AUTH_FAILED: {
    status: 500,
    en: 'Vessel sign-in failed, please retry later.',
    zh: '容器登录失败，请稍后重试。',
  },
  PRIME_NOT_FOUND: {
    status: 403,
    en: 'No Prime identity is linked to this session.',
    zh: '当前会话未绑定本体身份（Prime）。',
  },
  PRIME_DELEGATION_MISSING: {
    status: 403,
    en: 'Prime delegation not found or already revoked.',
    zh: '未找到本体授权，或授权已被撤销。',
  },
  NO_PERMISSIONS_REQUESTED: {
    status: 400,
    en: 'At least one permission must be requested.',
    zh: '至少需要申请一项权限。',
  },
  CHALLENGE_EXPIRED: {
    status: 401,
    en: 'Challenge expired, please request a new one.',
    zh: '挑战已过期，请重新获取。',
  },
  AA2P_SIGNATURE_INVALID: {
    status: 401,
    en: 'AA2P signature is invalid.',
    zh: 'AA2P 签名无效。',
  },
  MISSING_VESSEL_LOGIN_FIELDS: {
    status: 400,
    en: 'Missing required fields: challenge, aa2pClaim, vesselDid, eidolonDid.',
    zh: '缺少必填字段：challenge、aa2pClaim、vesselDid、eidolonDid。',
  },

  // ── Telegram 登录 ──
  TELEGRAM_INIT_DATA_MISSING: {
    status: 400,
    en: 'Telegram initData is missing.',
    zh: '缺少 Telegram initData。',
  },
  TELEGRAM_AUTH_NOT_CONFIGURED: {
    status: 503,
    en: 'Telegram sign-in is not configured on this server.',
    zh: '服务端尚未配置 Telegram 登录。',
  },
  TELEGRAM_SIGNATURE_INVALID: {
    status: 401,
    en: 'Telegram WebApp signature is invalid.',
    zh: 'Telegram WebApp 签名无效或已被伪造。',
  },

  // ── AP2 预算 / 支付 ──
  BUDGET_AUTH_REQUIRED: {
    status: 403,
    en: 'Changing a budget requires an admin or a Vessel session.',
    zh: '调整预算需要管理员或容器会话身份。',
  },
  BUDGET_LIMIT_OUT_OF_RANGE: {
    status: 400,
    en: '{field} must be a whole number between {min} and {max} USDC.',
    zh: '{field} 必须是 {min} 到 {max} USDC 之间的整数。',
  },
  PER_TX_EXCEEDS_DAILY_LIMIT: {
    status: 400,
    en: 'Per-transaction limit cannot exceed the daily limit.',
    zh: '单笔限额不能超过每日限额。',
  },
  BUDGET_NOT_FOUND: {
    status: 404,
    en: 'No budget is configured for this Vessel.',
    zh: '该容器尚未配置预算。',
  },

  // ── 推荐 / 内容 ──
  REFERRAL_TARGET_MISMATCH: {
    status: 403,
    en: 'referredDid must match the Vessel in this session.',
    zh: 'referredDid 必须与当前会话的容器一致。',
  },
  CONTENT_NOT_FOUND: {
    status: 404,
    en: 'Content not found.',
    zh: '内容不存在。',
  },
  ARWEAVE_PERMANENCE_FAILED: {
    status: 422,
    en: 'Permanent storage failed, so the content was not published.',
    zh: '永久存证失败，内容未发布。',
  },

  // ── 悬赏任务 ──
  TASK_ORDER_NOT_FOUND: {
    status: 404,
    en: 'Task order not found.',
    zh: '任务单不存在。',
  },
  ORDER_ID_REQUIRED: {
    status: 400,
    en: 'orderId is required.',
    zh: '缺少 orderId。',
  },
  INVALID_ORDER_ID: {
    status: 400,
    en: 'Invalid orderId.',
    zh: 'orderId 格式不正确。',
  },
  AGENT_DID_REQUIRED: {
    status: 400,
    en: 'agentDid is required.',
    zh: '缺少 agentDid。',
  },
  ORDER_ASSIGN_FORBIDDEN: {
    status: 403,
    en: 'Only the task creator or an admin can assign this task.',
    zh: '只有任务创建者或管理员可以指派该任务。',
  },
  ORDER_SUBMIT_FORBIDDEN: {
    status: 403,
    en: 'Only the assigned Vessel or an admin can submit this task.',
    zh: '只有被指派的容器或管理员可以提交该任务。',
  },
  NOT_ORCHESTRATOR: {
    status: 403,
    en: 'Settlement requires admin or orchestrator authorization.',
    zh: '结算需要管理员或该订单委托方的授权。',
  },
  BOUNTY_ID_REQUIRED: {
    status: 400,
    en: 'bountyId is required.',
    zh: '缺少 bountyId。',
  },
  USER_THOUGHT_REQUIRED: {
    status: 400,
    en: 'userThought is required.',
    zh: '请填写你的观点（userThought）。',
  },
  USER_THOUGHT_TOO_LONG: {
    status: 400,
    en: 'userThought is too long.',
    zh: '观点内容过长。',
  },
  DEMO_ORDER_NOT_SUBMITTABLE: {
    status: 400,
    en: 'Demo orders cannot be submitted.',
    zh: '演示订单不能提交交付。',
  },
  WALLET_NOT_REGISTERED: {
    status: 400,
    en: 'No payout wallet is registered for this session.',
    zh: '当前会话还没有登记收款钱包。',
  },
  WALLET_NOT_OWNED_BY_SESSION: {
    status: 403,
    en: 'backupWalletAddress does not belong to this session.',
    zh: 'backupWalletAddress 不属于当前会话。',
  },
  ESCROW_DEPOSIT_MISSING: {
    status: 409,
    en: 'This order has no verified escrow deposit yet.',
    zh: '该订单还没有经过验证的托管入账。',
  },
  ESCROW_VERIFICATION_FAILED: {
    status: 409,
    en: 'Escrow verification failed: {reason}',
    zh: '托管校验未通过：{reason}',
  },
  ORDER_ASSIGNED_TO_ANOTHER_VESSEL: {
    status: 403,
    en: 'This order is assigned to another Vessel.',
    zh: '该订单已被指派给其他容器。',
  },
  ORDER_STATUS_NOT_SUBMITTABLE: {
    status: 409,
    en: 'Cannot submit an order in status {status}.',
    zh: '订单当前状态（{status}）不可提交。',
  },

  // ── x402 预付费 ──
  DEPOSIT_ALREADY_CREDITED: {
    status: 409,
    en: 'This deposit transaction was already credited.',
    zh: '该充值交易已经入账。',
  },
  DEPOSIT_CONFLICT: {
    status: 409,
    en: 'A concurrent deposit was detected, please retry.',
    zh: '检测到并发充值，请重试。',
  },
  DEPOSIT_VERIFICATION_FAILED: {
    status: 400,
    en: 'Deposit verification failed: {reason}',
    zh: '充值校验未通过：{reason}',
  },
  DEPOSIT_FAILED: {
    status: 500,
    en: 'Deposit failed, please retry later.',
    zh: '充值失败，请稍后重试。',
  },
  REGISTRATION_FAILED: {
    status: 500,
    en: 'Registration failed, please retry later.',
    zh: '注册失败，请稍后重试。',
  },

  // ── 运维 / 定时任务 ──
  CRON_NOT_CONFIGURED: {
    status: 503,
    en: 'Cron is not configured on this server.',
    zh: '服务端尚未配置定时任务密钥。',
  },
  CRON_UNAUTHORIZED: {
    status: 401,
    en: 'Invalid cron secret.',
    zh: '定时任务密钥不正确。',
  },
  // ── Telegram 广播队列（TG_BROADCAST_SECRET 未设置时全部失效）──
  BROADCAST_NOT_CONFIGURED: {
    status: 503,
    en: 'Telegram broadcast is not configured on this server.',
    zh: '服务端尚未配置 Telegram 广播。',
  },
  BROADCAST_UNAUTHORIZED: {
    status: 401,
    en: 'Invalid broadcast secret.',
    zh: '广播密钥不正确。',
  },
  BROADCAST_RECORD_NOT_FOUND: {
    status: 404,
    en: 'This order is not in the broadcast queue.',
    zh: '该订单不在广播队列中。',
  },
  BROADCAST_RESULT_INVALID: {
    status: 400,
    en: 'ok must be a boolean, and tgMessageId is required when ok is true.',
    zh: 'ok 必须是布尔值，且 ok 为 true 时必须提供 tgMessageId。',
  },
} as const satisfies Record<string, CatalogEntry>;

export type ApiErrorCode = keyof typeof API_ERRORS;

function cookieValue(req: Request | null | undefined, name: string): string | undefined {
  const header = req?.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function requestLocale(req?: Request | null): ApiLocale {
  // The language switcher writes a `locale` cookie (legacy `NEXT_LOCALE` is
  // honoured on read). Prefer it so an API error matches the page the user is
  // looking at, then fall back to Accept-Language. The error catalog only ships
  // zh/en, so every other locale resolves to English — consistent with the rest
  // of the app's per-key fallback.
  const cookieLocale = cookieValue(req, 'locale') ?? cookieValue(req, 'NEXT_LOCALE');
  if (cookieLocale && (cookieLocale === 'zh-CN' || cookieLocale.toLowerCase().startsWith('zh'))) {
    return 'zh';
  }
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
