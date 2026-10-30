// ════════════════════════════════════════════════════════════════
// src/lib/web5/vessel-wallet.ts
// Vessel 网站专用钱包（预付卡模式 Session Key 免签微支付）
// 本地生成 ECDSA 密钥对 → 专用钱包地址；日常打赏/发任务由它签名，不弹主钱包
// 主钱包只做一次性身份确认 + 一次性充值
// ════════════════════════════════════════════════════════════════

'use client';

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, parseGwei, keccak256 } from 'viem';
import { PUBLIC_CHAIN } from './chain-public';

// 链参数来自构建期配置，默认仍为主网 5042
const ARC_CHAIN = {
  id: PUBLIC_CHAIN.id,
  name: PUBLIC_CHAIN.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_CHAIN.rpcUrl] } },
} as const;

const WALLET_PK_KEY = 'web5_vessel_wallet_pk';

export interface VesselWallet {
  address: string;
  privateKey: string;
  isNew: boolean;
}

/** 获取或创建本地专用钱包（Session Key 密钥对）；本地密钥损坏时自动重建 */
export function getOrCreateVesselWallet(): VesselWallet {
  let pk = '';
  let isNew = false;
  try {
    pk = localStorage.getItem(WALLET_PK_KEY) || '';
  } catch {}
  let account: ReturnType<typeof privateKeyToAccount> | null = null;
  if (pk) {
    try {
      account = privateKeyToAccount(pk as `0x${string}`);
    } catch {
      console.warn('[Web5] Stored vessel key is invalid, regenerating');
    }
  }
  if (!account) {
    pk = generatePrivateKey();
    isNew = true;
    account = privateKeyToAccount(pk as `0x${string}`);
    try {
      localStorage.setItem(WALLET_PK_KEY, pk);
    } catch {}
  }
  return { address: account.address, privateKey: pk, isNew };
}

/** 用本地专用钱包签名登录消息（免插件容器登录） */
export async function signVesselLoginMessage(message: string): Promise<string> {
  const { privateKey } = getOrCreateVesselWallet();
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return account.signMessage({ message });
}

/** 专用钱包签名转账（免主钱包，受 BudgetFence 限额约束） */
export async function vesselWalletTransfer(to: string, amountUsdc: string): Promise<string> {
  const { privateKey } = getOrCreateVesselWallet();
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: ARC_CHAIN,
    transport: http(),
  });

  const amountWei = BigInt(Math.round(parseFloat(amountUsdc) * 1e18));
  const txHash = await walletClient.sendTransaction({
    to: to as `0x${string}`,
    value: amountWei,
    maxFeePerGas: parseGwei('25'),
    maxPriorityFeePerGas: parseGwei('2'),
  });
  return txHash;
}

/** 查询专用钱包余额（ARC 原生 USDC） */
export async function getVesselWalletBalance(address: string): Promise<number> {
  try {
    const publicClient = createPublicClient({ chain: ARC_CHAIN, transport: http() });
    const bal = await publicClient.getBalance({ address: address as `0x${string}` });
    return Number(bal) / 1e18;
  } catch {
    return 0;
  }
}

/** 清除本地专用钱包（退出/换号时） */
export function clearVesselWallet() {
  try {
    localStorage.removeItem(WALLET_PK_KEY);
  } catch {}
}

/** 
 * 跨设备确定性派生方案：
 * 通过主钱包 personal_sign("Web5.blog Sovereign Vessel Key Derivation") 的签名派生出唯一的专用钱包私钥
 * 确保用户在换电脑、换手机或清理浏览器后，只要主钱包一键签名即可永久找回同一个专属零钱包与余额！
 */
export function deriveVesselWalletFromSignature(signature: string): VesselWallet {
  const pk = keccak256(signature as `0x${string}`);
  try {
    localStorage.setItem(WALLET_PK_KEY, pk);
  } catch {}
  const account = privateKeyToAccount(pk as `0x${string}`);
  return { address: account.address, privateKey: pk, isNew: false };
}
