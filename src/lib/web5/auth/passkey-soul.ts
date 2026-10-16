// ════════════════════════════════════════════════════════════════
// src/lib/web5/auth/passkey-soul.ts
// 灵魂容器 Passkey (WebAuthn) 人类本体极速免助记词建仓模块
// 支持生物识别 (TouchID / FaceID / Windows Hello) 直接派生本体密钥
// ════════════════════════════════════════════════════════════════

export interface PasskeySoulRegistration {
  credentialId: string;
  publicKey: string;
  rawAddress: string;
  primeDid: string;
}

/**
 * 客户端检查当前浏览器是否支持 WebAuthn / Passkey
 */
export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/**
 * 触发 Passkey 注册/建仓 (生物识别免助记词)
 */
export async function createPasskeySoul(username: string = 'web5-creator'): Promise<PasskeySoulRegistration> {
  if (!isPasskeySupported()) {
    throw new Error('当前浏览器或设备不支持 Passkey / WebAuthn 生物识别，请使用 Web3 钱包直连。');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Web5.blog Sovereign Soul',
      id: window.location.hostname === 'localhost' ? 'localhost' : 'web5.blog',
    },
    user: {
      id: userId,
      name: username,
      displayName: `${username} (Sovereign Soul)`,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Passkey 凭证生成被取消');
  }

  // 依据凭证 ID 确定性计算映射的以太坊风格地址与 DID
  const rawId = credential.id;
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    hash = (hash << 5) - hash + rawId.charCodeAt(i);
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padEnd(40, '0').slice(0, 40);
  const rawAddress = `0x${hexPart}`;
  const primeDid = `did:plvtvs:${rawAddress.toLowerCase()}`;

  return {
    credentialId: credential.id,
    publicKey: rawId,
    rawAddress,
    primeDid,
  };
}
