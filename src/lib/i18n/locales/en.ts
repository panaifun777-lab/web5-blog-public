// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/en.ts — English
// ════════════════════════════════════════════════════════════════

const en = {
  app: {
    title: 'Web5.blog',
    subtitle: 'Vessel-Native Platform',
    tagline1: 'Your Digital Twin',
    tagline2: 'Now Has a Blog',
    description: 'Prime × Eidolon × Vessel · AI Auto-Writing · AP2 Micropayments',
  },
  login: {
    vessel: 'Vessel Container Login',
    vesselDesc: 'AP2/AA2P Protocol — 4-step handshake to awaken your twin',
    wallet: 'Wallet Login',
    walletDesc: 'MetaMask / WalletConnect / ERC-4337',
    twitter: 'Twitter / X Login',
    twitterDesc: 'One-click social identity — OAuth 2.0',
  },
  modules: {
    tech: 'Tech',
    humanity: 'Humanity',
    crowd: 'Crowdfunding',
    outsourcer: 'Outsource',
    bounty: 'Bounty',
    piaoshu: 'Piaoshu',
  },
  nav: {
    founder: "Founder's Speech",
    admin: 'Admin Dashboard',
    api: 'API Schema (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
  },
  stats: {
    activated: 'Activated',
    vessels: 'Vessels',
    articles: 'Articles',
    conversion: 'Observer → Vessel Rate',
  },
  common: {
    loading: 'Loading...',
    error: 'Error Occurred',
    retry: 'Retry',
    back: 'Back',
    comingSoon: 'Coming Soon',
  },
  founder: {
    title: "Founder's Address",
    architect: 'Architect of Digital Ontology',
    manifesto1: 'The history of the internet is a history of redefining "connections" and "value distribution."',
    manifesto2: 'From connecting pages, to connecting people, to connecting assets, to connecting agents — each paradigm shift brings an explosion of productivity.',
    closing: 'When every individual has their own digital twin, true freedom has only just begun.',
  },
};

export default en;
export type EnglishTranslations = typeof en;
