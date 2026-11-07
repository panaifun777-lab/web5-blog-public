/**
 * PUBLIC_* 是服务端 flags 的「客户端镜像」。
 * - 客户端 CTA（SponsorModal / CrowdfundingPanel / GenesisCurveModal / TaskBoard）
 *   只认 PUBLIC_*，因此这些开关必须在构建时通过 NEXT_PUBLIC_ 前缀烤进客户端包。
 * - NEXT_PUBLIC_* 的值在构建时（build time）就写死进产物，运行时改 .env 不会生效，
 *   必须重新构建 + 重新部署。
 * - 上线/下线资金链路时，PUBLIC_MONEY_FLOWS_ENABLED（= NEXT_PUBLIC_MONEY_FLOWS_ENABLED）
 *   与服务端总开关 MONEY_FLOWS_ENABLED（src/lib/launch/flags.ts，来源
 *   process.env.MONEY_FLOWS_ENABLED）必须一起翻转；只翻一边会留下
 *   「前端按钮可点、后端却关掉」的错位。
 */
export const PUBLIC_MONEY_FLOWS_ENABLED =
  process.env.NEXT_PUBLIC_MONEY_FLOWS_ENABLED === 'true';

export const PUBLIC_AIRDROP_ENABLED =
  process.env.NEXT_PUBLIC_AIRDROP_ENABLED === 'true';

export const PUBLIC_DEMO_NOTICE = '内测展示，请勿打款';

export const PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE =
  '内测展示：链上托管、退款与分账尚未启用，请勿打款。';

/**
 * 本地镜像服务端资金总开关的判定，与 flags.ts 的 enabled() 保持一致，
 * 仅用于开发期检测「客户端镜像」与「服务端真值」是否错位，不参与任何门控逻辑。
 * 注意：process.env.MONEY_FLOWS_ENABLED 非 NEXT_PUBLIC_，客户端运行时为 undefined，
 * 因此该检测在浏览器侧只会把服务端值当作未启用；真正的错位告警依赖于同一份
 * 服务端/构建环境配置，请见下方 NODE_ENV 守卫。
 */
function serverMoneyFlowsEnabled(): boolean {
  const v = process.env.MONEY_FLOWS_ENABLED;
  return v === 'true' || v === '1';
}

/**
 * 轻量级错位告警：仅开发期（NODE_ENV !== 'production'）且两侧都被显式设为
 * 不同的布尔值时，输出一次 console.warn。门控行为完全不变 —— CTA 仍然只认
 * PUBLIC_MONEY_FLOWS_ENABLED，这里只是把错位暴露给 runbook 作者。
 */
if (
  process.env.NODE_ENV !== 'production' &&
  (process.env.NEXT_PUBLIC_MONEY_FLOWS_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_MONEY_FLOWS_ENABLED === 'false') &&
  process.env.MONEY_FLOWS_ENABLED !== undefined &&
  PUBLIC_MONEY_FLOWS_ENABLED !== serverMoneyFlowsEnabled()
) {
  console.warn(
    '[launch] Mismatch: PUBLIC_MONEY_FLOWS_ENABLED (client mirror, from NEXT_PUBLIC_MONEY_FLOWS_ENABLED) is ' +
      PUBLIC_MONEY_FLOWS_ENABLED +
      ' but the server MONEY_FLOWS_ENABLED (flags.ts) is ' +
      serverMoneyFlowsEnabled() +
      '. Both must flip together during a launch (NEXT_PUBLIC_ values are baked at build time). ' +
      'Divergence leaves CTAs enabled against a disabled backend.'
  );
}
