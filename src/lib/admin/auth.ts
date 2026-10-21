import { createHash, timingSafeEqual } from 'crypto';

export const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';
export const SUPERADMIN_ENS = 'piaoshu.eth';

export const ADMIN_ADDRESSES = [
  '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
  '0xF7b28DE1898644b2f76279191b6934D1A63f0271',
];

function isInAdminList(address: string): boolean {
  const lower = address.toLowerCase();
  return ADMIN_ADDRESSES.some(a => a.toLowerCase() === lower);
}

export async function verifyWalletSignature(
  address: string, message: string, signature: string
): Promise<boolean> {
  try {
    const { verifyMessage } = await import('viem');
    return await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export function generateAdminChallenge(): { message: string; nonce: string } {
  const nonce = createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex').slice(0, 16);
  return {
    message: `Sign this to access Web5.blog Admin\nNonce: ${nonce}\nAdmins: ${ADMIN_ADDRESSES.join(', ')}`,
    nonce,
  };
}

export function validateApiKey(apiKey: string | null): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !apiKey) return false;
  const left = Buffer.from(apiKey);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isSuperadmin(address: string): boolean {
  return isInAdminList(address);
}
