// ════════════════════════════════════════════════════════════════
// scripts/backfill-demo-settled.ts
//
// Idempotent backfill for Proof 0 item 6 (demo state separation).
//
// Historical demo / seed orders were written with status `SETTLED`, which the
// evidence layer (evidence.ts E5) treats as a real terminal state requiring
// `payoutTxHash` + `settledAt`. Demo rows have no on-chain evidence by design,
// so they must carry the dedicated `DEMO_SETTLED` terminal status instead.
//
// This converts every demo order that is currently `SETTLED` to `DEMO_SETTLED`
// and flips its `isDemo` flag on. Re-running is a no-op once applied.
//
// Run on the live DB during deploy:
//   npx tsx scripts/backfill-demo-settled.ts
// ────────────────────────────────────────────────────────────────

import { db } from '../src/lib/db';

async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('【Backfill】demo orders SETTLED → DEMO_SETTLED');
  console.log('════════════════════════════════════════════════════\n');

  const candidates = await db.taskOrder.findMany({
    where: {
      status: 'SETTLED',
      OR: [
        { isDemo: true },
        { orderId: { startsWith: 'ap2-task-seed-' } },
        { orderId: { startsWith: 'ap2-task-meme-' } },
      ],
    },
    select: { orderId: true, status: true, isDemo: true },
  });

  if (candidates.length === 0) {
    console.log('✔ No SETTLED demo orders found — nothing to migrate.');
    return;
  }

  console.log(`Found ${candidates.length} SETTLED demo order(s):`);
  for (const c of candidates) {
    console.log(`   - ${c.orderId} (isDemo=${c.isDemo})`);
  }

  const result = await db.taskOrder.updateMany({
    where: {
      status: 'SETTLED',
      OR: [
        { isDemo: true },
        { orderId: { startsWith: 'ap2-task-seed-' } },
        { orderId: { startsWith: 'ap2-task-meme-' } },
      ],
    },
    data: {
      status: 'DEMO_SETTLED',
      isDemo: true,
    },
  });

  console.log(`\n🎉 Migrated ${result.count} order(s) to DEMO_SETTLED.`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Backfill failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
