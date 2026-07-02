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

/**
 * 获取 Irys Uploader（Ethereum 钱包）
 * 仅在 IRYS_PRIVATE_KEY 已配置时加载
 */
async function getIrysUploader() {
  try {
    const { Uploader } = await import('@irys/upload');
    const { Ethereum } = await import('@irys/upload-ethereum');
    const rpcURL = process.env.IRYS_RPC_URL || 'https://sepolia.base.org';

    return await Uploader(Ethereum)
      .withWallet(process.env.IRYS_PRIVATE_KEY!)
      .withRpc(rpcURL)
      .devnet();
  } catch (err) {
    // @irys/upload not installed or unavailable
    console.warn('[arweave-uploader] @irys/upload not available:', err);
    throw new Error('Irys SDK not available — install with: bun add @irys/upload @irys/upload-ethereum');
  }
}

/**
 * 上传内容至 Arweave（通过 Irys）
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

  if (process.env.IRYS_PRIVATE_KEY) {
    try {
      return await uploadViaIrys(body, size);
    } catch (err) {
      console.warn('[arweave-uploader] Irys upload failed, using fallback:', err);
      return generateFallback(content, size);
    }
  }

  return generateFallback(content, size);
}

async function uploadViaIrys(body: string, size: number): Promise<UploadResult> {
  const irys = await getIrysUploader();

  const receipt = await irys.upload(body, {
    tags: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'Web5.blog' },
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
