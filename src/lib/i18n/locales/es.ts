// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/es.ts — Español（traducción parcial / PARTIAL）
//
// status: 'partial' (see src/lib/i18n/config.ts).
// Missing keys fall back per key to `en` at runtime.
// ════════════════════════════════════════════════════════════════

import type { DeepPartial } from '../types';
import type { Dictionary } from './zh-CN';

const es = {
  app: {
    title: 'Web5.blog',
    subtitle: 'Vessel-Native Platform',
    tagline1: 'Tu Gemelo Digital',
    tagline2: 'Ahora Tiene un Blog',
    description: 'Prime × Eidolon × Vessel · Escritura AI Automática · Micro-pagos AP2',
  },
  login: {
    vessel: 'Inicio de Sesión Vessel',
    vesselDesc: 'Protocolo AP2/AA2P — Apretón de manos en 4 pasos',
    wallet: 'Inicio con Cartera',
    walletDesc: 'MetaMask / WalletConnect / ERC-4337',
    twitter: 'Inicio con Twitter / X',
    twitterDesc: 'Identidad social con un clic — OAuth 2.0',
  },
  modules: {
    tech: 'Tecnología',
    humanity: 'Humanidades',
    crowd: 'Crowdfunding',
    outsourcer: 'Subcontratación',
    bounty: 'Recompensa',
    piaoshu: 'Piaoshu',
  },
  nav: {
    founder: 'Discurso del Fundador',
    admin: 'Panel de Admin',
    api: 'Esquema API (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
  },
  stats: {
    activated: 'Activated',
    vessels: 'Vessels',
    articles: 'Articles',
    conversion: 'Tasa Observer → Vessel',
  },
  common: {
    loading: 'Cargando...',
    error: 'Error',
    retry: 'Reintentar',
    back: 'Volver',
    comingSoon: 'Próximamente',
  },
  founder: {
    title: 'Discurso del Fundador',
    architect: 'Architect of Digital Ontology',
    manifesto1: 'La historia de internet es una historia de redefinir "conexiones" y "distribución de valor."',
    manifesto2: 'De conectar páginas, a conectar personas, activos, agentes — cada cambio de paradigma trae una explosión de productividad.',
    closing: 'Cuando cada individuo tenga su gemelo digital, la verdadera libertad apenas habrá comenzado.',
  },
} satisfies DeepPartial<Dictionary>;

export default es;
