// ════════════════════════════════════════════════════════════════
// kms-vault-signer.mjs — HashiCorp Vault signer sidecar (scaffold)
//
// Implements the v1 wire contract that the app's RemoteKmsSigner
// (src/lib/web5/payments/signer.ts) calls:
//
//   POST {KMS_SIGNER_URL}   Authorization: Bearer {KMS_SIGNER_TOKEN}
//   body: { to, amount, chainId }   → 200 { txHash }
//
// The sidecar holds NO key material. It asks Vault Transit to sign the
// prehashed EIP-1559 payload, recovers the parity byte, broadcasts the
// raw tx, and returns the hash only after the receipt succeeds.
//
// ── REQUIRED CONFIG (you fill these in) ──
//   VAULT_ADDR           e.g. https://vault.internal:8200
//   VAULT_TOKEN          Vault token allowed ONLY to transit/sign
//   VAULT_TRANSIT_KEY    transit key name, must be secp256k1
//   KMS_TOKEN            bearer token the app must present (rotatable)
//   KMS_SIGNER_ADDRESS   the treasury address the Vault key controls
//   KMS_BIND / KMS_PORT  listener, default 127.0.0.1:8443 (loopback only)
//   ARC_MAINNET_RPC      override RPC if needed
//
// ── VAULT KEY-TYPE CAVEAT (must be verified before production) ──
//   OSS Vault Transit signs ecdsa-p256 / p384, NOT secp256k1. Ethereum
//   addresses require secp256k1. Use Vault Enterprise transit or a
//   secp256k1-capable transit plugin, then set SIGNATURE_ALGORITHM
//   (default 'ecdsa-secp256k1'). This scaffold cannot be proven against a
//   real Vault without credentials — the signing/recovery path is UNVERIFIED.
//
// Fail-closed invariants: empty KMS_TOKEN => refuse every request; chainId
// mismatch => 400; amount > KMS_MAX_PAYOUT_USDC => 402; to not in
// KMS_ALLOWED_TO (when set) => 403; Vault/RPC failure => 502, never local.
// ════════════════════════════════════════════════════════════════

import http from 'node:http';
import { getActiveChain, getTreasuryAddress, formatUsdc, parseUsdcToWei, USDC_UNIT } from './ops-common.mjs';

const env = (k, d = '') => (process.env[k] || '').trim() || d;

const CONFIG = {
  vaultAddr: env('VAULT_ADDR', 'http://127.0.0.1:8200'),
  vaultToken: env('VAULT_TOKEN'),
  transitKey: env('VAULT_TRANSIT_KEY', 'arc-treasury'),
  signatureAlgorithm: env('SIGNATURE_ALGORITHM', 'ecdsa-secp256k1'),
  kmsToken: env('KMS_TOKEN'),
  signerAddress: env('KMS_SIGNER_ADDRESS'),
  bind: env('KMS_BIND', '127.0.0.1'),
  port: Number(env('KMS_PORT', '8443')),
  maxPayoutUsdc: env('KMS_MAX_PAYOUT_USDC', '24.99'),
  allowedTo: env('KMS_ALLOWED_TO')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  requestTimeoutMs: Number(env('KMS_SIGNER_TIMEOUT_MS', '30000')),
};

const chain = getActiveChain();
const treasury = getTreasuryAddress();

// ── Vault Transit backend (the pluggable half of "Vault-style") ──
// Replace/extend this object to target AWS KMS or GCP KMS; the rest of
// the sidecar only needs a backend.signPrehash(digestHex) -> {r,s}.

const vaultTransitBackend = {
  name: 'vault-transit',
  async signPrehash(digestHex) {
    if (!CONFIG.vaultToken) throw new Error('VAULT_TOKEN is not configured');
    const url = `${CONFIG.vaultAddr}/v1/transit/sign/${CONFIG.transitKey}?prehashed=true&hash=sha2-256`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Vault-Token': CONFIG.vaultToken, 'content-type': 'application/json' },
      body: JSON.stringify({
        input: Buffer.from(digestHex.slice(2), 'hex').toString('base64'),
        signature_algorithm: CONFIG.signatureAlgorithm,
        prehashed: true,
      }),
      signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
    });
    if (!res.ok) throw new Error(`Vault Transit HTTP ${res.status}`);
    const json = await res.json();
    const sig = json?.data?.signature; // "vault:v1:<base64 r||s>"
    const b64 = String(sig).replace(/^vault:v\d+:/, '');
    const raw = Buffer.from(b64, 'base64');
    // DER vs fixed-width: secp256k1 transit returns 64-byte r||s in P1363.
    if (raw.length !== 64) throw new Error(`unexpected Vault signature length ${raw.length}`);
    return { r: raw.subarray(0, 32), s: raw.subarray(32, 64) };
  },
};

const activeBackend = vaultTransitBackend;

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) throw new Error('empty body');
  return JSON.parse(text);
}

function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleSign(req, res) {
  if (!CONFIG.kmsToken) return send(res, 503, { error: 'KMS_TOKEN not configured; signer is closed' });
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${CONFIG.kmsToken}`) return send(res, 401, { error: 'unauthorized' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'invalid JSON body' });
  }

  const { to, amount, chainId } = body;
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(to))) return send(res, 400, { error: 'invalid recipient' });
  if (!/^\d+$/.test(String(amount)) || BigInt(amount) <= 0n) return send(res, 400, { error: 'amount must be a positive wei decimal string' });
  if (Number(chainId) !== chain.id) return send(res, 400, { error: `chainId must be ${chain.id}` });

  const amountWei = BigInt(amount);
  const maxWei = parseUsdcToWei(CONFIG.maxPayoutUsdc);
  if (amountWei > maxWei) return send(res, 402, { error: `amount ${formatUsdc(amountWei)} USDC exceeds sidecar cap ${CONFIG.maxPayoutUsdc}` });
  if (CONFIG.allowedTo.length && !CONFIG.allowedTo.includes(to.toLowerCase())) return send(res, 403, { error: 'recipient not in allowlist' });

  const { serializeTransaction, keccak256, recoverAddress, createPublicClient, http: viemHttp, parseGwei } = await import('viem');

  const publicClient = createPublicClient({ transport: viemHttp(chain.rpcUrl) });
  const nonce = await publicClient.getTransactionCount({ address: treasury });
  const tx = {
    type: '0x2',
    chainId: chain.id,
    nonce,
    maxFeePerGas: parseGwei('25'),
    maxPriorityFeePerGas: parseGwei('2'),
    gas: 21000n,
    to,
    value: amountWei,
    data: '0x0',
  };
  const unsigned = serializeTransaction(tx);
  const digest = keccak256(unsigned);

  let sig;
  try {
    sig = await activeBackend.signPrehash(digest);
  } catch (err) {
    return send(res, 502, { error: `signer backend failed: ${err.message}` });
  }
  const r = `0x${sig.r.toString('hex')}`;
  const s = `0x${sig.s.toString('hex')}`;

  // Recover parity: Vault omits yParity; try 0/1 and keep the one that
  // yields the treasury address. Mismatch => refuse (never sign blind).
  let yParity = null;
  for (const p of [0, 1]) {
    try {
      const addr = recoverAddress({ hash: digest, signature: { r, s, yParity: p } });
      if (addr.toLowerCase() === treasury.toLowerCase()) { yParity = p; break; }
    } catch { /* try next */ }
  }
  if (yParity === null) return send(res, 502, { error: 'signature does not recover to the treasury address' });

  let txHash;
  try {
    const raw = serializeTransaction(tx, { r, s, yParity });
    txHash = await publicClient.sendRawTransaction({ serializedTransaction: raw });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 120000 });
    if (receipt.status !== 'success') return send(res, 502, { error: 'transaction reverted' });
  } catch (err) {
    return send(res, 502, { error: `broadcast failed: ${err.message}` });
  }

  // Structured audit line (no secrets).
  console.log(JSON.stringify({ ts: Date.now(), to, amount, chainId: chain.id, backend: activeBackend.name, txHash }));
  send(res, 200, { txHash });
}

function contractCheck() {
  const problems = [];
  if (!CONFIG.vaultToken) problems.push('VAULT_TOKEN missing');
  if (!CONFIG.kmsToken) problems.push('KMS_TOKEN missing (signer stays closed until set)');
  if (!CONFIG.signerAddress) problems.push('KMS_SIGNER_ADDRESS missing (cannot verify the treasury seatbelt on the Vault key)');
  if (chain.id !== 5042) console.log(`NOTE: active chain is ${chain.name} (${chain.id}) — confirm this is intended for signing.`);
  console.log('RemoteKmsSigner v1 contract this sidecar serves:');
  console.log(`  POST http://${CONFIG.bind}:${CONFIG.port}/sign`);
  console.log('  Authorization: Bearer <KMS_TOKEN>');
  console.log('  body: { "to": "0x..40hex", "amount": "<wei decimal string>", "chainId": ' + chain.id + ' }');
  console.log('  -> 200 { "txHash": "0x..64hex" }');
  console.log(`  treasury (seatbelt): ${treasury}`);
  console.log(`  sidecar cap: ${CONFIG.maxPayoutUsdc} USDC   backend: ${activeBackend.name} (${CONFIG.signatureAlgorithm})`);
  if (problems.length) {
    console.log('\nCONFIG GAPS (fix before running as the production signer):');
    for (const p of problems) console.log('  - ' + p);
    process.exitCode = 1;
    return;
  }
  console.log('\nconfig OK. NOTE: the Vault sign + parity-recovery + broadcast path is UNVERIFIED without a real Vault; rehearse on a test key first.');
}

const isCheck = process.argv.includes('--contract-check');
if (isCheck) {
  contractCheck();
} else {
  if (!CONFIG.kmsToken) console.warn('[kms-vault-signer] WARNING: KMS_TOKEN is empty — every request will be refused (fail-closed).');
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && (req.url === '/sign' || req.url === '/')) {
      handleSign(req, res).catch((err) => send(res, 500, { error: err.message }));
    } else if (req.method === 'GET' && req.url === '/healthz') {
      send(res, 200, { ok: true, backend: activeBackend.name, chainId: chain.id, signerConfigured: Boolean(CONFIG.kmsToken) });
    } else {
      send(res, 404, { error: 'not found' });
    }
  });
  server.listen(CONFIG.port, CONFIG.bind, () => {
    console.log(`[kms-vault-signer] listening on http://${CONFIG.bind}:${CONFIG.port} (backend=${activeBackend.name}, chain=${chain.id})`);
  });
}
