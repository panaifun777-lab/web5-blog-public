// ════════════════════════════════════════════════════════════════
// src/lib/web5/token-secret.ts
// Vessel Session Token 签名密钥解析
// 生产环境必须显式配置 VESSEL_TOKEN_SECRET；开发环境使用进程内随机
// 密钥，避免把任何签名密钥写死进仓库。
// ════════════════════════════════════════════════════════════════

import { randomBytes } from 'crypto';

let ephemeralDevSecret: string | null = null;

export function getVesselTokenSecret(): string {
  const configured = process.env.VESSEL_TOKEN_SECRET;
  if (configured && configured.length > 0) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('VESSEL_TOKEN_SECRET must be set in production');
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}
