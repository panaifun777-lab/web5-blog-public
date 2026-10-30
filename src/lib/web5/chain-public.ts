// ════════════════════════════════════════════════════════════════
// src/lib/web5/chain-public.ts
// 客户端安全的 Arc 链常量（构建期可切换 mainnet / testnet）
// 依赖仅有 NEXT_PUBLIC_* 环境变量，禁止引入 Node 内置模块
// ════════════════════════════════════════════════════════════════

export type PublicChainKey = 'arc-mainnet' | 'arc-testnet';

export interface PublicChain {
  readonly id: number;
  readonly idHex: string;
  readonly name: string;
  readonly rpcUrl: string;
  readonly explorer: string;
  readonly escrowVault: string;
  /** true 表示 escrowVault 来自 NEXT_PUBLIC_ESCROW_VAULT_ADDRESS（否则为内置回退值） */
  readonly escrowVaultConfigured: boolean;
}

const MAINNET_ESCROW_VAULT = '0xCA36335845E382129167fC44243F07A76827bA22';

const isEvmAddress = (value: string | undefined): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

const ACTIVE_CHAIN: PublicChainKey =
  process.env.NEXT_PUBLIC_ACTIVE_CHAIN === 'arc-testnet' ? 'arc-testnet' : 'arc-mainnet';

const CONFIGURED_VAULT = process.env.NEXT_PUBLIC_ESCROW_VAULT_ADDRESS;
const validConfiguredVault = isEvmAddress(CONFIGURED_VAULT) ? CONFIGURED_VAULT : undefined;

// testnet 必须显式提供金库地址；缺失时回退主网地址，避免构建/运行崩溃
const CHAIN_BASE =
  ACTIVE_CHAIN === 'arc-testnet'
    ? {
        id: 5042002,
        idHex: '0x4cef52',
        name: 'Arc Testnet',
        rpcUrl: 'https://rpc.testnet.arc.io',
        explorer: 'https://explorer.testnet.arc.io',
      }
    : {
        id: 5042,
        idHex: '0x13b2',
        name: 'Arc Mainnet',
        rpcUrl: 'https://rpc.mainnet.arc.io',
        explorer: 'https://explorer.arc.io',
      };

export const PUBLIC_CHAIN: PublicChain = Object.freeze({
  ...CHAIN_BASE,
  escrowVault: validConfiguredVault ?? MAINNET_ESCROW_VAULT,
  escrowVaultConfigured: validConfiguredVault !== undefined,
});

/** 便捷具名导出，便于只需要该开关的调用方使用 */
export const escrowVaultConfigured = PUBLIC_CHAIN.escrowVaultConfigured;
