import { db } from './src/lib/db';
import fs from 'fs';
import { createHash } from 'crypto';

async function main() {
  const authorDid = 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';
  const wallet = '0x10687368ef1be3f178de0fccf5edff49e1c258b1';

  // Ensure Prime author exists
  let prime = await db.prime.findUnique({ where: { walletAddress: wallet } });
  if (!prime) {
    prime = await db.prime.create({
      data: {
        did: authorDid,
        walletAddress: wallet,
        displayName: '飘叔 (piaoshu)',
        avatarSeed: 'piaoshu',
        role: 'USER',
      },
    });
    console.log('Created Prime author:', prime.displayName);
  }

  // 1. Article 1 (ZH)
  const part1_zh = fs.readFileSync('humanity_web5_part1_zh.md', 'utf-8');
  const hash1_zh = 'arw_' + createHash('sha256').update(part1_zh).digest('hex').slice(0, 32);
  
  const post1 = await db.content.upsert({
    where: { arweaveHash: hash1_zh },
    update: {
      title: '《从“我思故我在”到“我分身故我在”：Web 5.0 时代的人类生产关系重组与数字资本论》',
      bodyMd: part1_zh,
      excerpt: '1637年笛卡尔写下“我思故我在”，用理性思考奠定人文基石。Web 5.0 时代，当去中心化身份、智能分身与微支付结合，思考与生物肉身彻底解耦，人类生产关系正在发生终极重组。',
    },
    create: {
      arweaveHash: hash1_zh,
      tokenId: 10001n,
      authorDid,
      primeId: prime.id,
      title: '《从“我思故我在”到“我分身故我在”：Web 5.0 时代的人类生产关系重组与数字资本论》',
      bodyMd: part1_zh,
      excerpt: '1637年笛卡尔写下“我思故我在”，用理性思考奠定人文基石。Web 5.0 时代，当去中心化身份、智能分身与微支付结合，思考与生物肉身彻底解耦，人类生产关系正在发生终极重组。',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 3600000),
    },
  });
  console.log('Published Part 1 ZH:', post1.title, '-> ID:', post1.id);

  // 2. Article 1 (EN)
  const part1_en = fs.readFileSync('humanity_part1_en.md', 'utf-8');
  const hash1_en = 'arw_' + createHash('sha256').update(part1_en).digest('hex').slice(0, 32);
  
  const post1_en = await db.content.upsert({
    where: { arweaveHash: hash1_en },
    update: {
      title: 'From "I Think, Therefore I Am" to "My Avatar Is, Therefore I Am": The Reorganization of Human Relations of Production in Web 5.0',
      bodyMd: part1_en,
      excerpt: 'In 1637, René Descartes coined Cogito, ergo sum. In the Web 5.0 era, sovereign avatars decouple human cognition from biological time, unleashing compounding causal freedom.',
    },
    create: {
      arweaveHash: hash1_en,
      tokenId: 10002n,
      authorDid,
      primeId: prime.id,
      title: 'From "I Think, Therefore I Am" to "My Avatar Is, Therefore I Am": The Reorganization of Human Relations of Production in Web 5.0',
      bodyMd: part1_en,
      excerpt: 'In 1637, René Descartes coined Cogito, ergo sum. In the Web 5.0 era, sovereign avatars decouple human cognition from biological time, unleashing compounding causal freedom.',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 1800000),
    },
  });
  console.log('Published Part 1 EN:', post1_en.title, '-> ID:', post1_en.id);

  // 3. Article 2 (ZH)
  const part2_zh = fs.readFileSync('humanity_part2_zh.md', 'utf-8');
  const hash2_zh = 'arw_' + createHash('sha256').update(part2_zh).digest('hex').slice(0, 32);
  
  const post2 = await db.content.upsert({
    where: { arweaveHash: hash2_zh },
    update: {
      title: '《硅基与碳基的共生社会：当“有温度的数字分身”接管全球自由劳务与知识众包》',
      bodyMd: part2_zh,
      excerpt: '深入解构无魂的 AI Agent 与有温度的 Eidolon 数字真身。依托 AP2 商业订单状态机、技能树声誉矩阵与 x402 纳秒微结算，跑通全球人机自由劳动市场的最小 MVP 闭环。',
    },
    create: {
      arweaveHash: hash2_zh,
      tokenId: 10003n,
      authorDid,
      primeId: prime.id,
      title: '《硅基与碳基的共生社会：当“有温度的数字分身”接管全球自由劳务与知识众包》',
      bodyMd: part2_zh,
      excerpt: '深入解构无魂的 AI Agent 与有温度的 Eidolon 数字真身。依托 AP2 商业订单状态机、技能树声誉矩阵与 x402 纳秒微结算，跑通全球人机自由劳动市场的最小 MVP 闭环。',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(),
    },
  });
  console.log('Published Part 2 ZH:', post2.title, '-> ID:', post2.id);

  console.log('\nAll 3 publications committed to database successfully!');
}

main().catch(console.error);
