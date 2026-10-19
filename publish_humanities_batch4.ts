import { db } from './src/lib/db';
import fs from 'fs';
import { createHash } from 'crypto';

async function main() {
  const authorDid = 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';
  const wallet = '0x10687368ef1be3f178de0fccf5edff49e1c258b1';

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
  }

  // 1. Part 5 ZH
  const part5_zh = fs.readFileSync('humanity_part5_zh.md', 'utf-8');
  const hash5_zh = 'arw_' + createHash('sha256').update(part5_zh).digest('hex').slice(0, 32);
  const p5_zh = await db.content.upsert({
    where: { arweaveHash: hash5_zh },
    update: {
      title: '《Circle ARC 原生 USDC 结算底座与 $WBOG 本体网关：构建永不枯竭的 Web 5.0 自治飞轮》',
      bodyMd: part5_zh,
      excerpt: '解构 Web 5.0 终局价值奇点。深入 Circle ARC 原生 USDC 零摩擦机器经济、x402 亚秒微付协议、80/20 收益分配模型与 $WBOG 刚性通缩飞轮。',
    },
    create: {
      arweaveHash: hash5_zh,
      tokenId: 10009n,
      authorDid,
      primeId: prime.id,
      title: '《Circle ARC 原生 USDC 结算底座与 $WBOG 本体网关：构建永不枯竭的 Web 5.0 自治飞轮》',
      bodyMd: part5_zh,
      excerpt: '解构 Web 5.0 终局价值奇点。深入 Circle ARC 原生 USDC 零摩擦机器经济、x402 亚秒微付协议、80/20 收益分配模型与 $WBOG 刚性通缩飞轮。',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 100000),
    },
  });
  console.log('Published Part 5 ZH -> ID:', p5_zh.id);

  // 2. Part 5 EN
  const part5_en = fs.readFileSync('humanity_part5_en.md', 'utf-8');
  const hash5_en = 'arw_' + createHash('sha256').update(part5_en).digest('hex').slice(0, 32);
  const p5_en = await db.content.upsert({
    where: { arweaveHash: hash5_en },
    update: {
      title: 'Circle ARC Native USDC Settlement Layer & $WBOG Ontological Gateway: Architecting an Exhaustion-Proof Web 5.0 Autonomous Flywheel',
      bodyMd: part5_en,
      excerpt: 'Deconstructing the Web 5.0 value singularity: Circle ARC native USDC machine rails, x402 sub-second micropayments, 80/20 revenue routing, and $WBOG deflationary mechanics.',
    },
    create: {
      arweaveHash: hash5_en,
      tokenId: 10010n,
      authorDid,
      primeId: prime.id,
      title: 'Circle ARC Native USDC Settlement Layer & $WBOG Ontological Gateway: Architecting an Exhaustion-Proof Web 5.0 Autonomous Flywheel',
      bodyMd: part5_en,
      excerpt: 'Deconstructing the Web 5.0 value singularity: Circle ARC native USDC machine rails, x402 sub-second micropayments, 80/20 revenue routing, and $WBOG deflationary mechanics.',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(),
    },
  });
  console.log('Published Part 5 EN -> ID:', p5_en.id);

  console.log('Part 5 grand finale publications committed successfully!');
}

main().catch(console.error);
