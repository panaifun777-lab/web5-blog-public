// ════════════════════════════════════════════════════════════════
// src/lib/web5/rag/loader.ts
// RAG 知识库加载器 — 从 JSON 文件加载知识库到内存
// ════════════════════════════════════════════════════════════════

import { loadKnowledgeBase, buildRagContext } from './retriever';
import fs from 'fs';
import path from 'path';

let loaded = false;
let loading: Promise<void> | null = null;

/**
 * 加载知识库 (从 public/rag-knowledge.json)
 * 服务端直接读文件，客户端走 fetch，彻底杜绝 ERR_INVALID_URL 报错
 */
export async function ensureKnowledgeBase(): Promise<void> {
  if (loaded) return;
  if (loading) return loading;

  loading = (async () => {
    try {
      if (typeof window === 'undefined') {
        const filePath = path.join(process.cwd(), 'public', 'rag-knowledge.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const docs = JSON.parse(raw);
          if (Array.isArray(docs) && docs.length > 0) {
            loadKnowledgeBase(docs);
            loaded = true;
            console.log(`[RAG] 服务端直接加载知识库成功: ${docs.length} 条文档`);
            return;
          }
        }
      } else {
        const res = await fetch('/rag-knowledge.json');
        if (res.ok) {
          const docs = await res.json();
          if (Array.isArray(docs) && docs.length > 0) {
            loadKnowledgeBase(docs);
            loaded = true;
            console.log(`[RAG] 客户端加载知识库成功: ${docs.length} 条文档`);
          }
        }
      }
    } catch (err) {
      console.warn('[RAG] 知识库加载失败:', err);
    }
  })();

  return loading;
}

export { buildRagContext };
