// ════════════════════════════════════════════════════════════════
// Web5.blog 合约地址配置 — Base Sepolia (Chain ID: 84532)
// 部署时间: 2026-07-01
// 超级管理员: 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
// ════════════════════════════════════════════════════════════════

export const ADDRESSES = {
  VesselAuth: '0xF17161a988d0Ab6c98BefDE028856De9438Bc23D',
  BudgetFence: '0x73eA340172572276357d2D5746270Ef0296b4552',
  ContentNFT: '0x91e1d74aF5BF714988b4eB9AFd51E8354deC0879',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCf7e',
  Superadmin: '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
} as const;

export const CHAIN = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
} as const;
