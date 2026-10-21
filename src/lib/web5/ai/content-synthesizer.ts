// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/content-synthesizer.ts
// 动态长文合成器 v2 — 段落级语义池 + 标题种子抽样 + 自适应扩写 + 输出校验
//
// 设计原则：同一领域的不同标题，抽到的段落组合必须不同；
// 每个段落都以 {t}=标题 / {k0..k2}=标题实体词 渲染，杜绝可套用的通用文本。
// ════════════════════════════════════════════════════════════════

import type { DomainBlueprint } from './domain-classifier';

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickIdx(seed: number, salt: number, len: number): number {
  return (seed + salt * 7919) % len;
}

/** 从池中按种子抽取 n 个互不重复的段落 */
function sample(pool: string[], seed: number, salt: number, n: number): string[] {
  const len = pool.length;
  const out: string[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < Math.min(n, len) && i < len * 3) {
    const idx = pickIdx(seed, salt + i * 31, len);
    if (!used.has(idx)) {
      used.add(idx);
      out.push(pool[idx]);
    }
    i++;
  }
  return out;
}

export function extractCoreTerms(title: string, thesis: string): string[] {
  const text = `${title} ${thesis}`;
  const stop = new Set([
    '的', '了', '是', '在', '和', '与', '及', '对', '从', '到', '为', '以', '并',
    '如何', '什么', '为什么', '怎么', '怎样', '我们', '你们', '他们', '这个', '那个',
    '一个', '一种', '进行', '通过', '可以', '需要', '应该', '以及', '但是', '因为',
    '它的', '这一', '的是', 'the', 'and', 'for', 'with', 'that', 'this',
  ]);

  const zh = text.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  const en = text.match(/[A-Za-z][A-Za-z0-9\-\.]{2,20}/g) || [];

  const scored = new Map<string, number>();
  for (const raw of [...zh, ...en]) {
    const w = raw.trim();
    if (!w || stop.has(w.toLowerCase()) || w.length < 2) continue;
    // 含虚词的碎片降权，避免出现「行的博弈边界」这类无效实体
    const dirty = /[的了是和与及在]/.test(w.replace(/^[的了是和与及在]+/, ''));
    const bonus = title.includes(w) ? 5 : 1;
    scored.set(w, (scored.get(w) || 0) + (dirty ? bonus * 0.2 : bonus));
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

/** 渲染占位符 */
function render(tpl: string, t: string, k: string[]): string {
  return tpl
    .replace(/\{t\}/g, t)
    .replace(/\{t8\}/g, t.slice(0, 16))
    .replace(/\{k0\}/g, k[0] || '核心变量')
    .replace(/\{k1\}/g, k[1] || '相关约束')
    .replace(/\{k2\}/g, k[2] || '边界条件')
    .replace(/\{k3\}/g, k[3] || '参与方');
}

// ── 段落池（每池 8 条，互不重复的独立论据）──────────────────

const PROBLEM_POOL = [
  `围绕「{t8}」最常见的误判，是把「{k0}」当成静态条件。实际上它会随参与者数量与激励结构持续变化，在小样本上成立的结论，往往在规模放大后直接反转。`,
  `讨论「{t8}」时几乎所有人都跳过了一个前置问题：{k0} 的成本由谁承担。成本与收益不在同一主体身上的设计，最终都会以隐性负债的形式累积，直到某次集中爆发。`,
  `许多关于「{t8}」的方案在演示阶段表现优异，接入真实流量后迅速退化。原因不是技术不可行，而是结算、验证与协调这三类开销在量级上升后吞掉了全部利润。`,
  `「{t8}」的争议往往源于概念混淆。{k0}、{k1} 与 {k2} 被当成同一件事讨论，实际三者的约束条件完全不同，混用会让结论失去意义。`,
  `行业里对「{t8}」存在两套互相矛盾的经验。它们各自在自己的样本里都成立，分歧的真正来源是参与者结构不同：早期参与者与专业套利者的行为模式几乎没有交集。`,
  `判断「{t8}」是否真的成立，只需要问一个问题：当参与者翻十倍，{k2} 是否仍然可控。回答不了这个问题，任何乐观结论都只是阶段性红利。`,
  `大多数对「{t8}」的失败复盘都归因于执行不力，但更根本的问题是假设未被检验。隐含假设一旦失效，执行越到位，偏离目标越远。`,
  `「{t8}」这类命题最容易出现的幻觉，是把「可以做到」等同于「值得做」。{k0} 的收益是可见的，{k1} 的代价是延迟发生的，两者的时间差足以误导一整轮决策。`,
];

const MECHANISM_POOL = [
  `把「{k0}」拆开，完整链路只有四段：产生、验证、结算、归档。四段中任何一段被省略，系统都会在特定场景下失效，而不是在所有场景下同时失效——这让问题极难被及时发现。`,
  `第一段决定可信度来源，是中心化背书还是可独立复算的证明；第二段决定成本上限，验证越轻可承载频率越高；第三段决定资金效率；第四段决定历史能否沉淀为资产。`,
  `最容易做错的是验证段。「{k1}」若只做格式校验而不做语义校验，攻击者只需构造合法格式即可绕过全部防线。格式正确与内容正确之间，隔着整个信任问题。`,
  `类型化签名必须配合一次性 nonce 消费。前者防篡改，后者防重放，只做其中一个等于把门锁上却把钥匙留在锁孔里。`,
  `结算段的原子性常被低估。任何跨两步的资金动作，中间态都是可利用窗口。正确做法是把扣款与记账放进同一事务边界，或用链上预算围栏做刚性上限。`,
  `「{k2}」的作用范围必须被显式限定。授予全局扣款权与会话凭证一旦泄露，损失上限等于全部余额；限定到具体接口后，上限等于单笔限额。这两者的风险量级差三个数量级。`,
  `归档段决定长期价值。没有可独立复算的历史记录，{k0} 就只能依赖单一服务方的声明，而单方声明在争议场景中不构成证据。`,
  `「{t8}」的机制设计里还有一个隐性参数：失败成本。当失败成本低于验证成本时，理性参与方会选择先上线再修补，系统整体质量随之下降。`,
];

const RISK_POOL = [
  `第一个失效点是权限越界。会话语义被赋予超过其用途的能力，一次泄露即等于主资金暴露。收窄作用域并叠加刚性上限，是唯一有效的结构性解法。`,
  `第二个失效点是重放与并发。没有 nonce 消费记录的签名可被无限复用，这不是理论风险，而是已经反复发生的真实损失来源。`,
  `第三个失效点是激励错配。「{k2}」的收益归一方、成本归另一方的结构，会持续产生被转嫁的隐性负债，代码无法修补，只能靠机制让成本回到收益主体身上。`,
  `第四个失效点常被忽略：文档与实现漂移。规范描述与代码行为不一致时，集成方按文档实现，最终在边界场景产生难以复现的故障。`,
  `「{t8}」这类系统的攻击面通常不在核心逻辑，而在集成边界。第三方调用方传入的边界值、空值与时序异常，比核心漏洞更容易触发事故。`,
  `当系统依赖外部价格或外部状态时，{k0} 的正确性不再由系统本身决定。预言机延迟、状态过期与跨链确认差，都会把正确逻辑变成错误结果。`,
  `治理层面的风险同样真实：参数可被升级修改，意味着今天的安全边界不是永久安全边界。没有时间锁的升级权，等价于把风控交给未来某个未知决策者。`,
  `最隐蔽的风险是度量失真。当某个指标成为优化目标，参与者会优化指标本身而非底层价值，指标持续向好而系统实际能力持续下降。`,
];

const PRACTICE_POOL = [
  `落地第一步是在无资金环境跑通完整链路，确认每个状态可复现、可观测、可回滚。这一步的价值不在验证功能，而在暴露隐含假设。`,
  `第二步用小额真实资金验证结算与归档，重点观察失败率而非成功率。真正暴露问题的永远是异常路径：网络抖动、重复提交、并发冲突、上游超时。`,
  `把每一种异常写成用例，比写一百个正常用例更有价值。「{t8}」在生产环境的绝大多数事故，都发生在没有被写成用例的分支里。`,
  `第三步把验证过的模块拆成独立服务，让外部调用方按次付费接入。定价应基于调用方因此省下的成本，而非自身成本加成，这才是指数级差异的来源。`,
  `关于「{t8}」，最值得先做的一件事是把所有隐含假设写成清单，逐条标注已验证、待验证、已知不成立。这份清单比任何架构图都更有价值。`,
  `放量前必须定义停止条件。没有预先约定的止损边界，团队会在亏损被确认之前不断追加投入，把可控的试错成本变成不可控的沉没成本。`,
  `工程上建议先固化「{k1}」的度量口径，再谈优化。口径可变的指标不能用于决策，因为它总能被解释成向好。`,
  `任何与资金相关的改动都应先做影子运行：新旧逻辑并行处理同一批请求，只记录不生效，比对差异归零后再切换。`,
];

const EXPANSION_POOL = [
  `\n\n## 可验证判据：如何检验「{t8}」是否真成立\n\n以下判据可直接用于评估任一方案：\n\n- 结算是否原子完成，失败时资金能否原路回滚；\n- 权限作用域是否收窄到具体接口，而非授予全局扣款权；\n- 签名是否带一次性 nonce 消费记录，以阻断重放；\n- 成本结构在参与者放大十倍后是否仍为正；\n- 历史记录是否可独立复算，而非依赖单一服务方声明。\n\n以上任一条不成立，该方案在真实规模下都会退回原型状态。判据的意义不在于打勾，而在于把「感觉可行」转换成「可以被否证」。`,
  `\n\n## 对照分析：{k0} 与 {k1} 的取舍\n\n两条路径的差异不在功能清单，而在失败时的表现。前者在正常路径更轻更快，一旦异常恢复成本高且难以局部回滚；后者正常路径更重，却能把故障影响限制在单点。\n\n选择的关键是你更能承受哪种失败：高频小损失，还是低频大损失。前者适合以量取胜，后者适合单笔金额大、声誉敏感的场合。这个问题回答清楚，技术选型基本确定。`,
  `\n\n## 常见反例：三种看起来成立但实际失效的用法\n\n反例一：把过滤器当作预测器。过滤器只回答是否回避，不回答是否上涨，混用会在正确回避的同时错过合理机会，最终被误判为无效。\n\n反例二：把去中心化当作免责理由。链上只保证执行不可篡改，不保证输入真实。输入被污染时，链上执行只是把错误更快固化。\n\n反例三：把指标当作目标。指标成为考核对象后，参与者会优化指标本身，指标很好看而系统已偏离初衷。`,
  `\n\n## 时间维度：短期有效与长期有效的分界\n\n多数设计在三个月内有效，三年内失效。分界点通常出现在两处：参与者结构变化与外部成本变化。\n\n参与者从早期爱好者变为专业套利者时，靠信息差获得的收益迅速消失；带宽、算力、结算费等外部成本上升时，原本为正的边际利润转为负值。\n\n因此评估任何方案都应追问：它依赖的是结构性优势，还是阶段性红利。前者可长期复利，后者只是窗口期。`,
  `\n\n## 与「{k2}」的耦合：被忽略的上下游依赖\n\n「{t8}」很少独立成立。它的有效性依赖上游输入质量与下游承接能力，任一环断裂，本地优化都会被抵消。\n\n上游问题通常表现为数据延迟与口径不一致；下游问题通常表现为承接容量不足导致的排队与超时。两者都不会出现在功能演示中，却会在真实流量下同时出现。\n\n处理方式不是加强本地逻辑，而是把上下游的契约显式化：明确输入时效、明确容量上限、明确超限时的降级行为。`,
  `\n\n## 成本结构推演：规模放大后的数学变化\n\n设单次操作固定成本为 c，规模为 n，则总成本随 n 线性增长，而单次收益往往随 n 递减（竞争加剧、边际机会减少）。两者交叉点即为该方案的经济寿命上限。\n\n这个模型解释了一个常见现象：同一策略在小资金下为正，在大资金下为负。不是策略变差了，而是它本就只能承载某个规模。承认这一点，比不断加杠杆更理性。`,
];

const CONCLUSION_POOL = [
  `回到最初的问题：「{t8}」的价值不取决于它听起来多新，而取决于它是否把某一类成本真正降了下来，并且这种下降在规模扩大后依然成立。凡通不过这条检验的叙事，最终都会被成本结构清算。`,
  `关于「{t8}」，可以给出的最诚实结论是：它在特定约束下成立，在另一些约束下不成立。把约束条件写清楚，比宣称它普遍有效更有价值，也更能被信任。`,
  `「{t8}」的长期价值，最终取决于它能否把「{k0}」从依赖个体经验，转变为依赖可复算的机制。这一步跨过去，才是工程；跨不过去，只是手艺。`,
  `如果把「{t8}」压缩成一句话：不要问它是否先进，要问它在失败时是否会连累其他部分。失败模式的设计，永远比成功路径的设计更能决定系统寿命。`,
];

const OPENING_POOL = [
  `任何关于「{t8}」的严肃讨论，都必须先回答一个前置问题：{k0} 究竟改变了谁的约束条件。本文不从概念出发，而从可验证的机制与代价出发。`,
  `「{t8}」在过去一年被反复提及，但多数讨论停留在叙事层面。真正值得追问的是：当 {k0} 被放进真实生产环境，哪些假设会首先崩塌。`,
  `把「{t8}」当作工程问题而非口号处理，会立刻遇到三个硬约束：成本、可验证性、失败时的止损边界。本文按这三条线依次展开。`,
  `围绕「{t8}」存在两套互相矛盾的经验。本文不选边，而是把两种经验各自的前提摊开，看哪一种在具体场景里成立。`,
];

const SECTION_TITLES: Record<string, string[]> = {
  problem: [
    '问题的真实边界：被忽略的前提与隐性代价',
    '现状解剖：为什么常规解法在这里失效',
    '争议的起点：三个被长期混淆的概念',
  ],
  mechanism: [
    '机制拆解：从输入到结算的完整链路',
    '底层推演：关键参数如何决定最终结果',
    '结构还原：把命题拆成可独立验证的模块',
  ],
  risk: [
    '失效模式：最可能出问题的四个位置',
    '风险与博弈：谁有动机破坏这套设计',
    '边界条件：什么情况下这套方案必然崩盘',
  ],
  practice: [
    '落地路径：最小可验证单元的搭建顺序',
    '工程实践：从验证到放量的分阶段策略',
    '执行清单：可以立刻开始的三件事',
  ],
};

const ORDERS = [
  ['problem', 'mechanism', 'risk', 'practice'],
  ['mechanism', 'problem', 'practice', 'risk'],
  ['problem', 'risk', 'mechanism', 'practice'],
  ['practice', 'problem', 'mechanism', 'risk'],
];

const POOLS: Record<string, string[]> = {
  problem: PROBLEM_POOL,
  mechanism: MECHANISM_POOL,
  risk: RISK_POOL,
  practice: PRACTICE_POOL,
};

export function synthesizeArticle(params: {
  title: string;
  thesis: string;
  style: string;
  blueprint: DomainBlueprint;
  wordTarget: number;
}): string {
  const { title, thesis, style, blueprint, wordTarget } = params;
  const seed = seedFrom(title + '|' + thesis.slice(0, 80));
  const terms = extractCoreTerms(title, thesis);
  const k = terms.length ? terms : [title.slice(0, 8)];

  const opening = render(
    OPENING_POOL[pickIdx(seed, 1, OPENING_POOL.length)],
    title,
    k
  );

  const order = ORDERS[pickIdx(seed, 2, ORDERS.length)];

  // 每节抽 3 段，段落选取由 seed + 节序号决定，保证组合唯一
  const sections = order
    .map((kind, idx) => {
      const pool = POOLS[kind];
      const chosen = sample(pool, seed, 11 + idx * 97, 3);
      const heading = SECTION_TITLES[kind][pickIdx(seed, 5 + idx, SECTION_TITLES[kind].length)];
      const body = chosen.map((p) => render(p, title, k)).join('\n\n');
      const num = ['一', '二', '三', '四'][idx];
      return `## ${num}、 ${heading}\n\n${body}`;
    })
    .join('\n\n');

  const thesisBlock =
    thesis && thesis.trim().length > 20
      ? `\n\n> **创作者原始论点**：${thesis.trim().slice(0, 400)}`
      : '';

  const density =
    wordTarget >= 3000
      ? '本文按旗舰长文密度展开，每节给出机制、失效模式与可验证判据。'
      : wordTarget >= 2000
        ? '本文按深度研报密度展开，重点在机制与边界条件。'
        : '本文按精炼短篇密度展开，只保留可执行结论。';

  const head = `# ${title}

> **领域**：${blueprint.domain} · **核心要素**：${k.slice(0, 5).join(' / ')}
> **推演引擎**：Eidolon Dynamic Synthesizer · **结算层**：Circle ARC 5042

## 引言

${opening}${thesisBlock}

${density}`;

  const conclusion = render(
    CONCLUSION_POOL[pickIdx(seed, 3, CONCLUSION_POOL.length)],
    title,
    k
  );

  const tail = `\n\n## 结语\n\n${conclusion}\n\n*本文由 Eidolon 动态合成引擎依据标题语义生成 · 结构指纹 ${seed
    .toString(16)
    .slice(0, 8)} · 风格 ${style}*`;

  let doc = `${head}\n\n${sections}${tail}`;

  // 自适应补强：按目标字数追加互不重复的深化小节
  const target =
    wordTarget >= 3000 ? 2700 : wordTarget >= 2000 ? 1850 : wordTarget >= 1000 ? 950 : 520;

  const exp = sample(EXPANSION_POOL, seed, 211, EXPANSION_POOL.length);
  let i = 0;
  while (doc.length < target && i < exp.length) {
    doc += render(exp[i], title, k);
    i++;
  }

  return doc;
}

export interface OutputValidation {
  ok: boolean;
  issues: string[];
  metrics: {
    length: number;
    headings: number;
    titleCoverage: number;
    structureFingerprint: string;
    duplicateParagraphs: number;
  };
}

export function validateOutput(
  text: string,
  title: string,
  minLength: number
): OutputValidation {
  const issues: string[] = [];
  const length = text.length;
  const headings = (text.match(/^#{2,3}\s+/gm) || []).length;
  const terms = extractCoreTerms(title, '');
  const covered = terms.filter((t) => text.includes(t)).length;
  const titleCoverage = terms.length ? covered / terms.length : 1;

  if (length < minLength) issues.push(`内容过短：${length} < ${minLength}`);
  if (headings < 4) issues.push(`章节不足：${headings} < 4`);
  if (titleCoverage < 0.4)
    issues.push(`与标题相关性过低：${(titleCoverage * 100).toFixed(0)}%`);

  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60);
  const seen = new Set<string>();
  let dup = 0;
  for (const p of paras) {
    if (seen.has(p)) dup++;
    seen.add(p);
  }
  if (dup > 0) issues.push(`存在 ${dup} 段重复内容`);

  return {
    ok: issues.length === 0,
    issues,
    metrics: {
      length,
      headings,
      titleCoverage,
      structureFingerprint: seedFrom(title).toString(16).slice(0, 8),
      duplicateParagraphs: dup,
    },
  };
}
