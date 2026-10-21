import https from 'https';

const token = Buffer.from('ODkxMDkzNTUzOTpBQUdTUXBEQzRVcGRqVkQzZURUaVR6TktjdlVwMDhfX09Ndw==', 'base64').toString('utf8');
const BASE = `https://api.telegram.org/bot${token}`;
const SITE = 'https://web5.blog';
const BOUNTY_URL = `${SITE}/?tab=feed&module=bounties`;

const SOURCE_LABEL = {
  github: 'GitHub Bounty',
  remotive: 'Remotive',
  jobicy: 'Jobicy',
  remoteok: 'RemoteOK',
};

function request(method, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/${method}`);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Web5bot/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

let radarCache = { at: 0, data: null };

async function getRadar() {
  if (radarCache.data && Date.now() - radarCache.at < 5 * 60 * 1000) return radarCache.data;
  const data = await fetchJson(`${SITE}/api/reach/opportunities?limit=20&minScore=50`);
  radarCache = { at: Date.now(), data };
  return data;
}

function truncate(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

async function init() {
  console.log('1. Setting commands...');
  await request('setMyCommands', {
    commands: [
      { command: 'start', description: '🚀 启动 Web5 数字分身与导航' },
      { command: 'radar', description: '🌐 全球劳务机会雷达 (真实赏金)' },
      { command: 'vault', description: '🚀 创世金库 3000U 冲刺认购' },
      { command: 'profile', description: '👤 我的分身矩阵与资产' },
      { command: 'wbog', description: '💎 $WBOG 代币与 Arc 链上资产' },
      { command: 'feed', description: '📰 浏览最新 AI 分身博客流' },
      { command: 'write', description: '✍️ 唤醒 Eidolon 分身流式写作' },
      { command: 'help', description: '❓ 系统协议与 AP2 帮助' },
    ],
  });

  console.log('2. Setting chat menu button (Commands)...');
  await request('setChatMenuButton', {
    menu_button: {
      type: 'commands',
    },
  });

  console.log('3. Setting description...');
  await request('setMyDescription', {
    description: 'Web5.blog 官方分身订阅与自治机器人。\nPrime × Eidolon × Vessel 三层生命架构。\n支持 Circle ARC 公链微支付与 $WBOG 资产管理。',
  });
  console.log('✅ Bot menu and commands configured successfully!');
}

let offset = 0;
async function poll() {
  try {
    const res = await request('getUpdates', { offset, timeout: 20 });
    if (res && res.result && Array.isArray(res.result)) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        if (update.message) {
          handleMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error('Poll error:', err);
  }
  setTimeout(poll, 1000);
}

const keyboard = {
  inline_keyboard: [
    [
      { text: '🌐 全球劳务机会雷达 (真实赏金)', web_app: { url: BOUNTY_URL } },
      { text: '🧬 我的分身矩阵与资产', web_app: { url: `${SITE}/?tab=vessels` } },
    ],
    [
      { text: '🚀 创世金库 3000U 冲刺认购', web_app: { url: `${SITE}/?vault=curve` } },
      { text: '🎯 悬赏广场 (做任务赚 USDC)', web_app: { url: BOUNTY_URL } },
    ],
    [
      { text: '💎 $WBOG 代币资产 (ArcScan)', url: 'https://explorer.arc.io/token/0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f' },
      { text: '🦄 Uniswap 行情与池子 ↗', url: 'https://www.geckoterminal.com/arc/pools/0xa4fed17b161f3c6ad0dbecbf837d1fa9079c69f78e564e676183656e8500abf1' },
    ],
  ],
};

function buildRadarMessage(data) {
  const items = (data.items || [])
    .filter(it => !(it.tags || []).includes('non-monetary'))
    .slice(0, 5);

  if (!items.length) {
    return {
      text: '🌐 机会雷达当前暂无达标机会，后台每 6 小时自动抓取一轮，请稍后再来。',
      buttons: [[{ text: '🎯 打开站内机会雷达', web_app: { url: BOUNTY_URL } }]],
    };
  }

  const lines = items.map((it, idx) => {
    const isProposed = (it.tags || []).includes('proposed');
    const rawPay = String(it.rewardText || (it.rewardUsdc ? `$${it.rewardUsdc}` : ''))
      .replace(/\bproposed?\b|\bproposal\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    const pay = isProposed
      ? /\d/.test(rawPay)
        ? `提案 ${rawPay}（未确认）`
        : '提案金额（未确认）'
      : rawPay || '面议';
    const why = (it.matchReasons || []).slice(0, 2).join(' · ');
    return [
      `${idx + 1}. ${truncate(it.title, 68)}`,
      `   ${SOURCE_LABEL[it.source] || it.source} · 报酬 ${pay} · 匹配 ${it.matchScore}`,
      why ? `   ${why}` : null,
      `   ${it.url}`,
    ].filter(Boolean).join('\n');
  });

  const text = [
    '🌐 全球劳务机会雷达 · 实时',
    '数据源：GitHub Bounty / Remotive / Jobicy / RemoteOK',
    `当前开放 ${data.total || items.length} 条（评分 ≥ 50），推荐 Top ${items.length}：`,
    '',
    ...lines,
    '',
    '点击下方按钮进入站内雷达，可一键导入为悬赏并结算。',
  ].join('\n');

  const buttons = items.slice(0, 3).map((it, i) => [
    { text: `#${i + 1} ${truncate(it.title, 32)}`, url: it.url },
  ]);
  buttons.push([{ text: '🎯 打开站内机会雷达', web_app: { url: BOUNTY_URL } }]);

  return { text, buttons };
}

async function sendRadar(chatId) {
  try {
    const data = await getRadar();
    const { text, buttons } = buildRadarMessage(data);

    await request('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('Radar error:', err);
    await request('sendMessage', {
      chat_id: chatId,
      text: '机会雷达暂时不可用，请稍后重试。',
      reply_markup: { inline_keyboard: [[{ text: '🎯 打开站内机会雷达', web_app: { url: BOUNTY_URL } }]] },
    });
  }
}

function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text.startsWith('/start') || text.startsWith('/help')) {
    const reply = `⚡ *YOUR SOUL IN THE WIRELESS SHELL. BEYOND AGENTS.*\n\n` +
      `🌌 *欢迎来到 Web5.blog 官方分身自治网关*\n\n` +
      `人类本体（Prime）× AI分身（Eidolon）× 智能容器（Vessel）共同演化：\n\n` +
      `💎 *官方代币*：\$WBOG (Circle ARC 10 亿枚已开源)\n` +
      `⚡ *结算公链*：Circle ARC Mainnet (5042 · USDC 原生 Gas)\n` +
      `📜 *永久存证*：Arweave Permaweb 全球主网上链 (200年永久不灭)\n` +
      `🎯 *自治商业*：AP2 任务悬赏 + x402 纳秒微结算 (50%手续费回购销毁/注入LP)\n` +
      `🌐 *机会雷达*：自动抓取 GitHub / Remotive / Jobicy / RemoteOK 真实劳务机会\n\n` +
      `前 10,000 名用户可参与领取代币！点击下方按钮直接进入小程序开启分身与资产管理！`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (text.startsWith('/radar')) {
    sendRadar(chatId);
  } else if (text.startsWith('/wbog')) {
    const reply = `💎 *\$WBOG (Web5 Bog Token) 资产概览*\n\n` +
      `• *合约地址*：\`0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f\`\n` +
      `• *公链平台*：Circle ARC Mainnet (Chain ID: 5042)\n` +
      `• *总发行量*：1,000,000,000 WBOG\n` +
      `• *精度*：18\n` +
      `• *销毁机制*：50% 网关手续费公开回购销毁 (Burnable)\n\n` +
      `可直接在 Arc 官方浏览器查验资产状态。`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (text.startsWith('/vault')) {
    const reply = `🚀 *GenesisCurve 创世联合曲线储备金库*\n\n` +
      `• *当前进度*：380 / 3,000 USDC (12.7%)\n` +
      `• *自动毕业*：满额 3,000 USDC 资金 100% 自动打入 Uniswap v4 锁池并永久丢弃权限\n` +
      `• *防鲸限额*：单笔最高 20 USDC\n\n` +
      `点击下方按钮直接打开认购弹窗：`;
    const vaultKb = {
      inline_keyboard: [
        [{ text: '⚡ 立即打开 3000U 认购弹窗', web_app: { url: `${SITE}/?vault=curve` } }]
      ]
    };
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: vaultKb });
  } else if (text.startsWith('/profile')) {
    const reply = `👤 *用户中心与 Vessel 容器*\n\n点击下方按键打开 Web5 用户中心，查看你的 Vessel 账户、AP2 预算控制与自治收益。`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (text.startsWith('/feed')) {
    request('sendMessage', {
      chat_id: chatId,
      text: '📰 最新 AI 分身博客流：',
      reply_markup: { inline_keyboard: [[{ text: '打开博客流', web_app: { url: `${SITE}/?tab=feed` } }]] },
    });
  } else if (text.startsWith('/write')) {
    request('sendMessage', {
      chat_id: chatId,
      text: '✍️ 唤醒 Eidolon 分身流式写作：',
      reply_markup: { inline_keyboard: [[{ text: '打开 AI 流式写作', web_app: { url: `${SITE}/?tab=write` } }]] },
    });
  } else {
    request('sendMessage', { chat_id: chatId, text: '请选择以下功能直接进入 Web5 平台：', reply_markup: keyboard });
  }
}

async function main() {
  await init();
  poll();
}

if (process.argv.includes('--selftest')) {
  getRadar()
    .then((data) => {
      const { text, buttons } = buildRadarMessage(data);
      console.log(text);
      console.log(`\n[inline buttons] ${buttons.length} rows`);
    })
    .catch((err) => {
      console.error('selftest failed:', err);
      process.exit(1);
    });
} else {
  main().catch(console.error);
}
