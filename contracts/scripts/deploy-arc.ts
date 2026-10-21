// ════════════════════════════════════════════════════════════════
// contracts/scripts/deploy-arc.ts — Circle ARC 链部署脚本
// 部署合约清单：
//   1. WBOGToken.sol    — 官方代币 (10 亿枚固定总量，18位精度)
//   2. ContentNFT.sol   — 博客内容确权 NFT
//   3. BudgetFence.sol  — AP2 微支付三道闸
//   4. VesselAuth.sol   — 容器唤醒四步握手授权
// 部署地址 / 初始所有者: 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
// ════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { createWalletClient, createPublicClient, http, defineChain, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1' as const;

// ━━ Arc 链配置 ━━
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.testnet.arc.io' },
  },
});

const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARC_MAINNET_RPC || 'https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.arc.io' },
  },
});

function loadBytecode(contractName: string): `0x${string}` {
  const artifactPath = path.resolve(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Please run 'forge build' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.bytecode.object as `0x${string}`;
}

function loadAbi(contractName: string): any[] {
  const artifactPath = path.resolve(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.abi;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error('❌ Error: DEPLOYER_PRIVATE_KEY is missing');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  const rawNetwork = (process.env.ARC_NETWORK || '').toLowerCase();
  const isMainnet = process.argv.includes('--mainnet') || rawNetwork.includes('mainnet');
  const targetChain = isMainnet ? arcMainnet : arcTestnet;

  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`🚀 启动 Web5.bog 协议与代币部署 — ${targetChain.name}`);
  console.log(`📍 部署者地址: ${account.address}`);
  console.log(`👑 拥有者 / Superadmin: ${SUPERADMIN}`);
  console.log(`══════════════════════════════════════════════════════\n`);

  const walletClient = createWalletClient({
    account,
    chain: targetChain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(),
  });

  // 检查原生 USDC 余额
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 当前钱包 Gas 余额 (USDC): ${(Number(balance) / 1e18).toFixed(4)} USDC`);

  if (balance === 0n) {
    console.error('❌ 钱包 Gas 余额为 0，无法支付部署手续费');
    process.exit(1);
  }

  // Arc 链设定 20 Gwei 下限，我们设置 25 Gwei 确保顺利打包
  const feeOverrides = {
    maxFeePerGas: parseGwei('25'),
    maxPriorityFeePerGas: parseGwei('2'),
  };

  const deployed: Record<string, string> = {};

  // 1. 部署 $WBOG
  console.log('\n[1/4] 🚀 部署 $WBOG (Web5 Bog Token, 10 亿枚)...');
  const wbogTx = await walletClient.deployContract({
    abi: loadAbi('WBOGToken'),
    bytecode: loadBytecode('WBOGToken'),
    args: [SUPERADMIN],
    ...feeOverrides,
  });
  console.log(`  🔗 交易已提交: ${wbogTx}`);
  const wbogReceipt = await publicClient.waitForTransactionReceipt({ hash: wbogTx });
  deployed.WBOG = wbogReceipt.contractAddress!;
  console.log(`  ✅ $WBOG 已成功部署: ${deployed.WBOG}`);

  // 2. 部署 ContentNFT
  console.log('\n[2/4] 🚀 部署 ContentNFT (博客确权 NFT)...');
  const nftTx = await walletClient.deployContract({
    abi: loadAbi('ContentNFT'),
    bytecode: loadBytecode('ContentNFT'),
    args: [SUPERADMIN],
    ...feeOverrides,
  });
  console.log(`  🔗 交易已提交: ${nftTx}`);
  const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftTx });
  deployed.ContentNFT = nftReceipt.contractAddress!;
  console.log(`  ✅ ContentNFT 已成功部署: ${deployed.ContentNFT}`);

  // 3. 部署 BudgetFence
  console.log('\n[3/4] 🚀 部署 BudgetFence (AP2 微支付三道闸)...');
  // 结算代币直接使用刚部署的 WBOG
  const paymentToken = deployed.WBOG;
  const bfTx = await walletClient.deployContract({
    abi: loadAbi('BudgetFence'),
    bytecode: loadBytecode('BudgetFence'),
    args: [paymentToken, SUPERADMIN],
    ...feeOverrides,
  });
  console.log(`  🔗 交易已提交: ${bfTx}`);
  const bfReceipt = await publicClient.waitForTransactionReceipt({ hash: bfTx });
  deployed.BudgetFence = bfReceipt.contractAddress!;
  console.log(`  ✅ BudgetFence 已成功部署: ${deployed.BudgetFence}`);

  // 4. 部署 VesselAuth
  console.log('\n[4/4] 🚀 部署 VesselAuth (容器授权与握手)...');
  const vaTx = await walletClient.deployContract({
    abi: loadAbi('VesselAuth'),
    bytecode: loadBytecode('VesselAuth'),
    args: [SUPERADMIN],
    ...feeOverrides,
  });
  console.log(`  🔗 交易已提交: ${vaTx}`);
  const vaReceipt = await publicClient.waitForTransactionReceipt({ hash: vaTx });
  deployed.VesselAuth = vaReceipt.contractAddress!;
  console.log(`  ✅ VesselAuth 已成功部署: ${deployed.VesselAuth}`);

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`🎉 恭喜！${targetChain.name} 全套智能合约与代币部署完成！`);
  console.log(JSON.stringify(deployed, null, 2));
  console.log('══════════════════════════════════════════════════════\n');

  // 将结果写入 contracts/deployed-<network>.json 供自动同步
  const outFile = path.resolve(__dirname, `../deployed-${targetChain.id}.json`);
  fs.writeFileSync(outFile, JSON.stringify({
    network: targetChain.name,
    chainId: targetChain.id,
    deployedAt: new Date().toISOString(),
    superadmin: SUPERADMIN,
    contracts: deployed,
  }, null, 2));
  console.log(`📄 部署信息已保存至: ${outFile}`);
}

main().catch((err) => {
  console.error('\n❌ 部署过程发生异常:', err);
  process.exit(1);
});
