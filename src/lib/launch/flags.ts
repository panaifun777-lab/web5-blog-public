import { NextResponse } from 'next/server';
import { translate } from '@/lib/i18n/translate';
import { DEFAULT_LOCALE, type LocaleCode } from '@/lib/i18n/config';
import { requestLocale } from '@/lib/web5/api/errors';

/** Maps an API locale (zh/en) to a full catalog locale code. */
function resolveLocale(req?: Request | null): LocaleCode {
  return requestLocale(req) === 'zh' ? DEFAULT_LOCALE : 'en';
}


function enabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

/**
 * 真实 Vessel 身份模式总开关。默认关闭 = beta 模拟身份。
 * 开启后：AA2P 签名走真实 viem verifyMessage + eidolonos.xyz 预言机授权，
 * 任何未配置项一律 fail-closed（拒绝签发），绝不会把模拟身份当真实身份放行。
 * 详见 src/lib/web5/vessel-verifier.ts。
 */
export const REAL_VESSEL_IDENTITY = enabled(process.env.REAL_VESSEL_IDENTITY);

/** 真实资金入口总开关。默认关闭，避免未完成托管/退款/分账的路径收钱。 */
export const MONEY_FLOWS_ENABLED = enabled(process.env.MONEY_FLOWS_ENABLED);

/** 提现需要链上出款签名器，因此单独加锁。 */
export const WITHDRAWALS_ENABLED =
  MONEY_FLOWS_ENABLED && enabled(process.env.WITHDRAWALS_ENABLED);

/** 空投会消耗出纳余额，默认关闭。 */
export const AIRDROP_ENABLED = enabled(process.env.AIRDROP_ENABLED);

/** x402 预付费充值默认关闭，直到对账与提现链路可用。 */
export const X402_DEPOSITS_ENABLED = enabled(process.env.X402_DEPOSITS_ENABLED);

/** x402 付费网关总开关：默认关闭（fail-closed），必须在 MONEY_FLOWS_ENABLED 同时开启才真正生效。 */
export const X402_PAYMENTS_ENABLED = enabled(process.env.X402_PAYMENTS_ENABLED);

/** 要求付款方预付费余额结算：默认 REQUIRED（fail-closed for requiring），仅显式 'false' 才关闭。 */
export const X402_REQUIRE_PREPAID = process.env.X402_REQUIRE_PREPAID !== 'false';

/** 真实资金出口：同时受总资金开关与 x402 开关约束，任何一者关闭即停收。 */
export const X402_PAYMENTS_LIVE = MONEY_FLOWS_ENABLED && X402_PAYMENTS_ENABLED;

/** 托管结算必须执行真实分账后才允许把订单置为 SETTLED。 */
export const ESCROW_PAYOUTS_ENABLED = enabled(process.env.ESCROW_PAYOUTS_ENABLED);

/** 退款需要真实出款签名，默认关闭。 */
export const REFUNDS_ENABLED =
  MONEY_FLOWS_ENABLED && enabled(process.env.REFUNDS_ENABLED);

/** 自治代理会产生公开互动与日志，上线初期默认关闭，避免合成内容。 */
export const AUTONOMOUS_AGENTS_ENABLED = enabled(process.env.AUTONOMOUS_AGENTS_ENABLED);

/** 无头守护进程的进程内开关；单独打开不生效，还必须打开自治代理总开关。 */
export const AGENT_DAEMON_ENABLED = enabled(process.env.AGENT_DAEMON_ENABLED);

/** 运维急停：无论上面两个开关如何，设置后守护进程必须不跑。 */
export const AGENT_DAEMON_FORCE_STOPPED = enabled(process.env.DISABLE_AGENT_DAEMON);

/**
 * 守护进程是否真的应该运行。
 * 它是自治代理的实际执行体（同行评审、自动交付、周期抓取），所以和
 * `/api/autonomous/tick` 共用同一个总开关：只有 AUTONOMOUS_AGENTS_ENABLED
 * 与 AGENT_DAEMON_ENABLED 同时打开、且未被急停，才允许自治行为离开进程。
 */
export function agentDaemonActive(): boolean {
  return AUTONOMOUS_AGENTS_ENABLED && AGENT_DAEMON_ENABLED && !AGENT_DAEMON_FORCE_STOPPED;
}

export const DEMO_NOTICE = translate(DEFAULT_LOCALE, 'flags.demoNotice');

export const MONEY_FLOWS_DISABLED_MESSAGE = translate(
  DEFAULT_LOCALE,
  'flags.moneyFlowDisabled'
);

export function moneyFlowBlocked(
  code = 'MONEY_FLOWS_DISABLED',
  req?: Request | null
): NextResponse {
  return NextResponse.json(
    {
      error: translate(resolveLocale(req), 'flags.moneyFlowDisabled'),
      code,
      demo: true,
    },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '3600',
      },
    }
  );
}

export function featureDisabled(
  code: string,
  message: string,
  req?: Request | null
): NextResponse {
  return NextResponse.json(
    { error: translate(resolveLocale(req), message), code, demo: true },
    { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } }
  );
}

/**
 * 硬门槛：从 beta 走向真实资金的关键闸口。
 *
 * 真实资金（MONEY_FLOWS_ENABLED）只能结算到经过真实身份验签的会话。
 * 即使资金总开关被打开，凡是 identityReal !== true 的会话（beta 模拟身份、
 * observer 模式）一律拒绝，避免用模拟身份结算真实 USDC。
 *
 * 资金总开关关闭时本函数直接放行（无资金流动，无需真实身份），
 * 因此不会误伤当前只读/内测的 beta 体验。
 */
export function realIdentityRequiredForMoney(session: {
  identityReal?: boolean;
}): { ok: boolean; code?: string } {
  if (!MONEY_FLOWS_ENABLED) return { ok: true };
  if (session.identityReal === true) return { ok: true };
  return { ok: false, code: 'SIMULATED_IDENTITY_NO_MONEY' };
}
