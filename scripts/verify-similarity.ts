import { classifyTitleDomain } from '../src/lib/web5/ai/domain-classifier';
import { synthesizeArticle, validateOutput } from '../src/lib/web5/ai/content-synthesizer';

const cases = [
  { title: 'Circle ARC 稳定币公链测试网与主网生态爆发', thesis: '原生 USDC 作为 Gas 消除汇率波动。' },
  { title: 'x402 协议落地：HTTP 原生付费重塑内容创作激励', thesis: 'HTTP 402 状态码沉睡三十年。' },
  { title: '数字分身伦理：碳基意图与硅基执行的博弈边界', thesis: '责任归属与意图溯源成为治理难题。' },
  { title: 'ERC-8183 标准引领 Agentic Commerce 自治商业浪潮', thesis: '标准化订单契约去除人类中介。' },
];

function sectionOrder(text: string): string[] {
  return (text.match(/^## .+$/gm) || []).map((s) => s.replace(/^## /, '').slice(0, 12));
}

function jaccard(a: string, b: string): number {
  const norm = (s: string) => s.replace(/\s+/g, '');
  const gram = (s: string) => {
    const n = norm(s);
    const set = new Set<string>();
    for (let i = 0; i < n.length - 3; i++) set.add(n.slice(i, i + 4));
    return set;
  };
  const A = gram(a);
  const B = gram(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

const docs = cases.map((c) => {
  const bp = classifyTitleDomain(c.title, c.thesis);
  const text = synthesizeArticle({ title: c.title, thesis: c.thesis, style: 'detailed', blueprint: bp, wordTarget: 2000 });
  return { c, bp, text, order: sectionOrder(text) };
});

console.log('══════ 章节顺序与相似度矩阵 ══════\n');
docs.forEach((d, i) => {
  console.log(`${i + 1}. ${d.c.title}`);
  console.log(`   领域: ${d.bp.domain}`);
  console.log(`   章节: ${d.order.join(' → ')}\n`);
});

console.log('══════ 两两相似度（4-gram Jaccard，越低越独特）══════');
let maxSim = 0;
for (let i = 0; i < docs.length; i++) {
  for (let j = i + 1; j < docs.length; j++) {
    const sim = jaccard(docs[i].text, docs[j].text);
    maxSim = Math.max(maxSim, sim);
    const flag = sim > 0.35 ? '⚠️ 偏高' : '✅ 可接受';
    console.log(`  [${i + 1}↔${j + 1}] 相似度 ${(sim * 100).toFixed(1)}% ${flag}`);
  }
}
console.log(`\n最高相似度: ${(maxSim * 100).toFixed(1)}% ${maxSim <= 0.35 ? '✅ 通过（无套路化）' : '❌ 仍有模板痕迹'}`);
