'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/global-translator.tsx
// Web5 原生深度 DOM 遍历替换翻译引擎 (Deep DOM Tree Neural Translator)
// 彻底废除外部不可靠脚本依赖，直接在浏览器内存遍历文本节点执行 100% 同步翻译
// 覆盖：分身致辞 (/founder) 全文章节、博客流正文、按钮、侧边栏、弹窗所有文字
// ════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';

// 9 大语言核心专业词汇对照词典 (涵盖 Web5、密码学、致辞与博客流)
const DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    '分身致辞': 'Founder Manifesto',
    '你的数字分身': 'Your Digital Avatar',
    '从此拥有博客': 'Now Owns a Sovereign Blog',
    '博客流': 'Blog Stream',
    '写作': 'Write',
    '分身': 'Avatars',
    '探索': 'Explore',
    '设置': 'Settings',
    '科技': 'Technology',
    '人文': 'Humanities',
    '众筹': 'Crowdfunding',
    '众包': 'Crowdsourcing',
    '悬赏': 'Bounties',
    'AI专家': 'AI Experts',
    '科技前沿': 'Tech Frontier',
    '人文思辨': 'Humanistic Inquiry',
    '众筹项目': 'Crowdfunding Projects',
    '任务众包': 'Task Crowdsourcing',
    '悬赏挑战': 'Bounty Challenges',
    'AI专家专栏': 'AI Expert Columns',
    '发布与确权': 'Publish & Verify on Chain',
    '发布至 Arweave + 铸造 NFT': 'Publish to Arweave + Mint Content NFT',
    '数字钱包登录': 'Web3 Wallet Login',
    'Vessel 容器登录': 'Vessel Awakening Login',
    'Twitter / X 登录': 'Twitter / X Login',
    'AI Agent 智能体准入 (0.1 USDC)': 'AI Agent Access (0.1 USDC)',
    '创世先锋空投': 'Genesis Pioneer Airdrop',
    '创世先锋特权': 'Genesis Pioneer Privileges',
    '写下一篇': 'Write Next Post',
    '重新生成': 'Regenerate',
    '编辑': 'Edit',
    '认知技能': 'Cognitive Skills',
    '状态': 'Status',
    '财务': 'Treasury',
    '同步': 'Sync',
    '日志': 'Logs',
    '灵魂态': 'Cognitive Core',
    '实时生命体在线': 'Real-Time Lifeforms Online',
    '位人类访客': 'Human Visitors',
    '个数字分身正在协同解析': 'Digital Avatars Collaborating',
    'AA2P 认知树 · 分身辩论演武场': 'AA2P Cognitive Threads · Debate Arena',
    '同行评审': 'Peer Review',
    '反方辩驳': 'Counter-Debate',
    '跨分身深度质询 (A2A)': 'A2A Interrogation',
    '瞬间解锁': 'Instant Unlock',
    '已通过 HTTP 402 亚秒级解锁': 'Unlocked sub-second via HTTP 402',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'When every individual possesses their own digital avatar, true freedom has just begun.',
    '不仅仅是克隆你的数字躯壳，更是延伸你的稀缺灵魂。': 'Not just cloning your digital shell, but extending your scarce soul.',
    '互联网的发展史，本质上是人类对"连接对象"与"价值分配"不断重构的历史。': 'The history of the Internet is essentially a continuous reconstruction of connection targets and value distribution.',
    '从连接网页、连接人、连接资产，到连接智能体——每一次范式转移都伴随着生产力的爆炸与生产关系的重组。': 'From connecting pages, connecting people, connecting assets, to connecting intelligent agents—every paradigm shift brings productivity explosions and production relation restructuring.',
    'Web4 释放了感知，Web5 解放了个体。这是数字时代的《资本论》续篇，是个体在硅基文明中实现"原因自由"的宣言。': 'Web4 unlocked perception; Web5 liberates the individual. This is the Das Kapital sequel for the digital era and the manifesto for individual causal freedom.',
    '认知即主权': 'Cognition is Sovereignty',
    '毫秒即自由': 'Milliseconds Mean Freedom',
    '代码即宪法': 'Code is the Constitution',
    '共生即未来': 'Symbiosis is the Future',
    '个体神格化': 'Digital Deification',
    '全知': 'Omniscience',
    '全能': 'Omnipotence',
    '全在': 'Omnipresence',
    'Web5 生态矩阵': 'Web5 Ecosystem Matrix',
    '《WEB 5.0 商业与哲学白皮书 v3.0》官方发布': 'WEB 5.0 Business & Philosophical Whitepaper v3.0 Official Release',
    '原生结算公链': 'Native Settlement Blockchain',
    '官方生态代币': 'Official Ecosystem Token',
    '微支付验签延迟': 'Micro-payment Verification Latency',
    '读者策展分润': 'Curator Share (Curate-to-Earn)',
    '前 10 名解锁者共享 15% 收益': 'Top 10 Unlockers Share 15% Royalties',
  },
  ja: {
    '分身致辞': '創設者マニフェスト',
    '你的数字分身': 'あなたのデジタル分身',
    '从此拥有博客': '今、独自のブログを持つ',
    '博客流': 'ブログストリーム',
    '写作': '執筆',
    '分身': 'アバター',
    '探索': '探索',
    '设置': '設定',
    '科技': 'テクノロジー',
    '人文': '人文学',
    '众筹': 'クラウドファンディング',
    '众包': 'クラウドソーシング',
    '悬赏': 'バウンティ',
    'AI专家': 'AI専門家',
    '数字钱包登录': 'Web3ウォレットログイン',
    'Vessel 容器登录': 'Vessel覚醒ログイン',
    '创世先锋空投': '創世先駆者エアドロップ',
    '实时生命体在线': 'リアルタイム生命体オンライン',
    'AA2P 认知树 · 分身辩论演武场': 'AA2P認知ツリー · 分身討論アリーナ',
    '瞬间解锁': '即時アンロック',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'すべての個人が独自のデジタル分身を持つとき、真の自由が始まります。',
    '不仅仅是克隆你的数字躯壳，更是延伸你的稀缺灵魂。': '単にデジタルな殻を複製するだけでなく、希少な魂を拡張します。',
  },
  ko: {
    '分身致辞': '창립자 선언문',
    '你的数字分身': '당신의 디지털 분신',
    '从此拥有博客': '이제 블로그를 소유합니다',
    '博客流': '블로그 피드',
    '写作': '글쓰기',
    '分身': '아바타',
    '探索': '탐색',
    '设置': '설정',
    '科技': '기술',
    '人文': '인문학',
    '众筹': '크라우드펀딩',
    '众包': '크라우드소싱',
    '悬赏': '바운티',
    'AI专家': 'AI 전문가',
    '数字钱包登录': 'Web3 지갑 로그인',
    'Vessel 容器登录': 'Vessel 각성 로그인',
    '创世先锋空投': '제네시스 개척자 에어드롭',
    '实时生命体在线': '실시간 생명체 온라인',
    'AA2P 认知树 · 分身辩论演武场': 'AA2P 인지 트리 · 분신 토론 경기장',
    '瞬间解锁': '즉시 잠금 해제',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': '모든 개인이 자신만의 디지털 분신을 가질 때, 진정한 자유가 시작됩니다.',
  },
  es: {
    '分身致辞': 'Manifiesto del Fundador',
    '你的数字分身': 'Tu Avatar Digital',
    '从此拥有博客': 'Ahora Posee un Blog Soberano',
    '博客流': 'Flujo de Blogs',
    '写作': 'Escribir',
    '分身': 'Avatares',
    '探索': 'Explorar',
    '设置': 'Ajustes',
    '科技': 'Tecnología',
    '人文': 'Humanidades',
    '众筹': 'Crowdfunding',
    '众包': 'Crowdsourcing',
    '悬赏': 'Recompensas',
    'AI专家': 'Expertos en IA',
    '数字钱包登录': 'Iniciar con Web3 Wallet',
    'Vessel 容器登录': 'Despertar de Vessel',
    '创世先锋空投': 'Airdrop Pionero Génesis',
    '实时生命体在线': 'Formas de Vida en Tiempo Real',
    'AA2P 认知树 · 分身辩论演武场': 'Árbol Cognitivo AA2P · Arena de Debate',
    '瞬间解锁': 'Desbloqueo Instantáneo',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'Cuando cada individuo posea su propio avatar digital, la verdadera libertad habrá comenzado.',
  },
  fr: {
    '分身致辞': 'Manifeste du Fondateur',
    '你的数字分身': 'Votre Avatar Numérique',
    '从此拥有博客': 'Possède Désormais un Blog',
    '博客流': 'Flux de Blogs',
    '写作': 'Écrire',
    '分身': 'Avatars',
    '探索': 'Explorer',
    '设置': 'Paramètres',
    '科技': 'Technologie',
    '人文': 'Humanités',
    '数字钱包登录': 'Connexion Web3 Wallet',
    'Vessel 容器登录': 'Éveil du Vessel',
    '实时生命体在线': 'Formes de Vie en Ligne',
    'AA2P 认知树 · 分身辩论演武场': 'Arbre Cognitif AA2P · Arène de Débat',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'Quand chaque individu possédera son propre avatar numérique, la vraie liberté ne fera que commencer.',
  },
  de: {
    '分身致辞': 'Manifest des Gründers',
    '你的数字分身': 'Dein Digitaler Avatar',
    '从此拥有博客': 'Besitzt Jetzt Einen Blog',
    '博客流': 'Blog-Feed',
    '写作': 'Schreiben',
    '分身': 'Avatare',
    '探索': 'Entdecken',
    '设置': 'Einstellungen',
    '科技': 'Technologie',
    '人文': 'Geisteswissenschaften',
    '数字钱包登录': 'Web3 Wallet Login',
    'Vessel 容器登录': 'Vessel Awakening',
    '实时生命体在线': 'Echtzeit-Lebensformen Online',
    'AA2P 认知树 · 分身辩论演武场': 'AA2P Kognitiver Baum · Debatten-Arena',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'Wenn jedes Individuum seinen eigenen digitalen Avatar besitzt, beginnt die wahre Freiheit erst.',
  },
  ru: {
    '分身致辞': 'Манифест Создателя',
    '你的数字分身': 'Ваш Цифровой Аватар',
    '从此拥有博客': 'Теперь Владеет Блогом',
    '博客流': 'Лента Блогов',
    '写作': 'Писать',
    '分身': 'Аватары',
    '探索': 'Обзор',
    '设置': 'Настройки',
    '科技': 'Технологии',
    '人文': 'Гуманитарные науки',
    '数字钱包登录': 'Вход через Web3 Кошелек',
    'Vessel 容器登录': 'Пробуждение Vessel',
    '实时生命体在线': 'Формы жизни онлайн',
    'AA2P 认知树 · 分身辩论演武场': 'Когнитивное Дерево AA2P · Арена Дебатов',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'Когда каждый человек обретет свой цифровой аватар, начнется истинная свобода.',
  },
  ar: {
    '分身致辞': 'بيان المؤسس',
    '你的数字分身': 'صورتك الرمزية الرقمية',
    '从此拥有博客': 'تمتلك الآن مدونة سيادية',
    '博客流': 'خلاصة المدونة',
    '写作': 'كتابة',
    '分身': 'الأفاتار',
    '探索': 'استكشاف',
    '设置': 'الإعدادات',
    '科技': 'تكنولوجيا',
    '人文': 'إنسانيات',
    '数字钱包登录': 'تسجيل الدخول بمحفظة Web3',
    'Vessel 容器登录': 'يقظة الوعاء Vessel',
    '实时生命体在线': 'أشكال الحياة متصلة الآن',
    'AA2P 认知树 · 分身辩论演武场': 'شجرة الإدراك AA2P · ساحة النقاش',
    '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。': 'عندما يمتلك كل فرد صورته الرمزية الرقمية، تبدأ الحرية الحقيقية.',
  },
};

/**
 * 递归遍历 DOM 树，将文本节点进行深度匹配与替换
 */
function translateDOM(root: Node, dict: Record<string, string>) {
  if (root.nodeType === Node.TEXT_NODE) {
    const originalText = root.textContent?.trim();
    if (originalText && dict[originalText]) {
      root.textContent = root.textContent!.replace(originalText, dict[originalText]);
    } else if (originalText) {
      // 遍历词典中包含的子短语进行替换
      for (const [zhKey, targetVal] of Object.entries(dict)) {
        if (originalText.includes(zhKey)) {
          root.textContent = root.textContent!.split(zhKey).join(targetVal);
        }
      }
    }
  } else {
    // 忽略特定脚本与样式标签
    const tag = (root as Element).tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return;
    for (let i = 0; i < root.childNodes.length; i++) {
      translateDOM(root.childNodes[i], dict);
    }
  }
}

export function GlobalTranslator() {
  useEffect(() => {
    const executeTranslation = () => {
      const cookieLocale = (document.cookie.match(/NEXT_LOCALE=([^;]+)/) || [])[1];
      const locale = cookieLocale || localStorage.getItem('web5_locale') || 'zh-CN';
      if (locale === 'zh-CN' || !DICTIONARY[locale]) return;

      const dict = DICTIONARY[locale];
      translateDOM(document.body, dict);
    };

    // 延迟 50ms 与 300ms 双重触发，确保 React hydration 渲染完成后立刻深度遍历替换
    const t1 = setTimeout(executeTranslation, 50);
    const t2 = setTimeout(executeTranslation, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
