// ════════════════════════════════════════════════════════════════
// Web5.blog 合约地址配置
// 部署到 Base Sepolia 后，将实际地址填入此处
// superadmin = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
// ════════════════════════════════════════════════════════════════

export const ADDRESSES = {
  // 合约地址（部署后替换）
  VesselAuth: '0x0000000000000000000000000000000000000001', // 占位地址，部署后替换
  BudgetFence: '0x0000000000000000000000000000000000000002',
  ContentNFT: '0x0000000000000000000000000000000000000003',
  // USDC 测试币
  USDC: '0x0000000000000000000000000000000000000000',
  // 超级管理员
  Superadmin: '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
} as const;

export const CHAIN = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
} as const;

export const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';

// 合约是否已部署（用于 UI 显示状态）
export const CONTRACTS_DEPLOYED =
  ADDRESSES.VesselAuth !== '0x0000000000000000000000000000000000000001';
