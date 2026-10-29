// ════════════════════════════════════════════════════════════════
// src/lib/web5/content/arweave-uploader.ts
// Irys SDK 真实上传 + 本地 fallback（Arweave 永久存储）
// 使用 @irys/upload + @irys/upload-ethereum
// ════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';

export interface UploadResult {
  arweaveHash: string;
  irysReceipt?: string;
  size: number;
  timestamp: number;
  fallback: boolean;
}

// 永久存证失败：requirePermanent 模式下不允许降级，直接抛错
export class ArweavePermanenceError extends Error {
  readonly causeMessage: string;

  constructor(causeMessage: string, cause?: unknown) {
    super(`Arweave 永久存证失败：${causeMessage}`, { cause });
    this.name = 'ArweavePermanenceError';
    this.causeMessage = causeMessage;
  }
}

/**
 * 获取 Irys Uploader（Polygon Matic / POL 主网钱包）
 * 支持生产环境配置的 IRYS_PRIVATE_KEY，真实直连 Arweave Mainnet Permaweb
 */
async function getIrysUploader() {
  try {
    const { Uploader } = await import('@irys/upload');
    const { Matic } = await import('@irys/upload-ethereum');
    const privateKey = process.env.IRYS_PRIVATE_KEY;
    if (!privateKey) throw new Error('IRYS_PRIVATE_KEY is not configured');
    const rpcURL = process.env.IRYS_RPC_URL || 'https://1rpc.io/matic';

    return await Uploader(Matic)
      .withWallet(privateKey)
      .withRpc(rpcURL);
  } catch (err) {
    console.warn('[arweave-uploader] Irys SDK load failed:', err);
    throw new Error('Irys SDK not available', { cause: err });
  }
}

// 错误信息里剔除私钥与环境变量值，只保留可读原因
function describeCause(err: unknown): string {
  const base = err instanceof Error ? err.message : String(err);
  const inner = err instanceof Error && err.cause instanceof Error ? `（${err.cause.message}）` : '';
  return redactEnvValues(`${base}${inner}`).trim() || 'unknown error';
}

function redactEnvValues(text: string): string {
  let out = text;
  const privateKey = process.env.IRYS_PRIVATE_KEY;
  if (privateKey) out = out.split(privateKey).join('[redacted]');
  for (const value of Object.values(process.env)) {
    if (typeof value === 'string' && value.length >= 8) {
      out = out.split(value).join('[redacted]');
    }
  }
  return out.slice(0, 300);
}

/**
 * 上传内容至 Arweave 主网（通过 Irys 真实主网节点）
 * requirePermanent=true 时只能成功或抛 ArweavePermanenceError，绝不用本地哈希冒充
 */
export async function uploadToArweave(
  content: {
    title: string;
    bodyMd: string;
    authorDid: string;
    timestamp: number;
    coverImageHash?: string;
  },
  options?: { requirePermanent?: boolean }
): Promise<UploadResult> {
  const body = JSON.stringify(content);
  const size = Buffer.byteLength(body, 'utf8');

  try {
    const result = await uploadViaIrys(body, size);
    // 严格模式下 hash 必须是合法 Arweave 交易 ID（43 位 base64url）
    if (options?.requirePermanent === true && !isPermanentUpload(result)) {
      throw new ArweavePermanenceError('Irys 返回的 arweaveHash 不是合法的 43 位交易 ID', result);
    }
    return result;
  } catch (err) {
    if (err instanceof ArweavePermanenceError) throw err;
    if (options?.requirePermanent === true) {
      // 严格模式：缺私钥、SDK 异常、任何抛出都视为存证失败
      throw new ArweavePermanenceError(describeCause(err), err);
    }
    console.warn('[arweave-uploader] Irys upload failed, using fallback:', err);
    return generateFallback(content, size);
  }
}

// 只有真实上链且 hash 合法才算永久存证
export function isPermanentUpload(result: UploadResult): boolean {
  return !result.fallback && /^[A-Za-z0-9_-]{43}$/.test(result.arweaveHash);
}

async function uploadViaIrys(body: string, size: number): Promise<UploadResult> {
  const irys = await getIrysUploader();

  const receipt = await irys.upload(body, {
    tags: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'Web5.blog' },
      { name: 'App-Version', value: '3.0.0' },
      { name: 'Network', value: 'Arweave-Mainnet' },
    ],
  });

  return {
    arweaveHash: receipt.id,
    irysReceipt: receipt.signature,
    size,
    timestamp: Date.now(),
    fallback: false,
  };
}

function generateFallback(
  content: { title: string; bodyMd: string; authorDid: string; timestamp: number },
  size: number
): UploadResult {
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

export async function batchUpload(
  contents: Array<{ title: string; bodyMd: string; authorDid: string; timestamp: number }>
): Promise<UploadResult[]> {
  return Promise.all(contents.map((c) => uploadToArweave(c)));
}

export function estimateUploadCost(sizeBytes: number): {
  ar: number;
  usd: number;
  buffer: number;
} {
  const AR_PRICE_USD = 8.5;
  const COST_PER_GB_USD = 0.5;
  const BUFFER_FACTOR = 1.1;

  const sizeGb = sizeBytes / (1024 ** 3);
  const usd = sizeGb * COST_PER_GB_USD * BUFFER_FACTOR;
  const ar = usd / AR_PRICE_USD;

  return { ar, usd, buffer: BUFFER_FACTOR };
}
