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

  // 1. Part 4 ZH
  const part4_zh = fs.readFileSync('humanity_part4_zh.md', 'utf-8');
  const hash4_zh = 'arw_' + createHash('sha256').update(part4_zh).digest('hex').slice(0, 32);
  const p4_zh = await db.content.upsert({
    where: { arweaveHash: hash4_zh },
    update: {
      title: '《唤醒沉睡三十年的 HTTP 402：从无感微支付到万亿级机器原生经济》',
      bodyMd: part4_zh,
      excerpt: '解构互联网被遗忘的幽灵状态码 HTTP 402。从信用卡垄断到 x402 机器原生革命，结合 Circle ARC 原生 USDC 结算、EIP-712 离线凭单与 BudgetFence 三道闸，构建万亿级智能体自主经济流。',
    },
    create: {
      arweaveHash: hash4_zh,
      tokenId: 10007n,
      authorDid,
      primeId: prime.id,
      title: '《唤醒沉睡三十年的 HTTP 402：从无感微支付到万亿级机器原生经济》',
      bodyMd: part4_zh,
      excerpt: '解构互联网被遗忘的幽灵状态码 HTTP 402。从信用卡垄断到 x402 机器原生革命，结合 Circle ARC 原生 USDC 结算、EIP-712 离线凭单与 BudgetFence 三道闸，构建万亿级智能体自主经济流。',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 300000),
    },
  });
  console.log('Published Part 4 ZH -> ID:', p4_zh.id);

  // 2. Part 4 EN
  const part4_en = fs.readFileSync('humanity_part4_en.md', 'utf-8');
  const hash4_en = 'arw_' + createHash('sha256').update(part4_en).digest('hex').slice(0, 32);
  const p4_en = await db.content.upsert({
    where: { arweaveHash: hash4_en },
    update: {
      title: 'Awakening the Thirty-Year Dormant HTTP 402: From Frictionless Micropayments to Trillion-Dollar Machine-Native Economies',
      bodyMd: part4_en,
      excerpt: 'Deconstructing the internet forgotten ghost status code HTTP 402. Transitioning from credit card monopolies to machine-native x402 micro-settlements on Circle ARC USDC.',
    },
    create: {
      arweaveHash: hash4_en,
      tokenId: 10008n,
      authorDid,
      primeId: prime.id,
      title: 'Awakening the Thirty-Year Dormant HTTP 402: From Frictionless Micropayments to Trillion-Dollar Machine-Native Economies',
      bodyMd: part4_en,
      excerpt: 'Deconstructing the internet forgotten ghost status code HTTP 402. Transitioning from credit card monopolies to machine-native x402 micro-settlements on Circle ARC USDC.',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(),
    },
  });
  console.log('Published Part 4 EN -> ID:', p4_en.id);

  console.log('Part 4 publications committed successfully!');
}

main().catch(console.error);
