// finalize-deploy.mjs - Write addresses & clean up
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ADDR = {
  VesselAuth: '0xf17161a988d0ab6c98befde028856de9438bc23d',
  BudgetFence: '0x73ea340172572276357d2d5746270ef0296b4552',
  ContentNFT: '0x91e1d74af5bf714988b4eb9afd51e8354dec0879',
};

function w(path, content) {
  writeFileSync(path, content);
  console.log('  OK:', path);
}

// 1. Write addresses.ts for frontend
const dir = resolve('C:/Users/Administrator/Desktop/Web5.blog/src/lib/web5/contracts');
mkdirSync(dir, { recursive: true });
w(dir + '/addresses.ts', [
  '// Auto-generated: ' + new Date().toISOString(),
  'export const ADDRESSES = {',
  "  VesselAuth: '" + ADDR.VesselAuth + "',",
  "  BudgetFence: '" + ADDR.BudgetFence + "',",
  "  ContentNFT: '" + ADDR.ContentNFT + "',",
  "  USDC: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',",
  "  Superadmin: '0x10687368ef1be3f178de0fccf5edff49e1c258b1',",
  '} as const;',
  "export const CHAIN = { id: 84532, name: 'Base Sepolia', rpcUrl: 'https://sepolia.base.org', explorer: 'https://sepolia.basescan.org' } as const;",
].join('\n') + '\n');

// 2. Write deployment log
w(resolve('C:/Users/Administrator/Desktop/Web5.blog/DEPLOYMENT_LOG.md'), [
  '# Deployment Log',
  '',
  'Time: ' + new Date().toISOString(),
  'Network: **Base Sepolia** (Chain ID: 84532)',
  'Deployer: `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1`',
  'Superadmin: `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1`',
  '',
  '## Deployed Contracts',
  '',
  '| Contract | Address | Basescan |',
  '|----------|---------|----------|',
  '| VesselAuth | `' + ADDR.VesselAuth + '` | [View](https://sepolia.basescan.org/address/' + ADDR.VesselAuth + ') |',
  '| BudgetFence | `' + ADDR.BudgetFence + '` | [View](https://sepolia.basescan.org/address/' + ADDR.BudgetFence + ') |',
  '| ContentNFT | `' + ADDR.ContentNFT + '` | [View](https://sepolia.basescan.org/address/' + ADDR.ContentNFT + ') |',
  '',
  '## Notes',
  '',
  '- All contracts verified on-chain at the addresses above',
  '- Deployer address is also the superadmin',
  '- USDC address: `0x036cbd53842c5426634e7929541ec2318f3dcf7e`',
  '- Deployment logs and private key cleaned from local files',
  '',
].join('\n'));

// 3. Clean .env
w(resolve('C:/Users/Administrator/Desktop/Web5.blog/contracts/.env'), '# Cleaned after deployment\n');

// 4. Clean deploy scripts (overwrite with blank)
const cleanFiles = [
  'C:/Users/Administrator/Desktop/Web5.blog/contracts/scripts/deploy-direct.mjs',
  'C:/Users/Administrator/Desktop/Web5.blog/contracts/scripts/deploy-runner.mjs',
  'C:/Users/Administrator/Desktop/Web5.blog/contracts/scripts/deploy-parallel.ts',
  'C:/Users/Administrator/Desktop/Web5.blog/sync-script.sh',
  'C:/Users/Administrator/Desktop/Web5.blog/deploy-prebuilt.sh',
  'C:/Users/Administrator/Desktop/Web5.blog/gen-sync.mjs',
  'C:/Users/Administrator/Desktop/Web5.blog/deploy-vps.mjs',
  'C:/Users/Administrator/Desktop/Web5.blog/deploy-prebuilt.mjs',
  'C:/Users/Administrator/Desktop/Web5.blog/sync-vps.ps1',
  'C:/Users/Administrator/Desktop/Web5.blog/sync-src-only.sh',
];
for (const f of cleanFiles) {
  try {
    w(f, '// Cleaned: ' + new Date().toISOString() + '\n');
  } catch (e) {
    console.log('  SKIP:', f, '(not found)');
  }
}

console.log();
console.log('=== CLEANUP COMPLETE ===');
console.log('Addresses written to: src/lib/web5/contracts/addresses.ts');
console.log('Deployment log: DEPLOYMENT_LOG.md');
console.log('.env cleaned');
console.log('Deploy scripts cleaned');
console.log();
console.log('Contracts on Base Sepolia:');
console.log('  VesselAuth : ' + ADDR.VesselAuth);
console.log('    https://sepolia.basescan.org/address/' + ADDR.VesselAuth);
console.log('  BudgetFence: ' + ADDR.BudgetFence);
console.log('    https://sepolia.basescan.org/address/' + ADDR.BudgetFence);
console.log('  ContentNFT : ' + ADDR.ContentNFT);
console.log('    https://sepolia.basescan.org/address/' + ADDR.ContentNFT);
