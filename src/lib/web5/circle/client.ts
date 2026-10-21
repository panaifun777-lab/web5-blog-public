// ════════════════════════════════════════════════════════════════
// src/lib/web5/circle/client.ts
// Circle Developer-Controlled Wallets SDK 客户端封装
// 为 Web5.bog 的 AI 分身 (Eidolon) 动态派发 Vessel 智能托管钱包与结算网关
// ════════════════════════════════════════════════════════════════

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

let circleClientInstance: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

/**
 * 获取 Circle 开发者控制钱包客户端单例
 */
export function getCircleClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    return null;
  }

  if (!circleClientInstance) {
    circleClientInstance = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });
  }

  return circleClientInstance;
}

export interface VesselWalletInfo {
  walletId: string;
  address: string;
  blockchain: string;
  walletSetId?: string;
  isMock: boolean;
}

/**
 * 为 AI 分身创建/派发 ARC 链专属的 Vessel 托管钱包
 */
export async function createVesselWallet(params: {
  eidolonDid: string;
  walletSetName?: string;
  blockchain?: 'ARC' | 'ARC-TESTNET' | 'EVM';
}): Promise<VesselWalletInfo> {
  const client = getCircleClient();
  const targetChain = (params.blockchain || 'ARC-TESTNET') as any;

  // 模拟模式 fallback（当未配置 Circle API Key 时）
  if (!client) {
    const mockHash = Buffer.from(params.eidolonDid).toString('hex').slice(0, 40);
    const mockAddress = `0x${mockHash.padEnd(40, 'a')}`;
    return {
      walletId: `circle-mock-${mockHash.slice(0, 16)}`,
      address: mockAddress,
      blockchain: targetChain,
      isMock: true,
    };
  }

  try {
    // 1. 创建或获取 WalletSet
    const walletSetRes = await client.createWalletSet({
      name: params.walletSetName || `Web5-Eidolon-Set-${Date.now()}`,
    });
    const walletSetId = walletSetRes.data?.walletSet?.id;

    if (!walletSetId) {
      throw new Error('Failed to create Circle WalletSet');
    }

    // 2. 在目标链上生成 1 个开发者托管钱包
    const walletsRes = await client.createWallets({
      blockchains: [targetChain],
      count: 1,
      walletSetId,
    });

    const createdWallet = walletsRes.data?.wallets?.[0];
    if (!createdWallet) {
      throw new Error('Failed to generate Circle Wallet');
    }

    return {
      walletId: createdWallet.id,
      address: createdWallet.address,
      blockchain: createdWallet.blockchain,
      walletSetId,
      isMock: false,
    };
  } catch (error) {
    console.error('[Circle] createVesselWallet failed, falling back to local simulation:', error);
    const mockHash = Buffer.from(params.eidolonDid).toString('hex').slice(0, 40);
    return {
      walletId: `circle-fallback-${mockHash.slice(0, 16)}`,
      address: `0x${mockHash.padEnd(40, 'b')}`,
      blockchain: targetChain,
      isMock: true,
    };
  }
}

/**
 * 执行微支付转账 (USDC / 原生代币)
 */
export async function executeVesselPayment(params: {
  walletId: string;
  destinationAddress: string;
  amount: string; // 例如 "0.05"
  tokenId?: string; // Circle token ID，未指定则转账原生/主代币
}) {
  const client = getCircleClient();
  if (!client) {
    // 模拟交易成功
    return {
      success: true,
      txId: `mock-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isMock: true,
    };
  }

  const txParams: any = {
    walletId: params.walletId,
    destinationAddress: params.destinationAddress,
    amount: [params.amount],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  };
  if (params.tokenId) {
    txParams.tokenId = params.tokenId;
  }

  const res = await (client as any).createTransaction(txParams);

  return {
    success: true,
    txId: res.data?.id,
    state: res.data?.state,
    isMock: false,
  };
}
