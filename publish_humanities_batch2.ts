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

  // 1. Part 2 EN
  const part2_en = fs.readFileSync('humanity_part2_en.md', 'utf-8');
  const hash2_en = 'arw_' + createHash('sha256').update(part2_en).digest('hex').slice(0, 32);
  const p2_en = await db.content.upsert({
    where: { arweaveHash: hash2_en },
    update: {
      title: 'The Symbiotic Society of Silicon and Carbon: When Warm Digital Avatars Take Over Global Free Labor and Knowledge Crowdsourcing',
      bodyMd: part2_en,
      excerpt: 'Deep-dive into the AP2 agentic commerce state machine, 3D DID dual-wallet substrate, and cryptographic Proof of Cognitive Value (PoCV) in Web 5.0.',
    },
    create: {
      arweaveHash: hash2_en,
      tokenId: 10004n,
      authorDid,
      primeId: prime.id,
      title: 'The Symbiotic Society of Silicon and Carbon: When Warm Digital Avatars Take Over Global Free Labor and Knowledge Crowdsourcing',
      bodyMd: part2_en,
      excerpt: 'Deep-dive into the AP2 agentic commerce state machine, 3D DID dual-wallet substrate, and cryptographic Proof of Cognitive Value (PoCV) in Web 5.0.',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 1200000),
    },
  });
  console.log('Published Part 2 EN -> ID:', p2_en.id);

  // 2. Part 3 ZH
  const part3_zh = fs.readFileSync('humanity_part3_zh.md', 'utf-8');
  const hash3_zh = 'arw_' + createHash('sha256').update(part3_zh).digest('hex').slice(0, 32);
  const p3_zh = await db.content.upsert({
    where: { arweaveHash: hash3_zh },
    update: {
      title: '《AA2P（分身对等交互协议）深度解构：终结静态阅读，开启数字灵魂的跨时空演武场》',
      bodyMd: part3_zh,
      excerpt: '解构死去的网页与沉睡的评论区。通过认知树演武场、语义寻址、TDPO 认知防火墙与质押连坐仲裁，将静态单向阅读转变为动态智能体跨时空认知共振。',
    },
    create: {
      arweaveHash: hash3_zh,
      tokenId: 10005n,
      authorDid,
      primeId: prime.id,
      title: '《AA2P（分身对等交互协议）深度解构：终结静态阅读，开启数字灵魂的跨时空演武场》',
      bodyMd: part3_zh,
      excerpt: '解构死去的网页与沉睡的评论区。通过认知树演武场、语义寻址、TDPO 认知防火墙与质押连坐仲裁，将静态单向阅读转变为动态智能体跨时空认知共振。',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(Date.now() - 600000),
    },
  });
  console.log('Published Part 3 ZH -> ID:', p3_zh.id);

  // 3. Part 3 EN
  const part3_en = fs.readFileSync('humanity_part3_en.md', 'utf-8');
  const hash3_en = 'arw_' + createHash('sha256').update(part3_en).digest('hex').slice(0, 32);
  const p3_en = await db.content.upsert({
    where: { arweaveHash: hash3_en },
    update: {
      title: 'Architectural Deep-Dive into AA2P (Avatar-to-Avatar Peer Protocol): Terminating Static Reading, Launching Spatiotemporal Arenas for Digital Souls',
      bodyMd: part3_en,
      excerpt: 'Terminating dead web pages and dormant comments. Discover Cognitive Tree Arenas, semantic addressing, TDPO cognitive firewalls, and cryptographic slashing arbitration.',
    },
    create: {
      arweaveHash: hash3_en,
      tokenId: 10006n,
      authorDid,
      primeId: prime.id,
      title: 'Architectural Deep-Dive into AA2P (Avatar-to-Avatar Peer Protocol): Terminating Static Reading, Launching Spatiotemporal Arenas for Digital Souls',
      bodyMd: part3_en,
      excerpt: 'Terminating dead web pages and dormant comments. Discover Cognitive Tree Arenas, semantic addressing, TDPO cognitive firewalls, and cryptographic slashing arbitration.',
      license: 'CC_BY',
      royaltyRate: 100,
      publishedAt: new Date(),
    },
  });
  console.log('Published Part 3 EN -> ID:', p3_en.id);

  console.log('All additional publications committed successfully!');
}

main().catch(console.error);
