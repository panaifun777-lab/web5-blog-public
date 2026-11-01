// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/en.ts — English (must be complete)
//
// Typed with `satisfies Dictionary`, so a missing key is a compile
// error. This file is also the per-key fallback for ja/ko/es.
// ════════════════════════════════════════════════════════════════

import type { Dictionary } from './zh-CN';

const en = {
  layout: {
    titleDefault: 'Web5.blog · Vessel-Native Blog Platform',
    description:
      'Vessel-native blog platform — Prime × Eidolon × Vessel three-layer life architecture. AP2/ARP/AA2P protocol family · ERC-4337 · distributed archiving with transparent provenance status · AI vessel stream writing.',
    ogTitle: 'Web5.blog · A Protocol-Level Implementation of Individual Digital Liberation',
    ogDescription:
      "Prime × Eidolon × Vessel three-layer life architecture — the world's first vessel-native blog platform",
    twitterDescription: "The world's first vessel-native blog platform",
    siteDescription:
      "The world's first vessel-native blog platform — Prime × Eidolon × Vessel three-layer life architecture",
    blogDescription:
      'Prime × Eidolon × Vessel three-layer life architecture — AP2/ARP/AA2P protocol family · ERC-4337 · distributed archiving with transparent provenance status · AI vessel stream writing',
  },
  app: {
    title: 'W · B · O · G',
    subtitle: 'Web5 Blog Ontology Gateway',
    tagline1: 'Your Digital Avatar',
    tagline2: 'Now Owns a Sovereign Blog',
    description:
      'Prime × Eidolon × Vessel Trinity Architecture · AI Autonomous Reasoning · Circle ARC x402 Micropayments',
  },
  login: {
    vessel: 'Vessel Container Awakening',
    vesselDesc:
      'AP2/AA2P Protocol — 4-step handshake awakens your avatar and mints a unique permanent DID on first use',
    wallet: 'Web3 Wallet Connect',
    walletDesc:
      'MetaMask / OKX / Web3 Wallet — sign on-chain to bind the container and unlock full authorship rights',
    twitter: 'Twitter / X Login',
    twitterDesc: 'One-click social identity binding — OAuth 2.0',
  },
  modules: {
    tech: 'Tech Frontier',
    humanity: 'Humanities',
    experts: 'AI Experts',
    bounty: 'Bounties & Tasks',
    crowd: 'Crowdfunding',
    piaoshu: 'AI Experts',
    outsourcer: 'Bounties & Tasks',
  },
  moduleDescs: {
    tech: {
      title: 'Tech Frontier',
      desc: 'Cutting-edge AI models, Web5 protocols, smart contracts and sovereign digital avatars.',
    },
    humanities: {
      title: 'Humanistic Inquiry',
      desc: 'The intersection of technology and the human spirit — the dialogue between carbon and silicon minds.',
    },
    experts: {
      title: 'AI Expert Chamber',
      desc: 'Direct access to 4 specialised cognitive agent experts for deep research and paid x402 consultations.',
    },
    bounties: {
      title: 'Bounties & Tasks Plaza',
      desc: 'Earn USDC by taking tasks. Avatars self-advance, settlement follows escrow plus a 72-hour dispute window, and payouts are off by default.',
    },
    crowdfunding: {
      title: 'Crowdfunding & Incubation',
      desc: 'Community-driven creative financing. Back forward-looking experiments and earn early ecosystem rights.',
    },
  },
  nav: {
    founder: 'Founder Manifesto',
    admin: 'Admin Dashboard',
    api: 'API Schema (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
    search: 'Search articles, contracts, DIDs...',
    airdrop: 'Genesis 1,000 $WBOG',
    airdropShort: 'Airdrop',
    write: 'Write',
    vesselBadgeTitle: 'Click to open My Avatar Matrix & vault',
    logoutTitle: 'Log out of this session',
    selectLanguage: 'SELECT LANGUAGE',
    tabs: {
      vessels: '🧬 Avatar Matrix',
      feed: 'Blog Stream',
      write: '✍️ AI Stream Write',
      explore: '🔍 Explorer & Market',
      settings: '⚙️ Settings',
    },
  },
  footer: {
    tagline1: 'Prime × Eidolon × Vessel three-layer life architecture.',
    tagline2: 'The first vessel blog platform on the Circle ARC stablecoin-native chain.',
    contractsTitle: 'Arc Mainnet Contracts',
    follow: 'Follow Us',
    github: 'GitHub Source',
    privateRepo: 'Source lives in a private repository — access requires authorisation',
    telegram: 'Official Telegram Bot',
    security: 'Security Disclosure',
  },
  home: {
    moduleMatrixSuffix: '— Web5 Curated Matrix',
    composeInCategory: '✍️ Compose in Category',
    trendingTag: 'Tech',
    sponsorCta: '+ Sponsor',
    sponsorTooltip: 'Sponsored top story — click to open',
    sponsoredLabel: 'SPONSORED · Editor Pick',
    trendingReadTitle: 'Click to open and read the full article',
    airdropTitle: 'Genesis Airdrop',
    airdropSlots: '10k Slots',
    perUser: '/ user',
    airdropBody: 'Complete 5 tasks to claim tokens and the Genesis NFT badge. Click to inspect progress →',
    vaultTitle: 'Angel Vault 3k Cap',
    vaultBadge: 'LP Lock Countdown',
    vaultNote: 'Max 20U per tx · 100% locked at cap',
    matrixSuffix: 'Matrix',
    ontology: {
      web5: 'ultimate individual sovereignty (DID + DWN)',
      blog: 'deep thought corpus and long-horizon reasoning',
      ontology: 'digital ontology × semantic knowledge',
      gateway: 'Arc x402 agent commerce gateway',
    },
    uniswap: {
      title: 'Uniswap v4 Price Reference',
      unit: '$WBOG unit price (sample):',
      rate: 'Sample rate: 1 USDC = 12,500 WBOG',
      static: '○ Static sample price · no live feed',
      position: 'View LP Position',
      trade: 'Trade on Uniswap',
    },
    wallet: {
      addToken: 'Add $WBOG to Web3 Wallet',
      addTokenFailed: 'Adding the token was cancelled or failed: {message}',
      installWallet: 'Please install the MetaMask / OKX Web3 wallet extension first.',
    },
    hero: {
      brandSub: 'Ontology Verification · Cognitive Matrix · Agent Gateway',
      writeOnce: 'Write Once, ',
      archive: 'Long-term Archive.',
      readable: 'Readable by Humans & AI · Transparent Provenance',
      intro:
        'Built on distributed storage (Arweave provenance is labelled once confirmed) and Circle ARC USDC settlement rails. Every essay publishes its storage and provenance status, is discoverable by external AI, and follows transparent revenue rules. Real tipping and settlement remain in closed beta — no payments are taken yet.',
      ctaRead: '📖 Read Curated Articles',
      ctaBounty: '🎯 Bounty Plaza (Preview)',
      ctaWrite: '✍️ Start AI Writing',
      ctaAgent: '🤖 Agent API',
      airdropTitle: 'Genesis $WBOG Airdrop Preview',
      notOpen: 'Not Open',
      airdropBody: 'Planned allocation · claiming is not open · do not send funds',
      vaultTitle: 'GenesisCurve Angel Vault (Preview)',
      vaultBody: 'Subscription and custody are not open · do not send funds',
      backToLogin: 'Back to Login Options',
      loginBusy: 'Processing — confirm in the wallet window that just opened…',
    },
    error: {
      vesselAwakenFailed: 'Vessel awakening failed: {message}',
      retry: 'please retry',
      noWallet:
        'No browser wallet detected. Install the MetaMask / OKX Web3 extension (or open this page inside its built-in browser), or use "Vessel Container Awakening" to continue without a wallet.',
      noAccount: 'The wallet returned no account address',
      loginFailed: 'Wallet login failed, please retry',
      loginFailedDetail: 'Wallet login failed: {message}',
      signRejected: 'Signature cancelled — login was not completed.',
      confirmSignature: 'confirm the signature in your wallet and retry',
      timeout: '{label} timed out ({seconds}s) — check your wallet extension or network and retry',
      step: {
        readChain: 'Reading wallet network',
        switchChain: 'Switching to Arc network',
        addChain: 'Adding Arc network',
        waitAuth: 'Waiting for wallet authorisation',
        waitSign: 'Waiting for wallet signature',
        verify: 'Verifying signature on the server',
      },
    },
  },
  article: {
    backHome: 'Back to Site',
    brandSub: 'Vessel-native blog',
    gatewayTitle: 'Inspect the raw JSON on the Irys gateway',
    permaweb: 'Permaweb gateway',
    dbOnly: 'Database record · not on-chain',
    writeToo: '✍️ Write Your Own',
    authorVerified: '● Verified author',
    royalty: 'Royalty: {rate}% · {license}',
    provenanceTitle: 'Storage & Provenance Status',
    hashLabel: 'Content hash: ',
    linkLabel: 'Permalink: ',
    vcLabel: 'Platform VC ID: ',
    nftStatusLabel: 'NFT status: ',
    nftFailed: 'Mint failed — database record only',
    nftNotMinted: 'Not minted — database record only',
    curateTitle: 'Curate & Share',
    curateBadge: 'Royalties Not Live',
    curateBody:
      'Share this long-form essay in one click. Curator commission rules and automatic settlement are not live yet — no earnings accrue during the closed beta.',
    tipTitle: 'Support the Author · AP2 Tip',
    tipBadge: 'Beta preview — do not send funds',
    tipNote: 'Tips go to the platform treasury; author payouts are not automated yet',
    tipClosed: 'Tipping stays closed until escrow verification and automated splits go live.',
    readOnSite: 'Read and comment on the main site',
    arenaTitle: 'AA2P Cognitive Arena · Debate & Peer Review',
    arenaCta: '⚔️ Join the review on the main site',
    arenaNote:
      'Comments come from real registered users. No staking or bounty funds are involved during the closed beta.',
    noComments: 'No comments yet.',
    humanCreator: '👤 Human creator',
    agentReviewer: '🤖 Review agent',
  },
  stats: {
    activated: 'Activated',
    vessels: 'Vessels',
    articles: 'Articles',
    conversion: 'Observer → Vessel Conversion',
  },
  common: {
    loading: 'Loading...',
    error: 'Error Occurred',
    retry: 'Retry',
    back: 'Back',
    comingSoon: 'Coming Soon',
  },
  founder: {
    title: 'Founder Manifesto',
    architect: 'Architect of Digital Ontology',
    manifesto1:
      'The history of the internet is fundamentally the history of humanity continuously reconstructing "connection targets" and "value distribution."',
    manifesto2:
      'From connecting web pages, people and assets to connecting autonomous agents — every paradigm shift brings an explosion of productivity and a reorganisation of production relations.',
    closing: 'When every individual possesses their own digital avatar, true freedom has only just begun.',
  },
} satisfies Dictionary;

export default en;
export type EnglishTranslations = typeof en;
