// ════════════════════════════════════════════════════════════════
// src/app/api/auth/withdraw/route.ts
// EIP-712 authorized withdrawal with a real on-chain payout.
// Disabled unless WITHDRAWALS_ENABLED=true and the treasury signer is configured.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  processWithdrawSettlement,
  type WithdrawSettlementMessage,
} from '@/lib/web5/auth/eip712-types';
import { WITHDRAWALS_ENABLED, featureDisabled, moneyFlowBlocked } from '@/lib/launch/flags';
import { getPayoutAccount } from '@/lib/web5/payments/arc';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`withdraw:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  if (!WITHDRAWALS_ENABLED) return moneyFlowBlocked('WITHDRAWALS_DISABLED');

  const payout = getPayoutAccount();
  if (!payout.ok) {
    return featureDisabled('PAYOUT_SIGNER_MISSING', payout.reason);
  }

  try {
    const body = await req.json();

    let message: WithdrawSettlementMessage;

    if (body.message && body.signature) {
      message = body.message;
    } else {
      const {
        masterWalletAddress,
        backupWalletAddress,
        asset = 'USDC',
        amountAtomic,
        nonce,
        deadline,
      } = body;

      if (
        !masterWalletAddress ||
        !backupWalletAddress ||
        amountAtomic === undefined ||
        nonce === undefined ||
        deadline === undefined
      ) {
        return NextResponse.json(
          {
            error:
              'Missing withdrawal fields: masterWalletAddress, backupWalletAddress, amountAtomic, nonce, deadline, signature',
          },
          { status: 400 }
        );
      }

      message = {
        masterWalletAddress,
        backupWalletAddress,
        asset,
        amountAtomic,
        nonce,
        deadline,
      };
    }

    if (!body.signature || !/^0x[0-9a-fA-F]{130}$/.test(body.signature)) {
      return NextResponse.json({ error: 'Valid signature required' }, { status: 400 });
    }

    const result = await processWithdrawSettlement({
      message,
      signature: body.signature,
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[withdraw] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Withdrawal failed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
