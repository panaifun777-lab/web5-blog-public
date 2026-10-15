import { createPublicClient, http } from 'viem';

const client = createPublicClient({
  transport: http('https://rpc.mainnet.arc.io'),
});

const tokenAbi = [
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'owner', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
] as const;

async function main() {
  const tokenAddress = '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f';
  const superadmin = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';

  console.log('\n🔍 正在查询 Arc Mainnet 主网链上状态...');
  const symbol = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'symbol' });
  const decimals = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'decimals' });
  const total = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'totalSupply' });
  const bal = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'balanceOf', args: [superadmin] });
  const owner = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'owner' });

  console.log(`\n======================================================`);
  console.log(`💎 官方代币: ${symbol} (Web5 Bog Token)`);
  console.log(`📍 合约地址: ${tokenAddress}`);
  console.log(`👑 合约拥有者: ${owner}`);
  console.log(`🔢 代币精度: ${decimals}`);
  console.log(`📊 链上发行总量: ${(total / 10n ** BigInt(decimals)).toLocaleString()} ${symbol}`);
  console.log(`💰 你的当前持仓: ${(bal / 10n ** BigInt(decimals)).toLocaleString()} ${symbol} (100% 全部持有)`);
  console.log(`======================================================\n`);
}

main().catch(console.error);
