// ════════════════════════════════════════════════════════════════
// contracts/scripts/deploy-curve.ts
// 部署 GenesisCurveVault.sol 创世联合曲线储备金库
// 目标链: Circle ARC Mainnet (5042) / Arc Testnet (5042002)
// ════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { createWalletClient, createPublicClient, http, defineChain, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1' as const;
const WBOG_MAINNET = '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f';

const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_MAINNET_RPC || 'https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://explorer.arc.io' } },
});

function loadArtifact(contractName: string) {
  const p = path.resolve(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { bytecode: json.bytecode.object as `0x${string}`, abi: json.abi };
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY is missing');

  const account = privateKeyToAccount(privateKey);
  console.log(`\n🚀 准备在 Arc Mainnet 部署 GenesisCurveVault...`);
  console.log(`📍 部署者: ${account.address}`);

  const walletClient = createWalletClient({ account, chain: arcMainnet, transport: http() });
  const publicClient = createPublicClient({ chain: arcMainnet, transport: http() });

  const { bytecode, abi } = loadArtifact('GenesisCurveVault');
  
  // 在 Arc 链上，结算 USDC 代币可直接对齐 WBOG 或系统的代币接口
  const usdcToken = process.env.ARC_USDC_CONTRACT || WBOG_MAINNET; 

  console.log('正在广播部署交易...');
  const txHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [usdcToken, WBOG_MAINNET, SUPERADMIN],
    maxFeePerGas: parseGwei('25'),
    maxPriorityFeePerGas: parseGwei('2'),
  });

  console.log(`🔗 部署交易哈希: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`✅ GenesisCurveVault 部署成功: ${receipt.contractAddress}`);
}

main().catch(console.error);
