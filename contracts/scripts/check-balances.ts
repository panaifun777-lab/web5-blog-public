import 'dotenv/config';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';

const targetAddress = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';

const CHAINS = [
  { name: 'Arc Mainnet', rpc: 'https://rpc.mainnet.arc.io', nativeDecimals: 18, isArc: true },
  { name: 'Arc Testnet', rpc: 'https://rpc.testnet.arc.io', nativeDecimals: 18, isArc: true },
  { name: 'Base Sepolia', rpc: 'https://sepolia.base.org', nativeDecimals: 18 },
  { name: 'Base Mainnet', rpc: 'https://mainnet.base.org', nativeDecimals: 18 },
];

async function main() {
  console.log(`\n🔍 正在探测钱包地址 [${targetAddress}] 各链原生余额与网络状态...\n`);

  for (const c of CHAINS) {
    try {
      const client = createPublicClient({
        transport: http(c.rpc, { timeout: 8000 }),
      });
      const balance = await client.getBalance({ address: targetAddress as `0x${string}` });
      const formatted = formatUnits(balance, c.nativeDecimals);
      const isPositive = balance > 0n;
      console.log(`[${c.name}] => 原生余额: ${formatted} ${c.isArc ? 'USDC (Native Gas)' : 'ETH'} ${isPositive ? '🔥 [有余额]' : ''}`);
    } catch (err: any) {
      console.log(`[${c.name}] => 探测异常: ${err.message?.slice(0, 90)}`);
    }
  }
}

main().catch(console.error);
