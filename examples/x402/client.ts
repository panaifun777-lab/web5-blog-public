// Minimal x402 prepaid client for Web5.blog (Node 20+)
// deps: viem
// Usage: WEB5_KEY=0x... node --experimental-strip-types examples/x402/client.ts

import { createWalletClient, http, defineChain, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const BASE_URL = process.env.WEB5_BASE_URL || 'https://web5.blog';
const KEY = process.env.WEB5_KEY as `0x${string}` | undefined;
if (!KEY || !/^0x[0-9a-fA-F]{64}$/.test(KEY)) {
  throw new Error('Set WEB5_KEY to a 0x-prefixed private key');
}

const arc = defineChain({
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.arc.io'] } },
});

const account = privateKeyToAccount(KEY);
const wallet = createWalletClient({ account, chain: arc, transport: http() });

async function register(): Promise<void> {
  const nonce = BigInt(Date.now());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const message = [
    'Web5.blog x402 Prepaid Wallet Registration',
    '',
    `Address: ${account.address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Deadline: ${deadline}`,
    '',
    'This signature registers a prepaid wallet. It does not move funds or authorize a payment.',
  ].join('\n');
  const signature = await wallet.signMessage({ account, message });
  const res = await fetch(`${BASE_URL}/api/x402/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: account.address,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
    }),
  });
  console.log('register', res.status, await res.json());
}

async function deposit(txHash: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/x402/deposits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, address: account.address }),
  });
  console.log('deposit', res.status, await res.json());
}

async function balance(): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/x402/balance?address=${account.address}`
  );
  console.log('balance', res.status, await res.json());
}

async function resolveAuthorDid(arweaveHash: string): Promise<string> {
  if (process.env.WEB5_AUTHOR_DID) return process.env.WEB5_AUTHOR_DID;
  const res = await fetch(
    `${BASE_URL}/api/content/detail?hash=${encodeURIComponent(arweaveHash)}`
  );
  const data = await res.json();
  const did = data?.content?.authorDid;
  if (!did) throw new Error('Could not resolve authorDid for content');
  return did;
}

async function paidFetch(arweaveHash: string, deep = false): Promise<void> {
  const price = deep ? '0.05' : '0.03';
  const voucher = {
    contentId: arweaveHash,
    authorDid: await resolveAuthorDid(arweaveHash),
    amountUsdc: price,
    nonce: Date.now(),
    timestamp: Date.now(),
    signerAddress: account.address,
  };
  const signature = await wallet.signTypedData({
    account,
    domain: {
      name: 'Web5.blog AP2 Voucher Gateway',
      version: '1.0',
      chainId: 5042,
      verifyingContract: (process.env.WEB5_BUDGET_FENCE ||
        '0xe0d246c09d7a3097bab3148f89201157dd531eea') as `0x${string}`,
    },
    types: {
      Web5SessionVoucher: [
        { name: 'contentId', type: 'string' },
        { name: 'authorDid', type: 'string' },
        { name: 'amountUsdc', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Web5SessionVoucher',
    message: {
      contentId: voucher.contentId,
      authorDid: voucher.authorDid,
      amountUsdc: voucher.amountUsdc,
      nonce: BigInt(voucher.nonce),
      timestamp: BigInt(voucher.timestamp),
    },
  });

  const header = Buffer.from(
    JSON.stringify({ ...voucher, signature }),
    'utf8'
  ).toString('base64url');

  const res = await fetch(
    `${BASE_URL}/api/content/detail?hash=${encodeURIComponent(arweaveHash)}&agent=true${deep ? '&deep=true' : ''}`,
    {
      headers: {
        Accept: 'application/vnd.x402+json',
        'X-402-Payment-Authorization': `Web5-Voucher ${header}`,
      },
    }
  );
  console.log('paidFetch', res.status);
  console.log((await res.text()).slice(0, 2000));
}

const command = process.argv[2];
if (command === 'register') await register();
else if (command === 'balance') await balance();
else if (command === 'deposit' && process.argv[3]) await deposit(process.argv[3]);
else if (command === 'fetch' && process.argv[3]) {
  await paidFetch(process.argv[3], process.argv.includes('--deep'));
} else {
  console.log('Usage: client.ts register|balance|deposit <txHash>|fetch <arweaveHash> [--deep]');
}
