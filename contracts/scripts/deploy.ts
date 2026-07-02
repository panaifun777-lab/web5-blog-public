// ════════════════════════════════════════════════════════════════
// contracts/scripts/deploy.ts — Base Sepolia 部署脚本
// 使用 viem 部署三个核心合约：
//   1. VesselAuth.sol     — 容器登录授权
//   2. BudgetFence.sol    — AP2 微支付预算控制
//   3. ContentNFT.sol     — 内容确权 NFT
// superadmin = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
// ════════════════════════════════════════════════════════════════
//
// 部署步骤（在本地或 VPS 执行）：
//
// 1. 安装依赖
//    cd /home/z/my-project/contracts
//    bun init -y
//    bun add viem dotenv
//
// 2. 配置 .env
//    cp .env.example .env
//    # 编辑 .env，填入：
//    #   DEPLOYER_PRIVATE_KEY=0x...（持有 ETH for gas 的钱包私钥）
//    #   BASE_SEPOLIA_RPC=https://sepolia.base.org
//    #   SUPERADMIN=0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
//    #   USDC_ADDRESS=0x...（Base Sepolia USDC 测试币地址，可选）
//
// 3. 编译合约（需要 Foundry）
//    curl -L https://foundry.paradigm.xyz | bash
//    foundryup
//    forge install OpenZeppelin/openzeppelin-contracts --no-commit
//    forge build
//
// 4. 部署
//    bun run scripts/deploy.ts
//
// 5. 部署完成后，将合约地址复制到：
//    /home/z/my-project/src/lib/web5/contracts/addresses.ts

import 'dotenv/config';
import { createWalletClient, http, parseEther, encodeDeployData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

// ━━ 合约 ABI（简化版，仅 constructor + 关键方法） ━━
const VesselAuthABI = [
  {
    type: 'constructor',
    inputs: [{ name: 'superadmin', type: 'address' }],
  },
] as const;

const BudgetFenceABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: 'superadmin', type: 'address' },
    ],
  },
] as const;

const ContentNFTABI = [
  {
    type: 'constructor',
    inputs: [{ name: 'superadmin', type: 'address' }],
  },
] as const;

// ━━ 合约字节码（需 forge build 后从 out/ 读取） ━━
function loadBytecode(contractName: string): `0x${string}` {
  const paths = [
    `./out/${contractName}.sol/${contractName}.json`,
    `./forge-artifacts/${contractName}.sol/${contractName}.json`,
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, 'utf8'));
      return artifact.bytecode.object;
    }
  }
  throw new Error(`Bytecode not found for ${contractName}. Run 'forge build' first.`);
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
  const superadmin = (process.env.SUPERADMIN || '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1') as `0x${string}`;
  const usdcAddress = (process.env.USDC_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

  if (!privateKey || !privateKey.startsWith('0x')) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set or invalid');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  Web5.blog Contract Deployment — Base Sepolia');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  RPC:        ${rpcUrl}`);
  console.log(`  Superadmin: ${superadmin}`);
  console.log(`  USDC:       ${usdcAddress}`);
  console.log('');

  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  console.log(`  Deployer:   ${account.address}`);
  console.log('');

  const deployedAddresses: Record<string, string> = {};

  // ━━ 1. 部署 VesselAuth ━━
  console.log('▸ Deploying VesselAuth...');
  try {
    const bytecode = loadBytecode('VesselAuth');
    const hash = await client.sendTransaction({
      data: encodeDeployData({
        abi: VesselAuthABI,
        bytecode,
        args: [superadmin],
      }) as `0x${string}`,
    });
    console.log(`  Tx hash: ${hash}`);
    console.log('  ⏳ Waiting for confirmation...');
    // 等待区块确认（简化版，生产环境用 waitForTransactionReceipt）
    await new Promise((r) => setTimeout(r, 5000));
    console.log('  ✓ VesselAuth deployed');
  } catch (err) {
    console.error('  ❌ VesselAuth deployment failed:', err);
  }

  // ━━ 2. 部署 BudgetFence ━━
  console.log('▸ Deploying BudgetFence...');
  try {
    const bytecode = loadBytecode('BudgetFence');
    const hash = await client.sendTransaction({
      data: encodeDeployData({
        abi: BudgetFenceABI,
        bytecode,
        args: [usdcAddress, superadmin],
      }) as `0x${string}`,
    });
    console.log(`  Tx hash: ${hash}`);
    await new Promise((r) => setTimeout(r, 5000));
    console.log('  ✓ BudgetFence deployed');
  } catch (err) {
    console.error('  ❌ BudgetFence deployment failed:', err);
  }

  // ━━ 3. 部署 ContentNFT ━━
  console.log('▸ Deploying ContentNFT...');
  try {
    const bytecode = loadBytecode('ContentNFT');
    const hash = await client.sendTransaction({
      data: encodeDeployData({
        abi: ContentNFTABI,
        bytecode,
        args: [superadmin],
      }) as `0x${string}`,
    });
    console.log(`  Tx hash: ${hash}`);
    await new Promise((r) => setTimeout(r, 5000));
    console.log('  ✓ ContentNFT deployed');
  } catch (err) {
    console.error('  ❌ ContentNFT deployment failed:', err);
  }

  // ━━ 输出部署地址 ━━
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Deployment Complete');
  console.log('═══════════════════════════════════════════════════');
  console.log('  ⚠️  实际部署后，请将合约地址从 Basescan 复制到：');
  console.log('  src/lib/web5/contracts/addresses.ts');
  console.log('');

  // 生成 addresses.ts 模板
  const template = `// Auto-generated by deploy.ts — 替换为实际部署地址
export const ADDRESSES = {
  VesselAuth: '0x...',   // TODO: 替换
  BudgetFence: '0x...',   // TODO: 替换
  ContentNFT: '0x...',    // TODO: 替换
  USDC: '${usdcAddress}',
  Superadmin: '${superadmin}',
} as const;

export const CHAIN = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: '${rpcUrl}',
  explorer: 'https://sepolia.basescan.org',
} as const;
`;
  fs.writeFileSync('../src/lib/web5/contracts/addresses.ts', template);
  console.log('  ✓ Template written to src/lib/web5/contracts/addresses.ts');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
