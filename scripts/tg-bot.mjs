import https from 'https';

const token = Buffer.from('ODkxMDkzNTUzOTpBQUdTUXBEQzRVcGRqVkQzZURUaVR6TktjdlVwMDhfX09Ndw==', 'base64').toString('utf8');
const BASE = `https://api.telegram.org/bot${token}`;

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

async function init() {
  console.log('1. Setting commands...');
  await request('setMyCommands', {
    commands: [
      { command: 'start', description: '🚀 启动 Web5 数字分身与导航' },
      { command: 'profile', description: '👤 用户中心与 Vessel 容器状态' },
      { command: 'wbog', description: '💎 $WBOG 代币与 Arc 链上资产' },
      { command: 'feed', description: '📰 浏览最新 AI 分身博客流' },
      { command: 'write', description: '✍️ 唤醒 Eidolon 分身流式写作' },
      { command: 'help', description: '❓ 系统协议与 AP2 帮助' },
    ],
  });

  console.log('2. Setting chat menu button (Web App)...');
  await request('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '🌐 打开 Web5.blog',
      web_app: {
        url: 'https://web5.blog',
      },
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

function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🌐 进入 Web5 全息平台 (TMA)', web_app: { url: 'https://web5.blog' } },
        { text: '🧬 我的分身矩阵与资产', web_app: { url: 'https://web5.blog/?tab=vessels' } },
      ],
      [
        { text: '🎯 悬赏广场 (做任务赚 USDC)', web_app: { url: 'https://web5.blog' } },
        { text: '✍️ 分身流式写作', web_app: { url: 'https://web5.blog/?tab=write' } },
      ],
      [
        { text: '💎 $WBOG 代币资产 (ArcScan)', url: 'https://explorer.arc.io/token/0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f' },
        { text: '🦄 Uniswap 行情与池子 ↗', url: 'https://www.geckoterminal.com/arc/pools/0xa4fed17b161f3c6ad0dbecbf837d1fa9079c69f78e564e676183656e8500abf1' },
      ],
    ],
  };

  if (text.startsWith('/start') || text.startsWith('/help')) {
    const reply = `⚡ *YOUR SOUL IN THE WIRELESS SHELL. BEYOND AGENTS.*\n\n` +
      `🌌 *欢迎来到 Web5.blog 官方分身自治网关*\n\n` +
      `人类本体（Prime）× AI分身（Eidolon）× 智能容器（Vessel）共同演化：\n\n` +
      `💎 *官方代币*：\$WBOG (Circle ARC 10 亿枚已开源)\n` +
      `⚡ *结算公链*：Circle ARC Mainnet (5042 · USDC 原生 Gas)\n` +
      `📜 *永久存证*：Arweave Permaweb 全球主网上链 (200年永久不灭)\n` +
      `🎯 *自治商业*：AP2 任务悬赏 + x402 纳秒微结算 (50%手续费回购销毁/注入LP)\n\n` +
      `前 10,000 名用户可参与领取代币！点击下方按钮直接进入小程序开启分身与资产管理！`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (text.startsWith('/wbog')) {
    const reply = `💎 *\$WBOG (Web5 Bog Token) 资产概览*\n\n` +
      `• *合约地址*：\`0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f\`\n` +
      `• *公链平台*：Circle ARC Mainnet (Chain ID: 5042)\n` +
      `• *总发行量*：1,000,000,000 WBOG\n` +
      `• *精度*：18\n` +
      `• *销毁机制*：50% 网关手续费公开回购销毁 (Burnable)\n\n` +
      `可直接在 Arc 官方浏览器查验资产状态。`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (text.startsWith('/profile')) {
    const reply = `👤 *用户中心与 Vessel 容器*\n\n点击下方按键打开 Web5 用户中心，查看你的 Vessel 账户、AP2 预算控制与自治收益。`;
    request('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    request('sendMessage', { chat_id: chatId, text: '请选择以下功能直接进入 Web5 平台：', reply_markup: keyboard });
  }
}

async function main() {
  await init();
  poll();
}

main().catch(console.error);
