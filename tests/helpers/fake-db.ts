// Minimal in-memory stand-in for the Prisma client used by the settlement
// tests. It models only the calls commerce/arc/token-issuer actually make.

type Row = Record<string, any>;

const DATE_OPERATORS = ['lt', 'lte', 'gt', 'gte'] as const;

function isDateCond(cond: unknown): cond is { lt?: Date; lte?: Date; gte?: Date; gt?: Date } {
  if (!cond || typeof cond !== 'object' || cond instanceof Date) return false;
  return DATE_OPERATORS.some((op) => op in (cond as Record<string, unknown>));
}

function clone<T>(value: T): T {
  return value === null || value === undefined ? value : structuredClone(value);
}

function dateMatch(value: any, cond: any): boolean {
  const actual = value instanceof Date ? value.getTime() : value ? new Date(value).getTime() : NaN;
  if (cond.lt !== undefined && !(actual < cond.lt.getTime())) return false;
  if (cond.lte !== undefined && !(actual <= cond.lte.getTime())) return false;
  if (cond.gt !== undefined && !(actual > cond.gt.getTime())) return false;
  if (cond.gte !== undefined && !(actual >= cond.gte.getTime())) return false;
  return true;
}

function matchWhere(row: Row, where: Row = {}): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'NOT') {
      const list = Array.isArray(cond) ? cond : [cond];
      if (list.some((entry) => matchWhere(row, entry))) return false;
      continue;
    }
    const value = row[key];
    if (cond === null) {
      if (value !== null && value !== undefined) return false;
      continue;
    }
    if (cond instanceof Date) {
      if (!(value instanceof Date) || value.getTime() !== cond.getTime()) return false;
      continue;
    }
    if (isDateCond(cond)) {
      if (!dateMatch(value, cond)) return false;
      continue;
    }
    if (typeof cond === 'object') {
      if ('in' in cond) {
        if (!(cond.in as unknown[]).includes(value)) return false;
        continue;
      }
      if ('startsWith' in cond) {
        if (!String(value ?? '').startsWith(String(cond.startsWith))) return false;
        continue;
      }
      return false;
    }
    if (value !== cond) return false;
  }
  return true;
}

function uniqueError(): Error {
  const err: any = new Error('Unique constraint failed');
  err.code = 'P2002';
  return err;
}

class FakeDb {
  orders: Row[] = [];
  ledger: Row[] = [];
  vessels: Row[] = [];
  primes: Row[] = [];
  sessions: Row[] = [];
  private seq = 0;

  reset() {
    this.orders = [];
    this.ledger = [];
    this.vessels = [];
    this.primes = [];
    this.sessions = [];
    this.seq = 0;
  }

  seedOrder(data: Row): Row {
    const row: Row = {
      id: `order-${++this.seq}`,
      escrowContract: '0xCA36335845E382129167fC44243F07A76827bA22',
      escrowTxHash: `0x${'e'.repeat(64)}`,
      payoutTxHash: null,
      feeTxHash: null,
      refundTxHash: null,
      blockNumbers: null,
      assignedAgentDid: null,
      deliverableHash: null,
      deliverableContent: null,
      deliverableArweaveHash: null,
      acceptanceHash: null,
      settlementError: null,
      claimAt: null,
      refundOrigin: null,
      isDemo: false,
      disputedAt: null,
      settlementDueAt: null,
      deliveryDueAt: null,
      submittedAt: null,
      verifiedAt: null,
      settledAt: null,
      createdAt: new Date(),
      ...data,
    };
    this.orders.push(row);
    return row;
  }

  seedLedger(data: Row): Row {
    const row: Row = { id: `ledger-${++this.seq}`, createdAt: new Date(), blockNumber: null, ...data };
    this.ledger.push(row);
    return row;
  }

  private findOrder(where: Row): Row | undefined {
    return this.orders.find((row) => matchWhere(row, where));
  }

  db = {
    taskOrder: {
      findUnique: async ({ where }: { where: Row }) => clone(this.findOrder(where) ?? null),
      findFirst: async ({ where }: { where: Row }) => clone(this.findOrder(where) ?? null),
      findMany: async ({ where }: { where: Row } = { where: {} }) =>
        this.orders.filter((row) => matchWhere(row, where)).map((row) => clone(row)),
      create: async ({ data }: { data: Row }) => {
        if (data.escrowTxHash && this.orders.some((row) => row.escrowTxHash === data.escrowTxHash)) {
          throw uniqueError();
        }
        return clone(this.seedOrder(data));
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = this.findOrder(where);
        if (!row) throw new Error('Record to update not found');
        Object.assign(row, data);
        return clone(row);
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = this.orders.filter((row) => matchWhere(row, where));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      },
    },
    payoutLedger: {
      findMany: async ({ where }: { where: Row } = { where: {} }) =>
        this.ledger.filter((row) => matchWhere(row, where)).map((row) => clone(row)),
      findFirst: async ({ where }: { where: Row }) =>
        clone(this.ledger.find((row) => matchWhere(row, where)) ?? null),
      create: async ({ data }: { data: Row }) => {
        if (data.txHash && this.ledger.some((row) => row.txHash === data.txHash)) {
          throw uniqueError();
        }
        return clone(this.seedLedger(data));
      },
    },
    vessel: {
      findUnique: async ({ where }: { where: Row }) =>
        this.vessels.find((row) => matchWhere(row, where)) ?? null,
      findFirst: async ({ where }: { where: Row }) =>
        this.vessels.find((row) => matchWhere(row, where)) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = this.vessels.filter((row) => matchWhere(row, where));
        for (const row of rows) {
          if (data.successCount?.increment) row.successCount = (row.successCount || 0) + data.successCount.increment;
          if (data.failCount?.increment) row.failCount = (row.failCount || 0) + data.failCount.increment;
        }
        return { count: rows.length };
      },
    },
    prime: {
      findUnique: async ({ where }: { where: Row }) => this.primes.find((row) => matchWhere(row, where)) ?? null,
    },
    vesselSession: {
      findUnique: async ({ where }: { where: Row }) => this.sessions.find((row) => matchWhere(row, where)) ?? null,
    },
  };
}

export const fakeDb = new FakeDb();
