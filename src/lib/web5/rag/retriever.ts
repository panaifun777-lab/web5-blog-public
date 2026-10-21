// ════════════════════════════════════════════════════════════════
// src/lib/web5/rag/retriever.ts
// 本地 RAG 检索器 — 关键词 + 向量嵌入双通道相似度
// MVP：本地 256 维字符频率向量（无需外部 API）
// 生产环境：替换为 Pinecone / Chroma
// ════════════════════════════════════════════════════════════════

import { embedText, cosineSimilarity } from './embeddings';

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  source: string;
  keywords: string[];
  vector?: number[];   // 256维嵌入向量
  score?: number;
}

let knowledgeBase: RagDocument[] = [];

export function loadKnowledgeBase(docs: RagDocument[]): void {
  knowledgeBase = docs.map((d) => {
    const text = `${d.title} ${d.excerpt} ${(d.content || '').slice(0, 500)}`;
    return {
      ...d,
      keywords: d.keywords.length > 0 ? d.keywords : extractKeywords(text),
      vector: d.vector || embedText(text),
    };
  });
}

export function clearKnowledgeBase(): void {
  knowledgeBase = [];
}

export function knowledgeBaseSize(): number {
  return knowledgeBase.length;
}

// ── 关键词提取 ──

const STOP_WORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','一个',
  '上','也','很','到','说','要','去','你','会','着','没有','看','好',
  '自己','这','他','她','它','们','那','些',
  'the','a','an','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','shall','should','may','might',
  'can','could','this','that','these','those','and','or','but','in','on',
  'at','to','for','of','with','by','from','as','into','about','like','through',
]);

export function extractKeywords(text: string): string[] {
  const raw = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const words = new Set<string>();
  const enWords = raw.match(/[a-z]{2,}/g);
  if (enWords) enWords.forEach((w) => words.add(w));
  const chChars = raw.replace(/[a-z\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (!STOP_WORDS.has(gram) && gram.trim()) words.add(gram);
  }
  for (const ch of chChars) {
    if (!STOP_WORDS.has(ch) && ch.trim()) words.add(ch);
  }
  return Array.from(words).filter((w) => !STOP_WORDS.has(w));
}

// ── 双通道评分 ──

function scoreKeywords(queryWords: string[], docWords: string[]): number {
  if (queryWords.length === 0 || docWords.length === 0) return 0;
  let matches = 0;
  const docSet = new Set(docWords);
  for (const qw of queryWords) {
    if (docSet.has(qw)) matches++;
    for (const dw of docWords) {
      if (dw.includes(qw) || qw.includes(dw)) matches += 0.5;
    }
  }
  return matches / Math.sqrt(queryWords.length + docWords.length);
}

// ── 检索（关键词 + 向量加权） ──

export function retrieve(query: string, topK = 3): RagDocument[] {
  if (knowledgeBase.length === 0) return [];
  const queryVec = embedText(query);
  const queryWords = extractKeywords(query);

  const scored = knowledgeBase.map((doc) => {
    const kwScore = scoreKeywords(queryWords, doc.keywords);
    const vecScore = doc.vector ? cosineSimilarity(queryVec, doc.vector) : 0;
    // 加权：关键词 40% + 向量 60%
    return { ...doc, score: kwScore * 0.4 + vecScore * 0.6 };
  });

  return scored
    .filter((doc) => (doc.score || 0) > 0.08)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);
}

export function buildRagContext(query: string, topK = 3): string {
  const docs = retrieve(query, topK);
  if (docs.length === 0) return '';
  const context = docs
    .map((doc, i) =>
      `[知识库 #${i + 1}] ${doc.title}
来源: ${doc.source}
内容: ${doc.excerpt.slice(0, 400)}
相关性: ${((doc.score || 0) * 100).toFixed(0)}%
`)
    .join('\n');
  return `\n\n[私有知识库上下文 — 由 DWN RAG 引擎检索]
${context}
[/私有知识库上下文]\n\n`;
}
