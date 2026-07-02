// ════════════════════════════════════════════════════════════════
// scripts/seed-rag.mjs
// RAG 知识库种子脚本 — 从数据库读取文章生成关键词索引
// 用法: node scripts/seed-rag.mjs
// 输出: public/rag-knowledge.json
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ── 简单关键词提取（与 retriever.ts 一致） ──

const STOP_WORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','一个',
  '上','也','很','到','说','要','去','你','会','着','没有','看','好',
  '自己','这','他','她','它','们','那','些','被','把','让','向','从',
  'the','a','an','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','shall','should','may','might',
  'can','could','this','that','these','those','and','or','but','in','on',
  'at','to','for','of','with','by','from','as','into','about','like',
]);

function extractKeywords(text) {
  const raw = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = new Set();
  const enWords = raw.match(/[a-z]{2,}/g);
  if (enWords) enWords.forEach(w => words.add(w));

  const chChars = raw.replace(/[a-z\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (!STOP_WORDS.has(gram) && gram.trim()) words.add(gram);
  }
  for (const ch of chChars) {
    if (!STOP_WORDS.has(ch) && ch.trim()) words.add(ch);
  }

  return Array.from(words).filter(w => !STOP_WORDS.has(w));
}

// ── 主流程 ──

async function main() {
  console.log('[seed-rag] 开始生成知识库...');

  // 从数据库读取已发布内容
  const contents = await prisma.content.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  console.log(`[seed-rag] 读取到 ${contents.length} 条内容`);

  const docs = contents.map((c, i) => {
    const text = `${c.title || ''} ${c.excerpt || ''} ${(c.bodyMd || '').slice(0, 500)}`;
    return {
      id: `rag-${c.id || i}`,
      title: c.title || '未命名',
      content: c.bodyMd || '',
      excerpt: (c.excerpt || c.title || '').slice(0, 300),
      source: 'blog',
      keywords: extractKeywords(text),
    };
  });

  // 写入 JSON
  const outPath = join(__dirname, '..', 'public', 'rag-knowledge.json');
  writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`[seed-rag] 已写入 ${outPath} (${docs.length} 条文档)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed-rag] 失败:', err);
  process.exit(1);
});
