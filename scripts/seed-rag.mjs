// ════════════════════════════════════════════════════════════════
// scripts/seed-rag.mjs
// RAG 知识库种子脚本 — 从数据库读取文章 → 关键词 + 向量嵌入索引
// 用法: node scripts/seed-rag.mjs
// 输出: public/rag-knowledge.json (含 256 维嵌入向量)
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ── 嵌入函数（与前端 src/lib/web5/rag/embeddings.ts 一致） ──

const VECTOR_DIM = 256;

function embedText(text) {
  const vec = new Array(VECTOR_DIM).fill(0);
  const cleaned = text.toLowerCase().replace(/[\s\r\n]+/g, ' ').trim();
  if (!cleaned) return vec;

  // 英文 trigram
  for (let i = 0; i < cleaned.length - 2; i++) {
    const gram = cleaned.slice(i, i + 3);
    if (/[a-z0-9]/.test(gram)) {
      const hash = hashStr(gram) % VECTOR_DIM;
      vec[hash] += 1;
    }
  }

  // 中文 bigram
  const chChars = cleaned.replace(/[a-z0-9\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (gram.trim()) {
      vec[hashStr(gram) % VECTOR_DIM] += 2;
    }
  }

  // 中文单字
  for (const ch of cleaned) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      vec[hashStr(ch) % VECTOR_DIM] += 0.5;
    }
  }

  // L2 归一化
  let mag = 0;
  for (const v of vec) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < vec.length; i++) vec[i] /= mag;
  return vec;
}

function hashStr(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
  return Math.abs(hash);
}

// ── 关键词提取 ──

const STOP_WORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','一个',
  '上','也','很','到','说','要','去','你','会','着',
  'the','a','an','is','are','was','were','be','been','being',
]);

function extractKeywords(text) {
  const raw = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
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

  const contents = await prisma.content.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  console.log(`[seed-rag] 读取到 ${contents.length} 条内容`);

  const docs = contents.map((c) => {
    const text = `${c.title || ''} ${c.excerpt || ''} ${(c.bodyMd || '').slice(0, 500)}`;
    return {
      id: `rag-${c.id}`,
      title: c.title || '未命名',
      content: c.bodyMd || '',
      excerpt: (c.excerpt || c.title || '').slice(0, 300),
      source: 'blog',
      keywords: extractKeywords(text),
      vector: embedText(text),
    };
  });

  const outPath = join(__dirname, '..', 'public', 'rag-knowledge.json');
  writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`[seed-rag] 已写入 ${outPath} (${docs.length} 条文档, 含 256 维嵌入向量)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed-rag] 失败:', err);
  process.exit(1);
});
