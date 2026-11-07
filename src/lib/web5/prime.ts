// ════════════════════════════════════════════════════════════════
// src/lib/web5/prime.ts
// Prime 身份辅助函数
//
// 统一 Prime.walletAddress 的写入口径。此前 publisher 与 vessel-login 两条
// 路径对"模拟 DID / 非 0x 身份"写入了不一致的值（一边是硬编码常量
// 0x1068...，另一边是 primeDid.split(':').pop()），导致同一身份的数据被
// 分裂到两条记录上。这里收敛为单一确定性规则，保证所有调用方一致。
// ════════════════════════════════════════════════════════════════

/**
 * 归一化 Prime 记录的 walletAddress。
 *
 * - 真实 EVM 地址（0x 前缀）原样返回，绝不改动既有真实钱包的写入口径。
 * - 模拟 / 非 0x 身份：返回由 Prime DID 派生的确定性值，保证 publisher、
 *   vessel-login 等所有调用方对同一个 DID 计算出完全相同的 walletAddress。
 *
 * @param rawWallet 原始钱包字符串；模拟登录路径（vessel-login）只持有
 *                  primeDid，此时传 undefined / null / '' 即可。
 * @param primeDid  Prime 的去中心化标识符，例如 did:web5:sim:abc
 */
export function normalizePrimeWalletAddress(
  rawWallet: string | null | undefined,
  primeDid: string | null | undefined,
): string {
  // 真实 EVM 地址：原样透传，保持既有行为不变。
  if (typeof rawWallet === 'string' && rawWallet.trim().startsWith('0x')) {
    return rawWallet.trim();
  }

  // 模拟 / 非 0x 身份：从 DID 派生确定性值，避免两路径写入分裂。
  const simId = (primeDid ?? '').split(':').pop() ?? '';
  return simId ? `sim:${simId}` : 'sim:unknown';
}
