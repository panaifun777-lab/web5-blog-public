// ════════════════════════════════════════════════════════════════
// src/lib/web5/rag/embeddings.ts
// 本地向量嵌入 — 无需外部 API，基于字符频率 + 关键词的简单嵌入
// 生产环境可替换为 OpenAI / DeepSeek embeddings API
// ════════════════════════════════════════════════════════════════

// ── 向量维度 — 256 维（够用且轻量） ──
export const VECTOR_DIM = 256;

/**
 * 生成基于字符频率的嵌入向量
 *
 * 方法：将文本映射到一个固定长度的频率向量
 * - 字母 n-gram (2-4 char) 哈希到 0..VECTOR_DIM-1
 * - 中文字符 bigram 哈希到同样空间
 * 结果：归一化的浮点数向量
 */
export function embedText(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIM);
  const cleaned = text.toLowerCase().replace(/[\s\r\n]+/g, ' ').trim();
  if (!cleaned) return Array.from(vec);

  // 英文 trigram
  for (let i = 0; i < cleaned.length - 2; i++) {
    const gram = cleaned.slice(i, i + 3);
    if (/[a-z0-9]/.test(gram)) {
      const hash = hashString(gram) % VECTOR_DIM;
      vec[hash] += 1;
    }
  }

  // 中文 bigram（每对相邻中文字符）
  const chChars = cleaned.replace(/[a-z0-9\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (gram.trim()) {
      const hash = hashString(gram) % VECTOR_DIM;
      vec[hash] += 2; // 中文字符权重大一点
    }
  }

  // 单字（仅重要实词）
  for (const ch of cleaned) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      const hash = hashString(ch) % VECTOR_DIM;
      vec[hash] += 0.5;
    }
  }

  // L2 归一化
  return normalize(vec);
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function normalize(vec: Float64Array): number[] {
  let magnitude = 0;
  for (let i = 0; i < vec.length; i++) magnitude += vec[i] * vec[i];
  magnitude = Math.sqrt(magnitude);
  if (magnitude === 0) return Array.from(vec);
  for (let i = 0; i < vec.length; i++) vec[i] /= magnitude;
  return Array.from(vec);
}

/**
 * 余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 批量预计算嵌入（用于 seed-rag 脚本）
 */
export function precomputeEmbeddings(docs: { id: string; text: string }[]): Array<{ id: string; vector: number[] }> {
  return docs.map((d) => ({
    id: d.id,
    vector: embedText(d.text),
  }));
}
