// Minimal in-memory stand-in for the tables the Telegram broadcast queue
// touches: SystemConfig (its only persistence) plus TaskOrder (read by the
// claim path). It reuses tests/helpers/fake-db.ts for the order tables so the
// broadcast tests can also drive src/lib/web5/ap2/commerce.ts end to end.
//
// Nothing here hits Prisma, the network, or the filesystem.

import { fakeDb } from './fake-db';

type Row = Record<string, any>;

function clone<T>(value: T): T {
  return value === null || value === undefined ? value : structuredClone(value);
}

function uniqueError(): Error {
  const err: any = new Error('Unique constraint failed on SystemConfig.key');
  err.code = 'P2002';
  return err;
}

class BroadcastFakeDb {
  /** SystemConfig rows: { key, value, updatedBy } */
  config: Row[] = [];
  /** Every serialized write, so tests can assert the read-modify-write order. */
  writeLog: string[] = [];
  /** Optional artificial await inside a write, used to force interleaving. */
  writeDelayMs = 0;

  reset() {
    this.config = [];
    this.writeLog = [];
    this.writeDelayMs = 0;
    fakeDb.reset();
  }

  seedOrder(data: Row): Row {
    return fakeDb.seedOrder(data);
  }

  /** Raw queue document currently stored under the broadcast key. */
  rawQueueValue(): string | null {
    return this.config.find((row) => row.key === 'broadcast:telegram:queue')?.value ?? null;
  }

  parsedQueue(): { records: Row[] } {
    const raw = this.rawQueueValue();
    if (!raw) return { records: [] };
    try {
      const parsed = JSON.parse(raw);
      return { records: Array.isArray(parsed?.records) ? parsed.records : [] };
    } catch {
      return { records: [] };
    }
  }

  /**
   * Deliberately corrupt the stored document; parseQueueDoc() must degrade to
   * an empty queue instead of throwing.
   */
  corruptQueue() {
    const key = 'broadcast:telegram:queue';
    const row = this.config.find((entry) => entry.key === key);
    if (row) row.value = '{not json at all';
    else this.config.push({ id: 'cfg-corrupt', key, value: '{not json at all' });
  }

  db = {
    // /api/daemon/health probes the DB with a tagged template; a broadcast
    // fake answers it so the health route reports OK instead of DEGRADED.
    $queryRaw: async () => [{ ok: 1 }],

    systemConfig: {
      findUnique: async ({ where }: { where: Row }) =>
        clone(this.config.find((row) => row.key === where.key) ?? null),

      findMany: async ({ where }: { where: Row } = { where: {} }) =>
        this.config
          .filter((row) => {
            const startsWith = (where?.key as any)?.startsWith;
            if (typeof startsWith === 'string') return String(row.key).startsWith(startsWith);
            return where?.key === undefined ? true : row.key === where.key;
          })
          .map((row) => clone(row)),

      create: async ({ data }: { data: Row }) => {
        if (this.config.some((row) => row.key === data.key)) throw uniqueError();
        this.writeLog.push(String(data.value));
        const row = { id: `cfg-${this.config.length + 1}`, updatedAt: new Date(), ...data };
        this.config.push(row);
        return clone(row);
      },

      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = this.config.find((entry) => entry.key === where.key);
        if (!row) throw uniqueError();
        // Interleaving hook: proves withQueueLock() serializes writers.
        if (this.writeDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.writeDelayMs));
        }
        this.writeLog.push(String(data.value));
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },

    taskOrder: {
      findUnique: fakeDb.db.taskOrder.findUnique,
      findFirst: fakeDb.db.taskOrder.findFirst,
      findMany: fakeDb.db.taskOrder.findMany,
      count: fakeDb.db.taskOrder.count,
      create: fakeDb.db.taskOrder.create,
      update: fakeDb.db.taskOrder.update,
      updateMany: fakeDb.db.taskOrder.updateMany,
    },
    payoutLedger: fakeDb.db.payoutLedger,
    vessel: fakeDb.db.vessel,
    prime: fakeDb.db.prime,
    vesselSession: fakeDb.db.vesselSession,
  };
}

export const broadcastDb = new BroadcastFakeDb();

export const BROADCAST_TEST_SECRET = 'test-broadcast-secret-0123456789';

/** Env with the queue armed. Callers own cleanup (see each test file). */
export function armBroadcastEnv(env: NodeJS.ProcessEnv = process.env): void {
  env.TG_BROADCAST_SECRET = BROADCAST_TEST_SECRET;
}

export function clearBroadcastEnv(env: NodeJS.ProcessEnv = process.env): void {
  delete env.TG_BROADCAST_SECRET;
  delete env.BROADCAST_QUEUE_MAX_RECORDS;
  delete env.BROADCAST_MAX_ATTEMPTS;
  delete env.BROADCAST_CLAIM_TTL_MS;
  delete env.NEXT_PUBLIC_SITE_URL;
  delete env.NEXT_PUBLIC_ACTIVE_CHAIN;
}
