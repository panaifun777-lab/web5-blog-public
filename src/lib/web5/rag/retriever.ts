// ════════════════════════════════════════════════════════════════
// src/lib/web5/rag/retriever.ts
// 本地 RAG 检索器 — 关键字匹配 + 相似度排序
// MVP：从知识库文档中检索最相关的上下文段落
// 生产环境：替换为向量数据库 (Pinecone/Chroma)
// ════════════════════════════════════════════════════════════════

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  source: string; // e.g. 'blog', 'manual', 'knowledge'
  keywords: string[];
  score?: number;
}

// ── 本地知识库（内存） ──

let knowledgeBase: RagDocument[] = [];

/**
 * 加载知识库文档
 */
export function loadKnowledgeBase(docs: RagDocument[]): void {
  knowledgeBase = docs.map((d) => ({
    ...d,
    keywords: extractKeywords(`${d.title} ${d.excerpt} ${d.content.slice(0, 500)}`),
  }));
}

/**
 * 清空知识库
 */
export function clearKnowledgeBase(): void {
  knowledgeBase = [];
}

/**
 * 获取知识库大小
 */
export function knowledgeBaseSize(): number {
  return knowledgeBase.length;
}

// ── 关键词提取 ──

/**
 * 从文本中提取关键词（简单分词 + 去停用词）
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'can', 'could', 'this', 'that', 'these',
    'those', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'into', 'about', 'like', 'through',
  ]);

  // 中文 + 英文分词
  const raw = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = new Set<string>();

  // 提取英文词（2+ 字母）
  const enWords = raw.match(/[a-z]{2,}/g);
  if (enWords) enWords.forEach((w) => words.add(w));

  // 提取中文 2-gram（相邻字符对）
  const chChars = raw.replace(/[a-z\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (!stopWords.has(gram) && gram.trim()) words.add(gram);
  }

  // 提取单个中文（重要的实词 — 直接匹配非停用词的单字）
  for (const ch of chChars) {
    if (!stopWords.has(ch) && ch.trim()) words.add(ch);
  }

  return Array.from(words).filter((w) => !stopWords.has(w));
}

/**
 * 计算关键词匹配分数
 */
function scoreKeywords(queryWords: string[], docWords: string[]): number {
  if (queryWords.length === 0 || docWords.length === 0) return 0;
  const querySet = new Set(queryWords);
  const docSet = new Set(docWords);
  let matches = 0;
  for (const qw of queryWords) {
    if (docSet.has(qw)) matches++;
    // 部分匹配：doc 关键词包含 query 关键词
    for (const dw of docWords) {
      if (dw.includes(qw) || qw.includes(dw)) {
        matches += 0.5;
      }
    }
  }
  return matches / Math.sqrt(queryWords.length + docWords.length);
}

// ── 检索 ──

/**
 * 检索最相关的文档段落
 */
export function retrieve(query: string, topK = 3): RagDocument[] {
  if (knowledgeBase.length === 0) return [];

  const queryWords = extractKeywords(query);

  const scored = knowledgeBase
    .map((doc) => ({
      ...doc,
      score: scoreKeywords(queryWords, doc.keywords),
    }))
    .filter((doc) => doc.score > 0.1)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);

  return scored;
}

/**
 * 生成 RAG 上下文文本（直接嵌入 system prompt 的格式）
 */
export function buildRagContext(query: string, topK = 3): string {
  const docs = retrieve(query, topK);
  if (docs.length === 0) return '';

  const context = docs
    .map(
      (doc, i) =>
        `[知识库 #${i + 1}] ${doc.title}
来源: ${doc.source}
内容: ${doc.excerpt.slice(0, 400)}
`,
    )
    .join('\n');

  return `\n\n[私有知识库上下文 — 由 DWN RAG 引擎检索]
${context}
[/私有知识库上下文]\n\n`;
}
