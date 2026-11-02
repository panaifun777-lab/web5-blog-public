// ════════════════════════════════════════════════════════════════
// web5-payout.mjs — real-money actions, each gated behind --authorize
//
// Two subcommands. Both are DRY RUN unless you add --authorize:
//
//   node web5-payout.mjs escrow  --to 0xRECIP --amount 1 [--balance 10]
//                                [--signer local|kms] [--authorize]
//     Treasury -> recipient native USDC payout, same rails as
//     src/lib/web5/payments/arc.ts (single/pending caps + hot-wallet
//     ceiling). NOTE: this CLI does NOT write a PayoutLedger row and so
//     cannot enforce the rolling 24h cap; for normal settlements go
//     through the app, use this only for an authorized manual payment.
//
//   node web5-payout.mjs arweave --text "..." | --file <path> [--authorize]
//     Broadcast content to Arweave via Irys (Uploader(Matic).withWallet(
//     IRYS_PRIVATE_KEY)). Prints the 43-char arweaveHash on success.
//
// NEVER run --authorize unless the money decision is yours to make.
// ════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import {
  parseUsdcToWei, formatUsdc, checkHotWalletCeiling, getTreasuryAddress,
  getActiveChain, requireAuthorize, parseFlags, AuthorizationError, USDC_UNIT,
} from './ops-common.mjs';

const [command, ...rest] = process.argv.slice(2);

async function readTreasuryBalance(chain, treasury, override) {
  if (override !== undefined) return parseUsdcToWei(override);
  const { createPublicClient, http } = await import('viem');
  return await createPublicClient({ transport: http(chain.rpcUrl) }).getBalance({ address: treasury });
}

async function sendUsdc(chain, amountWei, to, signer) {
  if (signer === 'kms') {
    const url = (process.env.KMS_SIGNER_URL || '').trim();
    const token = (process.env.KMS_SIGNER_TOKEN || '').trim();
    if (!url || !token) throw new Error('KMS_SIGNER_URL / KMS_SIGNER_TOKEN not configured for --signer kms');
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ to, amount: amountWei.toString(), chainId: chain.id }), signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`KMS signer HTTP ${res.status}`);
    const json = await res.json();
    if (!/^0x[0-9a-fA-F]{64}$/.test(json.txHash || '')) throw new Error('KMS signer returned no valid txHash');
    return json.txHash;
  }
  const { createWalletClient, http, getAddress, parseGwei, defineChain } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const key = process.env.TREASURY_PAYOUT_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error('TREASURY_PAYOUT_PRIVATE_KEY missing/invalid for --signer local');
  const account = privateKeyToAccount(key);
  const arcChain = defineChain({ id: chain.id, name: chain.name, nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: [chain.rpcUrl] } } });
  const client = createWalletClient({ account, chain: arcChain, transport: http(chain.rpcUrl) });
  return await client.sendTransaction({ to: getAddress(to), value: amountWei, maxFeePerGas: parseGwei('25'), maxPriorityFeePerGas: parseGwei('2') });
}

async function cmdEscrow(flags) {
  const chain = getActiveChain();
  const treasury = getTreasuryAddress();
  if (!flags.to || !flags.amount) { console.error('usage: escrow --to <addr> --amount <usdc> [--balance <usdc>] [--signer local|kms] [--authorize]'); process.exit(2); }
  const amountWei = parseUsdcToWei(flags.amount);
  const balanceWei = await readTreasuryBalance(chain, treasury, flags.balance);
  const decision = checkHotWalletCeiling({ balanceWei, pendingPayoutWei: amountWei });

  console.log('── escrow payout ──────────────────────────');
  console.log(`chain    : ${chain.name} (${chain.id})`);
  console.log(`from     : ${treasury}`);
  console.log(`to       : ${flags.to}`);
  console.log(`amount   : ${formatUsdc(amountWei)} USDC`);
  console.log(`balance  : ${formatUsdc(balanceWei)} USDC`);
  console.log(`ceiling  : ${decision.reason}  (${decision.detail})`);

  if (!decision.ok) { console.log('\nREFUSED by rails before any signing. No transaction possible.'); return; }
  if (!flags.authorize) { console.log('\n[DRY RUN] add --authorize to actually broadcast.'); requireAuthorize(flags); return; }

  console.log(`\nAUTHORIZED: broadcasting via --signer ${(flags.signer || 'local').toLowerCase()} ...`);
  const txHash = await sendUsdc(chain, amountWei, flags.to, (flags.signer || 'local').toLowerCase());
  console.log(`txHash: ${txHash}\nexplorer: ${chain.explorer}/tx/${txHash}`);
}

async function cmdArweave(flags) {
  let body;
  if (flags.file) body = readFileSync(flags.file, 'utf8');
  else if (flags.text !== undefined) body = flags.text;
  else { console.error('usage: arweave (--text <string> | --file <path>) [--authorize]'); process.exit(2); }

  const size = Buffer.byteLength(body, 'utf8');
  const key = process.env.IRYS_PRIVATE_KEY;
  const rpc = process.env.IRYS_RPC_URL || 'https://1rpc.io/matic';

  console.log('── arweave broadcast ──────────────────────');
  console.log(`payload    : ${size} bytes (${flags.file ? 'file' : 'inline text'})`);
  console.log(`preview    : ${body.slice(0, 80).replace(/\s+/g, ' ')}${size > 80 ? '…' : ''}`);
  console.log(`irys key   : ${key ? 'configured' : 'NOT configured'}`);
  console.log(`irys rpc   : ${rpc}`);
  console.log(`gateway    : https://gateway.irys.xyz/<txid> after upload`);

  if (!flags.authorize) { console.log('\n[DRY RUN] add --authorize to actually upload to Arweave.'); requireAuthorize(flags); return; }
  if (!key) throw new Error('IRYS_PRIVATE_KEY is not configured; cannot broadcast');

  console.log('\nAUTHORIZED: uploading via Irys (Matic) ...');
  const { Uploader } = await import('@irys/upload');
  const { Matic } = await import('@irys/upload-ethereum');
  const irys = await Uploader(Matic).withWallet(key).withRpc(rpc);
  const receipt = await irys.upload(body, { tags: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'App-Name', value: 'Web5.blog' },
    { name: 'Network', value: 'Arweave-Mainnet' },
  ] });
  if (!/^[A-Za-z0-9_-]{43}$/.test(receipt.id)) throw new Error(`Irys returned a non-permanent id: ${receipt.id}`);
  console.log(`arweaveHash: ${receipt.id}`);
  console.log(`gateway url: https://gateway.irys.xyz/${receipt.id}`);
}

const flags = parseFlags(rest, { boolean: ['authorize'], string: ['to', 'amount', 'balance', 'signer', 'text', 'file'] });

async function main() {
  if (command === 'escrow') return cmdEscrow(flags);
  if (command === 'arweave') return cmdArweave(flags);
  console.error('subcommands: escrow | arweave   (run with --help-style args, dry-run unless --authorize)');
  process.exit(2);
}

main().catch((err) => {
  if (err instanceof AuthorizationError) { console.log(`\n${err.message}`); process.exit(0); }
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
