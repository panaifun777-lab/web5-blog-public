import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VECTOR_DIM = 256;

function hashStr(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
  return Math.abs(hash);
}

function embedText(text) {
  const vec = new Array(VECTOR_DIM).fill(0);
  const cleaned = text.toLowerCase().replace(/[\s\r\n]+/g, ' ').trim();
  if (!cleaned) return vec;

  // 英文 trigram
  for (let i = 0; i < cleaned.length - 2; i++) {
    const gram = cleaned.slice(i, i + 3);
    if (/[a-z0-9]/.test(gram)) {
      vec[hashStr(gram) % VECTOR_DIM] += 1;
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

  // L2 归一化
  let mag = 0;
  for (const v of vec) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < vec.length; i++) vec[i] /= mag;
  return vec;
}

function extractKeywords(text) {
  const raw = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const words = new Set();
  const chChars = raw.replace(/[a-z0-9\s]/g, '');
  for (let i = 0; i < chChars.length - 1; i++) {
    const gram = chChars.slice(i, i + 2);
    if (gram.trim().length > 1) words.add(gram);
  }
  return Array.from(words).slice(0, 30);
}

async function buildWhitepaperRag() {
  console.log('[build-rag] 读取白皮书 v3.0 章节...');
  const md = readFileSync(join(__dirname, '..', 'WHITE_PAPER_V3.0.md'), 'utf8');

  // 按二级标题切分文档
  const sections = md.split(/(?=^##\s+)/m).filter(s => s.trim().length > 50);

  const docs = sections.map((sec, idx) => {
    const lines = sec.trim().split('\n');
    const title = lines[0].replace(/^##\s+/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    const textToEmbed = `${title} ${content.slice(0, 400)}`;

    return {
      id: `whitepaper-v3-sec-${idx + 1}`,
      title: `《WEB 5.0 白皮书 v3.0》- ${title}`,
      content: content,
      excerpt: content.slice(0, 200).replace(/[\r\n]+/g, ' ') + '...',
      source: 'whitepaper-v3.0',
      keywords: extractKeywords(textToEmbed),
      vector: embedText(textToEmbed),
    };
  });

  const outPath = join(__dirname, '..', 'public', 'rag-knowledge.json');
  writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`✅ [build-rag] 成功生成 RAG 知识库切片: ${docs.length} 个知识单元，已写入 ${outPath}`);
}

buildWhitepaperRag().catch(console.error);
