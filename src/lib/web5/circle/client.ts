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
  walletId: string | null;
  address: string | null;
  blockchain: string;
  walletSetId?: string;
  provisioned: boolean;
  error?: string;
}

/**
 * 为 AI 分身创建/派发 ARC 链专属的 Vessel 托管钱包。
 * 未配置或调用失败时返回未部署状态，绝不生成占位地址。
 */
export async function createVesselWallet(params: {
  eidolonDid: string;
  walletSetName?: string;
  blockchain?: 'ARC' | 'ARC-TESTNET' | 'EVM';
}): Promise<VesselWalletInfo> {
  const client = getCircleClient();
  const targetChain = (params.blockchain || 'ARC-TESTNET') as any;

  if (!client) {
    console.warn('[Circle] client not configured; vessel wallet not provisioned');
    return {
      walletId: null,
      address: null,
      blockchain: targetChain,
      provisioned: false,
      error: 'CIRCLE_NOT_CONFIGURED',
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
      provisioned: true,
    };
  } catch (error) {
    console.error('[Circle] createVesselWallet failed; vessel wallet not provisioned:', error);
    return {
      walletId: null,
      address: null,
      blockchain: targetChain,
      provisioned: false,
      error: 'CIRCLE_PROVISION_FAILED',
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
    throw new Error('Circle is not configured; cannot execute payment');
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
