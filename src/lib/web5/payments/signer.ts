// ════════════════════════════════════════════════════════════════
// src/lib/web5/payments/signer.ts
// Treasury payout signer abstraction (P0 hot-wallet isolation, 4.3).
//
// Two implementations, both behind `PayoutSigner`:
//
//   LocalKeySigner   — today's behaviour, byte for byte: a viem account
//                      derived from TREASURY_PAYOUT_PRIVATE_KEY, sending a
//                      native USDC transfer with the same fee settings.
//                      This remains the default so production is unchanged
//                      when no KMS variable is set.
//
//   RemoteKmsSigner  — a thin, explicitly-configured HTTP client for an
//                      external signer (AWS/GCP KMS, HSM, or a signing
//                      sidecar). It holds no key material, implements no
//                      cryptography, and NEVER falls back to the local key.
//                      If KMS_SIGNER_URL / KMS_SIGNER_TOKEN are missing it
//                      fails closed with a typed PayoutSignerError.
//
// Nothing in this file broadcasts on import: `resolveSigner()` only picks an
// implementation; a transaction is sent solely when a caller invokes
// `sendNativeUsdc()` and the money flags / caps have already allowed it.
// ════════════════════════════════════════════════════════════════

import { createWalletClient, getAddress, http, isAddress, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getActiveChain, getTreasuryAddress } from '@/lib/web5/contracts/addresses';
import { arcChain, arcRpcUrl } from './arc-chain';

export type Address = `0x${string}`;
export type TxHash = `0x${string}`;

export type PayoutSignerKind = 'local-key' | 'remote-kms';

export type PayoutSignerErrorCode =
  | 'LOCAL_KEY_MISSING'
  | 'LOCAL_KEY_INVALID'
  | 'LOCAL_KEY_TREASURY_MISMATCH'
  | 'KMS_NOT_CONFIGURED'
  | 'KMS_URL_INVALID'
  | 'KMS_ADDRESS_INVALID'
  | 'KMS_ADDRESS_UNAVAILABLE'
  | 'KMS_ADDRESS_MISMATCH'
  | 'KMS_REQUEST_FAILED'
  | 'KMS_BAD_RESPONSE'
  | 'INVALID_RECIPIENT'
  | 'INVALID_AMOUNT';

/** Typed failure raised by every signer path. Callers must not retry-loop on it. */
export class PayoutSignerError extends Error {
  readonly code: PayoutSignerErrorCode;

  constructor(code: PayoutSignerErrorCode, message: string) {
    super(message);
    this.name = 'PayoutSignerError';
    this.code = code;
  }
}

export interface PayoutSigner {
  kind: PayoutSignerKind;
  /** Signer/treasury address. Throws when it is not derivable or not configured. */
  address(): Promise<Address>;
  /** Sends a native USDC transfer (18 decimals) and resolves to the tx hash. */
  sendNativeUsdc(to: Address, amount: bigint): Promise<TxHash>;
}

/** Env var names, exported so health endpoints and docs cannot drift. */
export const SIGNER_ENV = {
  localKey: 'TREASURY_PAYOUT_PRIVATE_KEY',
  kmsUrl: 'KMS_SIGNER_URL',
  kmsToken: 'KMS_SIGNER_TOKEN',
  kmsAddress: 'KMS_SIGNER_ADDRESS',
} as const;

/** Longest a single remote signing request may take before we give up. */
export const KMS_REQUEST_TIMEOUT_MS = 30_000;

function envValue(name: string): string {
  return (process.env[name] || '').trim();
}

// ── Local key ────────────────────────────────────────────────────

export type LocalPayoutAccount =
  | { ok: true; account: ReturnType<typeof privateKeyToAccount> }
  | { ok: false; reason: string; code: PayoutSignerErrorCode };

/**
 * Same validation, same messages as the historical `getPayoutAccount()`:
 * the key must exist, be a 32-byte hex key, and belong to the treasury.
 */
export function loadLocalPayoutAccount(): LocalPayoutAccount {
  const key = process.env[SIGNER_ENV.localKey];
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    return {
      ok: false,
      reason: 'TREASURY_PAYOUT_PRIVATE_KEY is not configured',
      code: 'LOCAL_KEY_MISSING',
    };
  }
  try {
    const account = privateKeyToAccount(key as `0x${string}`);
    if (account.address.toLowerCase() !== getTreasuryAddress().toLowerCase()) {
      return {
        ok: false,
        reason: 'Payout key does not belong to the treasury address',
        code: 'LOCAL_KEY_TREASURY_MISMATCH',
      };
    }
    return { ok: true, account };
  } catch {
    return { ok: false, reason: 'Invalid payout private key', code: 'LOCAL_KEY_INVALID' };
  }
}

/**
 * Today's production path. Reads TREASURY_PAYOUT_PRIVATE_KEY at call time
 * (not import time) so a rotated key is picked up without a rebuild.
 */
export class LocalKeySigner implements PayoutSigner {
  readonly kind = 'local-key' as const;

  private requireAccount() {
    const loaded = loadLocalPayoutAccount();
    if (!loaded.ok) throw new PayoutSignerError(loaded.code, loaded.reason);
    return loaded.account;
  }

  async address(): Promise<Address> {
    return this.requireAccount().address;
  }

  async sendNativeUsdc(to: Address, amount: bigint): Promise<TxHash> {
    if (!isAddress(to)) {
      throw new PayoutSignerError('INVALID_RECIPIENT', 'Invalid recipient address');
    }
    if (typeof amount !== 'bigint' || amount <= 0n) {
      throw new PayoutSignerError('INVALID_AMOUNT', 'Amount must be a positive integer amount of wei');
    }

    const account = this.requireAccount();
    const walletClient = createWalletClient({
      account,
      chain: arcChain,
      transport: http(arcRpcUrl),
    });

    return walletClient.sendTransaction({
      to: getAddress(to),
      value: amount,
      maxFeePerGas: parseGwei('25'),
      maxPriorityFeePerGas: parseGwei('2'),
    });
  }
}

// ── Remote KMS ───────────────────────────────────────────────────

/**
 * Wire contract for the external signer (v1). The signer holds the key; this
 * process only ever sends intent.
 *
 *   POST {KMS_SIGNER_URL}
 *   Authorization: Bearer {KMS_SIGNER_TOKEN}
 *   Content-Type: application/json
 *   body: { "to": "0x…40hex", "amount": "<wei as decimal string>", "chainId": 5042 }
 *
 *   → 200 { "txHash": "0x…64hex" }
 *
 * `amount` is the native USDC value in wei (18 decimals on Arc), serialized as
 * a decimal string to avoid float/JSON precision loss. The signer is expected
 * to broadcast the transfer on `chainId` and return the hash only after it has
 * accepted it; this process then waits for the receipt itself.
 * Any non-2xx, timeout, invalid JSON or malformed txHash is a hard failure —
 * the payout is refused, never re-signed locally.
 */
export type RemoteKmsSignerConfig = {
  url?: string;
  token?: string;
  /** Optional known signer address; enables the treasury seatbelt check. */
  signerAddress?: string;
};

export class RemoteKmsSigner implements PayoutSigner {
  readonly kind = 'remote-kms' as const;

  private readonly url: string;
  private readonly token: string;
  private readonly signerAddress: string;

  constructor(config: RemoteKmsSignerConfig = {}) {
    this.url = (config.url ?? envValue(SIGNER_ENV.kmsUrl)).trim();
    this.token = (config.token ?? envValue(SIGNER_ENV.kmsToken)).trim();
    this.signerAddress = (config.signerAddress ?? envValue(SIGNER_ENV.kmsAddress)).trim();
  }

  /** Lists the env vars that are still missing (no secrets, names only). */
  missingConfig(): string[] {
    const missing: string[] = [];
    if (!this.url) missing.push(SIGNER_ENV.kmsUrl);
    if (!this.token) missing.push(SIGNER_ENV.kmsToken);
    return missing;
  }

  private requireConfig(): { url: string } {
    const missing = this.missingConfig();
    if (missing.length > 0) {
      throw new PayoutSignerError(
        'KMS_NOT_CONFIGURED',
        `Remote KMS signer is not configured: missing ${missing.join(', ')}. ` +
          'Refusing to fall back to TREASURY_PAYOUT_PRIVATE_KEY.'
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(this.url);
    } catch {
      throw new PayoutSignerError('KMS_URL_INVALID', 'KMS_SIGNER_URL is not a valid URL');
    }
    const loopback = ['127.0.0.1', 'localhost', '::1'];
    if (parsed.protocol !== 'https:' && !loopback.includes(parsed.hostname)) {
      throw new PayoutSignerError(
        'KMS_URL_INVALID',
        'KMS_SIGNER_URL must use https (plain http is only allowed for loopback sidecars)'
      );
    }
    if (this.signerAddress && !isAddress(this.signerAddress)) {
      throw new PayoutSignerError('KMS_ADDRESS_INVALID', 'KMS_SIGNER_ADDRESS is not a valid address');
    }
    return { url: this.url };
  }

  /** Config-only validation (no network). Throws PayoutSignerError when unusable. */
  assertReady(): void {
    this.requireConfig();
  }

  async address(): Promise<Address> {
    this.requireConfig();
    if (!this.signerAddress) {
      throw new PayoutSignerError(
        'KMS_ADDRESS_UNAVAILABLE',
        'KMS_SIGNER_ADDRESS is not set, so the remote signer address cannot be verified locally'
      );
    }
    return getAddress(this.signerAddress);
  }

  async sendNativeUsdc(to: Address, amount: bigint): Promise<TxHash> {
    const { url } = this.requireConfig();

    if (!isAddress(to)) {
      throw new PayoutSignerError('INVALID_RECIPIENT', 'Invalid recipient address');
    }
    if (typeof amount !== 'bigint' || amount <= 0n) {
      throw new PayoutSignerError('INVALID_AMOUNT', 'Amount must be a positive integer amount of wei');
    }
    // Seatbelt: only applies when the operator published the signer address.
    if (this.signerAddress && getAddress(this.signerAddress) !== getAddress(getTreasuryAddress())) {
      throw new PayoutSignerError(
        'KMS_ADDRESS_MISMATCH',
        'KMS_SIGNER_ADDRESS does not match the configured treasury address'
      );
    }

    const payload = {
      to: getAddress(to),
      amount: amount.toString(),
      chainId: getActiveChain().id,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(KMS_REQUEST_TIMEOUT_MS),
      });
    } catch (err: any) {
      throw new PayoutSignerError(
        'KMS_REQUEST_FAILED',
        `Remote KMS signer request failed: ${err?.message || 'network error'}`
      );
    }

    if (!response.ok) {
      throw new PayoutSignerError(
        'KMS_REQUEST_FAILED',
        `Remote KMS signer returned HTTP ${response.status}`
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PayoutSignerError('KMS_BAD_RESPONSE', 'Remote KMS signer returned a non-JSON body');
    }

    const txHash = (body as { txHash?: unknown } | null)?.txHash;
    if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new PayoutSignerError(
        'KMS_BAD_RESPONSE',
        'Remote KMS signer response is missing a valid txHash'
      );
    }
    return txHash as TxHash;
  }
}

// ── Selection ────────────────────────────────────────────────────

/**
 * True when the deployment expresses intent to use a remote signer, i.e. at
 * least one *required* KMS variable is present. A half-config is treated as
 * remote so a typo fails closed instead of silently signing with the VPS key.
 * (KMS_SIGNER_ADDRESS alone is optional metadata and does not switch modes.)
 */
export function remoteSignerRequested(): boolean {
  return Boolean(envValue(SIGNER_ENV.kmsUrl) || envValue(SIGNER_ENV.kmsToken));
}

/** Remote when configured, otherwise the unchanged local-key path. */
export function resolveSigner(): PayoutSigner {
  return remoteSignerRequested() ? new RemoteKmsSigner() : new LocalKeySigner();
}

/**
 * resolveSigner() + config validation (no network, no signing). Throws a typed
 * PayoutSignerError when the selected signer cannot possibly work, so a caller
 * refuses *before* reading balances or touching the chain.
 */
export function assertPayoutSignerReady(): PayoutSigner {
  const signer = resolveSigner();
  if (signer instanceof RemoteKmsSigner) {
    signer.assertReady();
    return signer;
  }
  const loaded = loadLocalPayoutAccount();
  if (!loaded.ok) throw new PayoutSignerError(loaded.code, loaded.reason);
  return signer;
}

export type SignerDescription = {
  active: PayoutSignerKind;
  source: 'KMS_SIGNER_URL' | 'TREASURY_PAYOUT_PRIVATE_KEY' | 'none';
  /** True when a payout can be attempted with the active signer's config. */
  ready: boolean;
  remote: {
    requested: boolean;
    urlConfigured: boolean;
    tokenConfigured: boolean;
    addressConfigured: boolean;
    missingEnv: string[];
  };
  local: {
    keyConfigured: boolean;
    keyMatchesTreasury: boolean;
  };
  chainId: number;
  treasuryAddress: Address;
};

/**
 * Non-throwing, secret-free snapshot for `/api/daemon/health`-style reporting.
 * Never returns the private key, the token, or the URL's query string.
 */
export function describeSigner(): SignerDescription {
  const keyRaw = process.env[SIGNER_ENV.localKey];
  const keyConfigured = Boolean(keyRaw && /^0x[0-9a-fA-F]{64}$/.test(keyRaw));
  const remote = new RemoteKmsSigner();
  const missing = remote.missingConfig();
  const requested = remoteSignerRequested();

  let keyMatchesTreasury = false;
  if (keyConfigured) {
    try {
      keyMatchesTreasury =
        privateKeyToAccount(keyRaw as `0x${string}`).address.toLowerCase() ===
        getTreasuryAddress().toLowerCase();
    } catch {
      keyMatchesTreasury = false;
    }
  }

  return {
    active: requested ? 'remote-kms' : 'local-key',
    source: requested
      ? 'KMS_SIGNER_URL'
      : keyConfigured
        ? 'TREASURY_PAYOUT_PRIVATE_KEY'
        : 'none',
    ready: requested ? missing.length === 0 : keyConfigured && keyMatchesTreasury,
    remote: {
      requested,
      urlConfigured: Boolean(envValue(SIGNER_ENV.kmsUrl)),
      tokenConfigured: Boolean(envValue(SIGNER_ENV.kmsToken)),
      addressConfigured: Boolean(envValue(SIGNER_ENV.kmsAddress)),
      missingEnv: missing,
    },
    local: { keyConfigured, keyMatchesTreasury },
    chainId: getActiveChain().id,
    treasuryAddress: getTreasuryAddress(),
  };
}
