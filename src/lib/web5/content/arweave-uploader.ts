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
    throw new Error('Irys SDK not available');
  }
}

/**
 * 上传内容至 Arweave 主网（通过 Irys 真实主网节点）
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

  try {
    return await uploadViaIrys(body, size);
  } catch (err) {
    console.warn('[arweave-uploader] Irys upload failed, using fallback:', err);
    return generateFallback(content, size);
  }
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
