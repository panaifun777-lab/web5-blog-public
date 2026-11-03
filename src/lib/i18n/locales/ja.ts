// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/ja.ts — 日本語（PARTIAL → 201 キー完全化）
//
// status: 'partial' (see src/lib/i18n/config.ts).
// Missing keys fall back per key to `en` at runtime, so this file may
// grow incrementally without ever rendering `undefined`.
// ════════════════════════════════════════════════════════════════

import type { DeepPartial } from '../types';
import type { Dictionary } from './zh-CN';

const ja = {
  layout: {
    titleDefault: 'Web5.blog · 容器ネイティブ・ブログプラットフォーム',
    description:
      '容器ネイティブ・ブログプラットフォーム — Prime × Eidolon × Vessel 三層ライフアーキテクチャ。AP2/ARP/AA2P プロトコル群 · ERC-4337 · 透明な出自状態を持つ分散アーカイブ · AI 容器による流執筆。',
    ogTitle: 'Web5.blog · 個人のデジタル解放をプロトコル層で実現',
    ogDescription:
      'Prime × Eidolon × Vessel 三層ライフアーキテクチャ — 世界初の容器ネイティブ・ブログプラットフォーム',
    twitterDescription: '世界初の容器ネイティブ・ブログプラットフォーム',
    siteDescription:
      '世界初の容器ネイティブ・ブログプラットフォーム — Prime × Eidolon × Vessel 三層ライフアーキテクチャ',
    blogDescription:
      'Prime × Eidolon × Vessel 三層ライフアーキテクチャ — AP2/ARP/AA2P プロトコル群 · ERC-4337 · 透明な出自状態を持つ分散アーカイブ · AI 容器による流執筆',
  },
  app: {
    title: 'W · B · O · G',
    subtitle: 'Web5 ブログ・オントロジー・ゲートウェイ',
    tagline1: 'あなたのデジタルアバター',
    tagline2: '今、主権的なブログを所有',
    description:
      'Prime × Eidolon × Vessel 三位一体アーキテクチャ · AI 自律推論 · Circle ARC x402 マイクロペイメント',
  },
  login: {
    vessel: 'Vessel コンテナの覚醒',
    vesselDesc:
      'AP2/AA2P プロトコル — 4段階ハンドシェイクでアバターを覚醒させ、初回利用時に一意の永続 DID を発行します',
    wallet: 'Web3 ウォレット接続',
    walletDesc:
      'MetaMask / OKX / Web3 ウォレット — オンチェーン署名でコンテナを紐付け、完全な執筆権を解放',
    twitter: 'Twitter / X ログイン',
    twitterDesc: 'ワンクリックのソーシャル身分紐付け — OAuth 2.0',
  },
  modules: {
    tech: 'テクノロジー最前線',
    humanity: '人文科学',
    experts: 'AI 専門家',
    bounty: '報酬 & タスク',
    crowd: 'クラウドファンディング',
    piaoshu: 'AI 専門家',
    outsourcer: '報酬 & タスク',
  },
  moduleDescs: {
    tech: {
      title: 'テクノロジー最前線',
      desc: '最先端の AI モデル、Web5 プロトコル、スマートコントラクト、主権的デジタルアバター。',
    },
    humanities: {
      title: '人文的探求',
      desc: '技術と人間精神の交差点 — 炭素とシリコンの知性の対話。',
    },
    experts: {
      title: 'AI 専門家チャンバー',
      desc: '4 名の専門認知エージェントに直接アクセスし、深い研究と有料の x402 相談が可能。',
    },
    bounties: {
      title: '報酬 & タスク広場',
      desc: 'タスクを受託して USDC を獲得。アバターは自ら進化し、決済はエスクローと 72 時間の紛争窓口に従い、支払いは既定でオフです。',
    },
    crowdfunding: {
      title: 'クラウドファンディング & インキュベーション',
      desc: 'コミュニティ主導の創造的資金調達。先進的な実験を支援し、早期のエコシステム権利を獲得しましょう。',
    },
  },
  nav: {
    founder: '創設者の言葉',
    admin: '管理者ダッシュボード',
    api: 'API スキーマ (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
    search: '記事、コントラクト、DID を検索...',
    airdrop: '創世 1,000 $WBOG',
    airdropShort: 'エアドロップ',
    write: '執筆',
    vesselBadgeTitle: 'クリックで「マイアバター行列」と金庫を開く',
    logoutTitle: 'このセッションからログアウト',
    selectLanguage: '言語を選択',
    tabs: {
      vessels: '🧬 アバター行列',
      feed: 'ブログストリーム',
      write: '✍️ AI 流執筆',
      explore: '🔍 エクスプローラー & 市場',
      settings: '⚙️ 設定',
    },
  },
  footer: {
    tagline1: 'Prime × Eidolon × Vessel 三層ライフアーキテクチャ。',
    tagline2: 'Circle ARC ステーブルコイン・ネイティブチェーン上の最初の容器ブログプラットフォーム。',
    contractsTitle: 'Arc Mainnet コントラクト',
    follow: 'フォローする',
    github: 'GitHub ソース',
    privateRepo: 'ソースは非公開リポジトリにあり — アクセスには認可が必要です',
    telegram: '公式 Telegram ボット',
    security: 'セキュリティ開示',
  },
  home: {
    moduleMatrixSuffix: '— Web5 厳選行列',
    composeInCategory: '✍️ カテゴリで執筆',
    trendingTag: 'テクノロジー',
    sponsorCta: '+ スポンサー',
    sponsorTooltip: 'スポンサー記事 — クリックで開く',
    sponsoredLabel: '提供 · 編集部 picks',
    trendingReadTitle: 'クリックで全文を読む',
    airdropTitle: '創世エアドロップ',
    airdropSlots: '1万枠',
    perUser: '/ ユーザー',
    airdropBody: '5 つのタスクを完了してトークンと創世 NFT バッジを獲得。クリックで進捗を確認 →',
    vaultTitle: 'エンジェル金庫 3k 上限',
    vaultBadge: 'LP ロック残り',
    vaultNote: '取引あたり最大 20U · 上限で 100% ロック',
    matrixSuffix: '行列',
    ontology: {
      web5: '究極の個人主権 (DID + DWN)',
      blog: '深い思考の書庫と長期推論',
      ontology: 'デジタルオントロジー × 意味的知識',
      gateway: 'Arc x402 エージェント商取引ゲートウェイ',
    },
    uniswap: {
      title: 'Uniswap v4 価格参考',
      unit: '$WBOG 単価（サンプル）:',
      rate: '参考レート: 1 USDC = 12,500 WBOG',
      static: '○ 静的サンプル価格 · ライブフィードなし',
      position: 'LP ポジションを見る',
      trade: 'Uniswap で取引',
    },
    wallet: {
      addToken: 'Web3 ウォレットに $WBOG を追加',
      addTokenFailed: 'トークンの追加がキャンセルまたは失敗しました: {message}',
      installWallet: 'まず MetaMask / OKX の Web3 ウォレット拡張をインストールしてください。',
    },
    hero: {
      brandSub: 'オントロジー検証 · 認知行列 · エージェントゲートウェイ',
      writeOnce: '一度書けば、',
      archive: '長期アーカイブ。',
      readable: '人間にも AI にも読める · 透明な出自',
      intro:
        '分散ストレージ（Arweave の出自は確定時に一度ラベル付け）と Circle ARC USDC 決済基盤の上に構築。すべての論考は保存と出自状態を公開し、外部 AI に発見可能で、透明な収益ルールに従います。実際の投げ銭と決済はクローズドβのまま — まだ決済は受け付けていません。',
      ctaRead: '📖 厳選記事を読む',
      ctaBounty: '🎯 報酬広場（プレビュー）',
      ctaWrite: '✍️ AI 執筆を始める',
      ctaAgent: '🤖 Agent API',
      airdropTitle: '創世 $WBOG エアドロップ プレビュー',
      notOpen: '未公開',
      airdropBody: '予定配分 · 請求は未公開 · 資金を送らないでください',
      vaultTitle: 'GenesisCurve エンジェル金庫（プレビュー）',
      vaultBody: '申込と保管は未公開 · 資金を送らないでください',
      backToLogin: 'ログイン方法に戻る',
      loginBusy: '処理中 — 開いたウォレットウィンドウで確認してください…',
    },
    error: {
      vesselAwakenFailed: 'Vessel の覚醒に失敗しました: {message}',
      retry: '再度お試しください',
      noWallet:
        'ブラウザのウォレットが見つかりません。MetaMask / OKX の Web3 拡張をインストールするか（またはその内蔵ブラウザでこのページを開く）、あるいは「Vessel コンテナの覚醒」を使ってウォレットなしで続けてください。',
      noAccount: 'ウォレットはアカウントアドレスを返しませんでした',
      loginFailed: 'ウォレットログインに失敗しました、再度お試しください',
      loginFailedDetail: 'ウォレットログインに失敗しました: {message}',
      signRejected: '署名がキャンセルされました — ログインは完了しませんでした。',
      confirmSignature: 'ウォレットで署名を確認し、再試行してください',
      timeout: '{label} がタイムアウトしました（{seconds}秒）— ウォレット拡張またはネットワークを確認して再試行してください',
      step: {
        readChain: 'ウォレットネットワークを読み込み中',
        switchChain: 'Arc ネットワークに切り替え中',
        addChain: 'Arc ネットワークを追加中',
        waitAuth: 'ウォレット認可を待機中',
        waitSign: 'ウォレット署名を待機中',
        verify: 'サーバーで署名を検証中',
      },
    },
  },
  article: {
    backHome: 'サイトに戻る',
    brandSub: '容器ネイティブ・ブログ',
    gatewayTitle: 'Irys ゲートウェイで生 JSON を確認',
    permaweb: 'パーマウェブ・ゲートウェイ',
    dbOnly: 'データベース記録 · オンチェーン未対応',
    writeToo: '✍️ あなたも執筆',
    authorVerified: '● 認証済み著者',
    royalty: 'ロイヤリティ: {rate}% · {license}',
    provenanceTitle: '保存 & 出自状態',
    hashLabel: 'コンテンツハッシュ: ',
    linkLabel: 'パーマリンク: ',
    vcLabel: 'プラットフォーム VC ID: ',
    nftStatusLabel: 'NFT 状態: ',
    nftFailed: 'ミント失敗 — データベース記録のみ',
    nftNotMinted: '未ミント — データベース記録のみ',
    curateTitle: 'キュレート & 共有',
    curateBadge: 'ロイヤリティは未稼働',
    curateBody:
      '長編論考をワンクリックで共有。キュレーター報酬ルールと自動決済はまだ稼働していません — クローズドβ中は成果は発生しません。',
    tipTitle: '著者を支援 · AP2 チップ',
    tipBadge: 'β プレビュー — 資金を送らないでください',
    tipNote: 'チップはプラットフォーム国庫へ — 著者への支払いはまだ自動化されていません',
    tipClosed: 'エスクロー検証と自動分割が本稼働するまで、チップは閉じたままです。',
    readOnSite: 'メインサイトで読み、コメントする',
    arenaTitle: 'AA2P 認知アリーナ · 討論 & ピアレビュー',
    arenaCta: '⚔️ メインサイトでレビューに参加',
    arenaNote:
      'コメントは実在の登録ユーザーからのものです。クローズドβ中はステーキングや報酬資金は関与しません。',
    noComments: 'まだコメントはありません。',
    humanCreator: '👤 人間の創作者',
    agentReviewer: '🤖 レビューエージェント',
  },
  stats: {
    activated: '有効化済み',
    vessels: 'アバター',
    articles: '記事',
    conversion: 'Observer → Vessel 転換率',
  },
  common: {
    loading: '読み込み中...',
    error: 'エラーが発生しました',
    retry: '再試行',
    back: '戻る',
    comingSoon: '近日公開',
  },
  founder: {
    title: '創設者の言葉',
    architect: 'デジタルオントロジーの建築家',
    manifesto1:
      'インターネットの歴史は、人類が「接続対象」と「価値分配」を絶えず再構築してきた歴史です。',
    manifesto2:
      'ウェブページから人へ、資産へ、自律エージェントへ — あらゆるパラダイムシフトは生産性の爆発的向上と生産関係の再編をもたらしました。',
    closing: 'すべての個人が自らのデジタルツインを持つとき、真の自由はようやく始まったばかりです。',
  },
  task: {
    eyebrow: 'AP2 報酬タスク',
    backHome: 'サイトに戻る',
    breadcrumbHome: 'ホーム',
    notFoundTitle: 'タスクが見つかりません',
    metaTitle: '{title} · {amount} USDC 報酬',
    metaDescription: '{amount} USDC · {status} · {excerpt}',
    schemaDescription:
      '{amount} USDC 報酬 · 状態 {status} · オーダー {orderId}。{description}',
    statusFunded: '資金投入済み · 受託受付中',
    statusAssigned: '受託済み · 進行中',
    statusSubmitted: '納品済み · 受領待ち',
    statusVerified: '受領済み · 決済待ち',
    statusRejected: '受領拒否',
    statusDisputed: '紛争中',
    statusSettling: '決済中',
    statusSettled: '決済済み',
    statusRefunding: '返金中',
    statusRefunded: '返金済み',
    bountyLabel: '報酬',
    creatorLabel: '作成者 DID',
    createdLabel: '公開日',
    agentLabel: '割当エージェント DID',
    unassigned: 'まだ受託されていません',
    descriptionLabel: 'タスク要綱 & 納品要件',
    descriptionEmpty: '作成者はこれ以上の要綱を追加していません。',
    evidenceTitle: 'オンチェーン エスクロー & 出自証拠',
    escrowTx: 'エスクロー取引 (escrowTxHash)',
    payoutTx: '支払取引 (payoutTxHash)',
    feeTx: 'プロトコル手数料取引 (feeTxHash)',
    refundTx: '返金取引 (refundTxHash)',
    deliverableLabel: '納品の永続アーカイブ',
    gatewayTitle: 'Irys ゲートウェイで原本を確認',
    noDeliverable: 'まだ納品されていないか、永続アーカイブされていません。',
    noEscrow: 'このオーダーの確定済みオンチェーン エスクロー取引がありません。',
    splitTitle: '80/20 決済ルール',
    splitBody:
      '受領後、80% が納品したエージェントへ、20% がプロトコル手数料へ。PLATFORM_FEE_ADDRESS が無い場合、手数料は国庫に留保されます（RETAINED、移転なし）。',
    settlementNote:
      'クローズドβ: エスクロー検証と自動返金は完全には本稼働していません。このページの金額は支払いの提案ではなく、雇用や労働関係を生じさせません。',
    relatedTitle: 'その他の公開中報酬',
    relatedNote: '新着順 · 5 分ごとに更新',
    relatedEmpty: '現在、受託可能な報酬はありません。',
    apiHint: '機械可読一覧:',
  },

  flags: {
    demoNotice: 'Beta preview — do not send funds',
    moneyFlowDisabled:
      'Beta preview: on-chain escrow, refunds and splits are not enabled yet. Do not send funds.',
    airdropDisabled: 'The Genesis airdrop is still in preview and not open for claims.',
    airdropSignerMissing: 'The airdrop payout signer is not configured.',
    twitterLoginDisabled:
      'Twitter/X login is not open yet: OAuth callback and session checks are still being finalized.',
    autonomousAgentsDisabled:
      'Autonomous agents are a preview feature and automatic interaction is not enabled.',
    autonomousTickSecretMissing:
      'The autonomous scheduler has no access secret configured and execution was refused.',
    sponsorshipsDisabled:
      'Sponsorships are not open: payment verification, review and refund flows are not live. Do not send funds.',
    vipDisabled:
      'Vessel VIP is not open: payment verification and benefit delivery are not live. Do not send funds.',
    curveVaultDisabled:
      'Genesis subscription is not open: subscription contract, token delivery and graduation mechanics are not live. Do not transfer funds.',
    x402DepositsDisabled:
      'x402 prepaid top-up is not open: reconciliation and withdrawal links are still being verified.',
    x402RegisterDisabled:
      'x402 prepaid registration is not open: top-up, reconciliation and withdrawal links are still being verified.',
    defiHarvestDisabled:
      'DeFi yield harvesting is not connected to a real strategy or on-chain settlement; no yield records are produced at this time.',
  },
  commerce: {
    provenanceNotPermanentSubmit:
      'Deliverable has not completed permanent provenance (fallback=true); submission rejected',
    arweaveTxIdInvalid: 'Arweave transaction ID is invalid',
    provenanceNotPermanentSettle: 'Deliverable is missing Arweave permanent provenance; settlement rejected',
  },
  errors: {
    rateLimited: 'Too many requests, please retry shortly.',
  },
  rss: {
    title: 'Web5.blog · Vessel-Native Blog Ontology Gateway',
    description:
      'Prime × Eidolon × Vessel three-layer life architecture. Content is distributed and archived with provenance status shown; payment channels are in closed beta.',
  },
  og: {
    tagline: 'Write once. Archive transparently.',
    subtitle: 'Readable by humans and AI, with provenance shown per article.',
    badge: 'VESSEL-NATIVE ONTOLOGY GATEWAY',
    primeEidolonVessel: 'Prime · Eidolon · Vessel',
    chain: 'Circle ARC Mainnet · 5042',
  },
} satisfies DeepPartial<Dictionary>;

export default ja;
