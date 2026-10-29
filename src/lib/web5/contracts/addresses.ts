// ════════════════════════════════════════════════════════════════
// Web5.bog 合约与链配置 — Base & Circle ARC 稳定币原生公链
// 部署钱包 / 超级管理员: 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
// ════════════════════════════════════════════════════════════════

export const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1' as const;

// 平台独立收银金库（与部署者钱包隔离，确保打赏为真实跨地址入账）
export const TREASURY = '0xCA36335845E382129167fC44243F07A76827bA22' as const;

// 托管收款地址：订单押金只能转入这里。服务端不接受调用方自选地址，
// 否则一笔普通转账（甚至自转）就能伪造"已托管"。
export const ESCROW_VAULT_ADDRESS = TREASURY;

// ━━ Circle ARC Mainnet (正式主网 Chain ID: 5042) ━━
export const ARC_MAINNET = {
  id: 5042,
  name: 'Arc Mainnet',
  rpcUrl: process.env.ARC_MAINNET_RPC || 'https://rpc.mainnet.arc.io',
  explorer: 'https://explorer.arc.io',
  usdcDecimals: 18,
  systemEmitter: '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE',
  addresses: {
    WBOG: '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
    ContentNFT: '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
    BudgetFence: '0xe0d246c09d7a3097bab3148f89201157dd531eea',
    VesselAuth: '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120',
    Deployer: SUPERADMIN,
  },
} as const;

// ━━ Circle ARC Testnet (测试网 Chain ID: 5042002) ━━
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrl: process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.io',
  explorer: 'https://explorer.testnet.arc.io',
  usdcDecimals: 18,
  systemEmitter: '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE',
  addresses: {
    WBOG: '0xb3f174ae34b4273ae6dfd4488327c1d1784d35eb',
    ContentNFT: '0x7c3b4a0b96231569948580fee9cacf249eef9b06',
    BudgetFence: '0x6d2b033bec90760773d15faaab3ab02a7230d020',
    VesselAuth: '0xb0375be87f3a8ebb7006ec2be8aac789d71bdc26',
    Deployer: SUPERADMIN,
  },
} as const;

// ━━ Base Sepolia (开发环境备用) ━━
export const BASE_SEPOLIA = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
  usdcDecimals: 6,
  addresses: {
    VesselAuth: '0xF17161a988d0Ab6c98BefDE028856De9438Bc23D',
    BudgetFence: '0x73eA340172572276357d2D5746270Ef0296b4552',
    ContentNFT: '0x91e1d74aF5BF714988b4eB9AFd51E8354deC0879',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCf7e',
    Superadmin: SUPERADMIN,
  },
} as const;

// 默认主网激活导出
export const ADDRESSES = ARC_MAINNET.addresses;
export const CHAIN = ARC_MAINNET;
export const CONTRACTS_DEPLOYED = true;

/** 获取当前激活链配置 */
export function getActiveChain() {
  const target = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'arc-mainnet').toLowerCase();
  if (target === 'arc-testnet') return ARC_TESTNET;
  if (target === 'base-sepolia') return BASE_SEPOLIA;
  return ARC_MAINNET;
}
