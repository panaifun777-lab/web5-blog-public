import { classifyTitleDomain } from '../src/lib/web5/ai/domain-classifier';
import {
  synthesizeArticle,
  validateOutput,
  seedFrom,
} from '../src/lib/web5/ai/content-synthesizer';

const cases = [
  {
    title: 'Circle ARC 稳定币公链测试网与主网生态爆发',
    thesis: 'Circle ARC 原生 USDC 作为 Gas 消除了机器微支付的汇率波动风险，18 位精度支持纳秒级计费。',
    style: 'detailed',
    wordTarget: 2000,
  },
  {
    title: '数字分身伦理：碳基意图与硅基执行的博弈边界',
    thesis: '当 AI 分身拥有独立经济能力后，责任归属与意图溯源成为核心治理难题。',
    style: 'academic',
    wordTarget: 3000,
  },
  {
    title: 'ERC-8183 标准引领 Agentic Commerce 自治商业浪潮',
    thesis: '标准化订单契约让智能体之间的商业协作不再依赖人类中介审核。',
    style: 'concise',
    wordTarget: 1000,
  },
  {
    title: 'x402 协议落地：HTTP 原生付费重塑内容创作激励',
    thesis: 'HTTP 402 状态码沉睡三十年，稳定币微支付让它重新具备工程意义。',
    style: 'casual',
    wordTarget: 2000,
  },
  {
    title: '收集并穿透 50 个高频 Pump.fun 集群钱包特征签名（防守 B 线）',
    thesis: '集群钱包主导拉砸，散户在信息与执行速度上双重劣势，需要过滤器而非预测模型。',
    style: 'detailed',
    wordTarget: 2000,
  },
];

function minLen(w: number) {
  return w >= 3000 ? 2600 : w >= 2000 ? 1800 : w >= 1000 ? 900 : 500;
}

const results: Array<{ title: string; domain: string; len: number; headings: number; fp: string; head: string; ok: boolean; issues: string[] }> = [];

for (const c of cases) {
  const bp = classifyTitleDomain(c.title, c.thesis);
  const text = synthesizeArticle({
    title: c.title,
    thesis: c.thesis,
    style: c.style,
    blueprint: bp,
    wordTarget: c.wordTarget,
  });
  const v = validateOutput(text, c.title, minLen(c.wordTarget));
  const firstHeading = (text.match(/^## .+$/m) || [''])[0];
  results.push({
    title: c.title,
    domain: bp.domain,
    len: v.metrics.length,
    headings: v.metrics.headings,
    fp: v.metrics.structureFingerprint,
    head: firstHeading,
    ok: v.ok,
    issues: v.issues,
  });
}

console.log('══════ 差异化与校验测试 ══════');
for (const r of results) {
  console.log(`\n标题: ${r.title}`);
  console.log(`  领域: ${r.domain}`);
  console.log(`  长度: ${r.len} | 章节: ${r.headings} | 结构指纹: ${r.fp}`);
  console.log(`  首个章节: ${r.head}`);
  console.log(`  校验: ${r.ok ? '✅ 通过' : '❌ ' + r.issues.join('; ')}`);
}

// 唯一性检查
const fps = new Set(results.map((r) => r.fp));
const heads = new Set(results.map((r) => r.head));
console.log('\n══════ 唯一性统计 ══════');
console.log(`样本数: ${results.length}`);
console.log(`唯一结构指纹: ${fps.size}`);
console.log(`唯一首章节标题: ${heads.size}`);
console.log(`校验通过数: ${results.filter((r) => r.ok).length}/${results.length}`);

if (fps.size < results.length) {
  console.log('\n⚠️ 存在结构指纹碰撞，需要增加结构变体维度');
} else {
  console.log('\n✅ 所有标题结构指纹唯一，无套路化重复');
}
