// ════════════════════════════════════════════════════════════════
// src/lib/web5/rag/loader.ts
// RAG 知识库加载器 — 从 JSON 文件加载知识库到内存
// ════════════════════════════════════════════════════════════════

import { loadKnowledgeBase, buildRagContext } from './retriever';

let loaded = false;
let loading: Promise<void> | null = null;

/**
 * 加载知识库 (从 /rag-knowledge.json)
 * 自动去重加载
 */
export async function ensureKnowledgeBase(): Promise<void> {
  if (loaded) return;
  if (loading) return loading;

  loading = (async () => {
    try {
      const res = await fetch('/rag-knowledge.json');
      if (res.ok) {
        const docs = await res.json();
        if (Array.isArray(docs) && docs.length > 0) {
          loadKnowledgeBase(docs);
          loaded = true;
          console.log(`[RAG] 知识库已加载: ${docs.length} 条文档`);
        }
      }
    } catch (err) {
      console.warn('[RAG] 知识库加载失败:', err);
    }
  })();

  return loading;
}

export { buildRagContext };
