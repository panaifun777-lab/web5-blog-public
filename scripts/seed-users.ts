// ════════════════════════════════════════════════════════════════
// scripts/seed-users.ts — 10 个种子用户 + 邀请码机制
// 每个 Vessel 唤醒 → 写入 VesselActivation 日志
// Observer Mode → Vessel 转化追踪
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const db = new PrismaClient();

interface SeedUser {
  displayName: string;
  bio: string;
  walletAddress: string;
  role: 'USER' | 'OPERATOR';
  accessMode: 'observer' | 'vessel';
  activatedAt: Date;
  observerToVesselAt?: Date;
  yieldAmount: bigint;
  spentAmount: bigint;
}

// 生成确定性钱包地址（仅用于种子，非真实私钥）
function genWallet(seed: string): string {
  return '0x' + createHash('sha256').update(seed).digest('hex').slice(0, 40);
}

const seedUsers: SeedUser[] = [
  {
    displayName: 'Vitalik Researcher',
    bio: '以太坊研究员，关注 L2 与账户抽象',
    walletAddress: genWallet('vitalik-researcher'),
    role: 'OPERATOR',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 7 * 86400 * 1000),
    observerToVesselAt: new Date(Date.now() - 6 * 86400 * 1000),
    yieldAmount: BigInt(53_430_000),  // 53.43 USDC
    spentAmount: BigInt(8_720_000),
  },
  {
    displayName: 'AI Evangelist',
    bio: 'AI 应用布道者，探索分身经济',
    walletAddress: genWallet('ai-evangelist'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 5 * 86400 * 1000),
    observerToVesselAt: new Date(Date.now() - 4 * 86400 * 1000),
    yieldAmount: BigInt(28_150_000),
    spentAmount: BigInt(3_400_000),
  },
  {
    displayName: 'DeFi Hunter',
    bio: 'DeFi 套利猎人，Vessel 24/7 自动 harvest',
    walletAddress: genWallet('defi-hunter'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 4 * 86400 * 1000),
    yieldAmount: BigInt(91_200_000),
    spentAmount: BigInt(15_800_000),
  },
  {
    displayName: 'Crypto Curator',
    bio: '策展人，擅长发现优质内容',
    walletAddress: genWallet('crypto-curator'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 3 * 86400 * 1000),
    observerToVesselAt: new Date(Date.now() - 2 * 86400 * 1000),
    yieldAmount: BigInt(67_890_000),  // 主要来自推荐分润
    spentAmount: BigInt(2_100_000),
  },
  {
    displayName: 'NFT Collector',
    bio: '内容 NFT 收藏家',
    walletAddress: genWallet('nft-collector'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 3 * 86400 * 1000),
    yieldAmount: BigInt(12_300_000),
    spentAmount: BigInt(45_600_000),  // 支出大于收益（收藏）
  },
  {
    displayName: 'Web3 Observer',
    bio: '从 Web3 转型的观察者',
    walletAddress: genWallet('web3-observer'),
    role: 'USER',
    accessMode: 'observer',  // 仍是 Observer Mode
    activatedAt: new Date(Date.now() - 2 * 86400 * 1000),
    yieldAmount: BigInt(0),
    spentAmount: BigInt(0),
  },
  {
    displayName: 'Mirror Writer',
    bio: '前 Mirror.xyz 作者，迁移至 Web5',
    walletAddress: genWallet('mirror-writer'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 2 * 86400 * 1000),
    observerToVesselAt: new Date(Date.now() - 1 * 86400 * 1000),
    yieldAmount: BigInt(34_500_000),
    spentAmount: BigInt(5_200_000),
  },
  {
    displayName: 'Farcaster Caster',
    bio: 'Farcaster 活跃用户，跨平台分发',
    walletAddress: genWallet('farcaster-caster'),
    role: 'USER',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 1 * 86400 * 1000),
    yieldAmount: BigInt(18_900_000),
    spentAmount: BigInt(7_300_000),
  },
  {
    displayName: 'Curious Reader',
    bio: '好奇的读者，正在考虑唤醒容器',
    walletAddress: genWallet('curious-reader'),
    role: 'USER',
    accessMode: 'observer',  // 仍是 Observer Mode
    activatedAt: new Date(Date.now() - 12 * 3600 * 1000),
    yieldAmount: BigInt(0),
    spentAmount: BigInt(0),
  },
  {
    displayName: 'DAO Operator',
    bio: 'DAO 运营者，多 Prime 管理',
    walletAddress: genWallet('dao-operator'),
    role: 'OPERATOR',
    accessMode: 'vessel',
    activatedAt: new Date(Date.now() - 6 * 3600 * 1000),
    yieldAmount: BigInt(42_100_000),
    spentAmount: BigInt(12_400_000),
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Web5.blog 种子用户初始化（10 个）');
  console.log('═══════════════════════════════════════════════════\n');

  let observerCount = 0;
  let vesselCount = 0;
  let convertedCount = 0;

  for (const u of seedUsers) {
    const primeDid = `did:plvtvs:${u.walletAddress.toLowerCase()}`;

    // Upsert Prime
    const prime = await db.prime.upsert({
      where: { walletAddress: u.walletAddress.toLowerCase() },
      update: {
        displayName: u.displayName,
        bio: u.bio,
        role: u.role,
        status: 'ACTIVE',
        avatarSeed: u.walletAddress.toLowerCase(),
        lastActiveAt: u.activatedAt,
      },
      create: {
        did: primeDid,
        walletAddress: u.walletAddress.toLowerCase(),
        displayName: u.displayName,
        bio: u.bio,
        role: u.role,
        status: 'ACTIVE',
        avatarSeed: u.walletAddress.toLowerCase(),
        lastActiveAt: u.activatedAt,
      },
    });

    if (u.accessMode === 'vessel') {
      vesselCount++;

      // 创建 Eidolon
      const eidolonDid = `did:eidolon:${u.walletAddress.toLowerCase().slice(0, 16)}`;
      const eidolon = await db.eidolon.upsert({
        where: { did: eidolonDid },
        update: { lastActiveAt: u.activatedAt },
        create: {
          did: eidolonDid,
          name: `${u.displayName}'s Eidolon`,
          primeId: prime.id,
          ragCollection: `eidolon_memory_${u.walletAddress.toLowerCase().slice(0, 8)}`,
          status: 'ACTIVE',
          lastActiveAt: u.activatedAt,
        },
      });

      // 创建 Vessel
      const vesselDid = `did:vessel:${u.walletAddress.toLowerCase().slice(0, 16)}`;
      const vessel = await db.vessel.upsert({
        where: { did: vesselDid },
        update: { status: 'ACTIVE', lastActiveAt: u.activatedAt },
        create: {
          did: vesselDid,
          eidolonId: eidolon.id,
          primeId: prime.id,
          smartAccountAddress: u.walletAddress,
          status: 'ACTIVE',
          lastActiveAt: u.activatedAt,
        },
      });

      // 创建 AP2Budget
      const existingBudget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
      if (!existingBudget) {
        await db.aP2Budget.create({
          data: {
            vesselId: vessel.id,
            primeId: prime.id,
            dailyLimit: BigInt(10_000_000),   // 10 USDC
            perTxLimit: BigInt(1_000_000),    // 1 USDC
            rateLimitPerMin: 5,
            whitelist: JSON.stringify([]),
            categoryLimit: JSON.stringify({
              read: '5000000',
              tip: '3000000',
              subscribe: '2000000',
              royalty: '0',
              harvest: '0',
            }),
            spentToday: u.spentAmount,
          },
        });
      }

      // 创建 VesselSession
      const tokenHash = createHash('sha256').update(vesselDid + Date.now()).digest('hex');
      await db.vesselSession.create({
        data: {
          vesselId: vessel.id,
          primeId: prime.id,
          tokenHash,
          aa2pClaimId: randomBytes(8).toString('hex'),
          permissions: JSON.stringify(['read', 'comment', 'publish', 'micropay']),
          ap2Budget: JSON.stringify({
            dailyLimit: '10000000',
            perTxLimit: '1000000',
            rateLimitPerMin: 5,
          }),
          expiresAt: new Date(Date.now() + 86400 * 1000 * 7),
          createdAt: u.activatedAt,
        },
      });

      // 生成 Autonomous Logs（模拟 24/7 自治活动）
      const logCount = Math.floor(Math.random() * 15) + 5;
      for (let i = 0; i < logCount; i++) {
        const actions = ['read', 'comment', 'tip', 'harvest', 'distribute'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const yieldAmount = action === 'harvest' || action === 'distribute'
          ? BigInt(Math.floor(Math.random() * 500_000) + 100_000)
          : null;
        const spentAmount = action === 'tip'
          ? BigInt(Math.floor(Math.random() * 100_000) + 10_000)
          : null;

        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action,
            targetDid: `did:vessel:${randomBytes(8).toString('hex')}`,
            targetContent: randomBytes(8).toString('base64url').slice(0, 16),
            yieldAmount,
            spentAmount,
            metadata: JSON.stringify({ simulated: true }),
            createdAt: new Date(u.activatedAt.getTime() + i * 3600 * 1000 * Math.random() * 24),
          },
        });
      }

      if (u.observerToVesselAt) convertedCount++;

      console.log(`  ✓ [Vessel] ${u.displayName} — yield: ${Number(u.yieldAmount) / 1e6} USDC, spent: ${Number(u.spentAmount) / 1e6} USDC`);
    } else {
      observerCount++;
      console.log(`  ○ [Observer] ${u.displayName} — pending conversion`);
    }
  }

  // 创建邀请码
  console.log('\n▸ 生成邀请码...');
  const inviteCodes = ['WEB5-ALPHA-001', 'WEB5-ALPHA-002', 'WEB5-ALPHA-003'];
  for (const code of inviteCodes) {
    const existing = await db.systemConfig.findUnique({ where: { key: `invite:${code}` } });
    if (!existing) {
      await db.systemConfig.create({
        data: {
          key: `invite:${code}`,
          value: JSON.stringify({
            code,
            maxUses: 10,
            usedCount: 0,
            createdAt: new Date().toISOString(),
          }),
        },
      });
      console.log(`  ✓ 邀请码: ${code}`);
    }
  }

  // 创建转化率统计
  const conversionRate = (convertedCount / (convertedCount + observerCount) * 100).toFixed(1);
  await db.systemConfig.upsert({
    where: { key: 'conversion_stats' },
    update: {
      value: JSON.stringify({
        totalUsers: seedUsers.length,
        observerMode: observerCount,
        vesselMode: vesselCount,
        convertedFromObserver: convertedCount,
        conversionRate: `${conversionRate}%`,
        lastUpdated: new Date().toISOString(),
      }),
    },
    create: {
      key: 'conversion_stats',
      value: JSON.stringify({
        totalUsers: seedUsers.length,
        observerMode: observerCount,
        vesselMode: vesselCount,
        convertedFromObserver: convertedCount,
        conversionRate: `${conversionRate}%`,
        lastUpdated: new Date().toISOString(),
      }),
    },
  });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  种子用户初始化完成');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  总用户: ${seedUsers.length}`);
  console.log(`  Vessel 模式: ${vesselCount}`);
  console.log(`  Observer 模式: ${observerCount}`);
  console.log(`  Observer → Vessel 转化: ${convertedCount}`);
  console.log(`  转化率: ${conversionRate}%`);
  console.log('═══════════════════════════════════════════════════\n');

  await db.$disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
