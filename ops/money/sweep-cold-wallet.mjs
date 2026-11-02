// ════════════════════════════════════════════════════════════════
// sweep-cold-wallet.mjs — manual hot→cold sweep executor
//
// The app deliberately ships NO sweep executor (docs/HOT_WALLET.md §6 step 0):
// sweeping is a human decision. This is that human tool. It computes the
// same planSweep() the app exposes, prints it, and only broadcasts when you
// pass --authorize.
//
//   node sweep-cold-wallet.mjs --to 0xCOLD... [--reserve 5] [--signer local|kms]
//                              [--balance 30]        # offline preview override
//                              [--authorize]        # REQUIRED to actually send
//
// --balance lets you rehearse the math with no RPC. Without it the script
// reads the live treasury balance over the Arc RPC.
// ════════════════════════════════════════════════════════════════

import { planSweep, parseUsdcToWei, getSweepReserveWei, formatUsdc, getTreasuryAddress, getActiveChain, requireAuthorize, parseFlags, AuthorizationError } from './ops-common.mjs';

const flags = parseFlags(process.argv.slice(2), { boolean: ['authorize'], string: ['to', 'reserve', 'signer', 'balance'] });
const signer = (flags.signer || 'local').toLowerCase();
const chain = getActiveChain();
const treasury = getTreasuryAddress();

if (!flags.to) {
  console.error('usage: --to <coldAddress> [--reserve <usdc>] [--signer local|kms] [--balance <usdc>] [--authorize]');
  process.exit(2);
}

const reserveWei = flags.reserve ? parseUsdcToWei(flags.reserve) : getSweepReserveWei();

async function readBalance() {
  if (flags.balance !== undefined) return parseUsdcToWei(flags.balance);
  const { createPublicClient, http } = await import('viem');
  const client = createPublicClient({ transport: http(chain.rpcUrl) });
  return await client.getBalance({ address: treasury });
}

function broadcastLocal(amountWei, to) {
  // Lazy import so the dry-run path never needs viem.
  return (async () => {
    const { createWalletClient, http, getAddress, parseGwei } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const key = process.env.TREASURY_PAYOUT_PRIVATE_KEY;
    if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error('TREASURY_PAYOUT_PRIVATE_KEY missing/invalid for --signer local');
    const account = privateKeyToAccount(key);
    if (account.address.toLowerCase() !== treasury.toLowerCase()) throw new Error('payout key does not belong to treasury');
    const client = createWalletClient({ account, chain: { id: chain.id, name: chain.name, nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: [chain.rpcUrl] } } }, transport: http(chain.rpcUrl) });
    return await client.sendTransaction({ to: getAddress(to), value: amountWei, maxFeePerGas: parseGwei('25'), maxPriorityFeePerGas: parseGwei('2') });
  })();
}

function broadcastKms(amountWei, to) {
  return (async () => {
    const url = (process.env.KMS_SIGNER_URL || '').trim();
    const token = (process.env.KMS_SIGNER_TOKEN || '').trim();
    if (!url || !token) throw new Error('KMS_SIGNER_URL / KMS_SIGNER_TOKEN not configured for --signer kms');
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ to, amount: amountWei.toString(), chainId: chain.id }), signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`KMS signer HTTP ${res.status}`);
    const json = await res.json();
    if (!/^0x[0-9a-fA-F]{64}$/.test(json.txHash || '')) throw new Error('KMS signer returned no valid txHash');
    return json.txHash;
  })();
}

async function main() {
  const balanceWei = await readBalance();
  const plan = planSweep({ balance: balanceWei, reserve: reserveWei, coldAddress: flags.to });

  console.log('── sweep plan ─────────────────────────────');
  console.log(`chain         : ${chain.name} (${chain.id})`);
  console.log(`treasury      : ${treasury}`);
  console.log(`balance       : ${formatUsdc(balanceWei)} USDC`);
  console.log(`reserve       : ${formatUsdc(reserveWei)} USDC`);
  console.log(`cold target   : ${flags.to}`);
  console.log(`decision      : ${plan.reason}  (${plan.detail})`);

  if (!plan.ok) {
    console.log('\nNothing to broadcast (planner refused).');
    return;
  }

  if (!flags.authorize) {
    console.log(`\nwould sweep    : ${plan.amountUsdc} USDC  [DRY RUN — add --authorize to send]`);
    requireAuthorize(flags); // throws AuthorizationError
    return;
  }

  console.log(`\nAUTHORIZED: broadcasting ${plan.amountUsdc} USDC via --signer ${signer} ...`);
  const txHash = signer === 'kms' ? await broadcastKms(plan.amountWei, plan.to) : await broadcastLocal(plan.amountWei, plan.to);
  console.log(`txHash: ${txHash}`);
  console.log(`explorer: ${chain.explorer}/tx/${txHash}`);
}

main().catch((err) => {
  if (err instanceof AuthorizationError) { console.log(`\n${err.message}`); process.exit(0); }
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
