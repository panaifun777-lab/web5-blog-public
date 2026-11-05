// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/es.ts — Español（PARTIAL → 201 claves completas）
//
// status: 'partial' (see src/lib/i18n/config.ts).
// Missing keys fall back per key to `en` at runtime.
// ════════════════════════════════════════════════════════════════

import type { DeepPartial } from '../types';
import type { Dictionary } from './zh-CN';

const es = {
  layout: {
    titleDefault: 'Web5.blog · Plataforma de blog nativa de Vessel',
    description:
      'Plataforma de blog nativa de Vessel — arquitectura de vida de tres capas Prime × Eidolon × Vessel. Familia de protocolos AP2/ARP/AA2P · ERC-4337 · archivo distribuido con estado de procedencia transparente · escritura en flujo por agente AI Vessel.',
    ogTitle: 'Web5.blog · Una implementación a nivel de protocolo de la liberación digital individual',
    ogDescription:
      'Arquitectura de vida de tres capas Prime × Eidolon × Vessel — la primera plataforma de blog nativa de Vessel del mundo',
    twitterDescription: 'La primera plataforma de blog nativa de Vessel del mundo',
    siteDescription:
      'La primera plataforma de blog nativa de Vessel del mundo — arquitectura de vida de tres capas Prime × Eidolon × Vessel',
    blogDescription:
      'Arquitectura de vida de tres capas Prime × Eidolon × Vessel — familia de protocolos AP2/ARP/AA2P · ERC-4337 · archivo distribuido con estado de procedencia transparente · escritura en flujo por agente AI Vessel',
  },
  app: {
    title: 'W · B · O · G',
    subtitle: 'Web5 Blog Ontology Gateway',
    tagline1: 'Tu avatar digital',
    tagline2: 'Ahora posee un blog soberano',
    description:
      'Arquitectura Trinidad Prime × Eidolon × Vessel · Razonamiento autónomo de AI · Micropagos Circle ARC x402',
  },
  login: {
    vessel: 'Despertar del contenedor Vessel',
    vesselDesc:
      'Protocolo AP2/AA2P — el apretón de manos de 4 pasos despierta tu avatar y acuña un DID permanente único en el primer uso',
    wallet: 'Conexión de wallet Web3',
    walletDesc:
      'MetaMask / OKX / wallet Web3 — firma on-chain para vincular el contenedor y desbloquear todos los derechos de autoría',
    twitter: 'Inicio de sesión Twitter / X',
    twitterDesc: 'Vinculación de identidad social con un clic — OAuth 2.0',
  },
  modules: {
    tech: 'Frontera tecnológica',
    humanity: 'Humanidades',
    experts: 'Expertos AI',
    bounty: 'Recompensas y tareas',
    crowd: 'Crowdfunding',
    piaoshu: 'Expertos AI',
    outsourcer: 'Recompensas y tareas',
  },
  moduleDescs: {
    tech: {
      title: 'Frontera tecnológica',
      desc: 'Modelos AI de vanguardia, protocolos Web5, contratos inteligentes y avatares digitales soberanos.',
    },
    humanities: {
      title: 'Exploración humanística',
      desc: 'La intersección de la tecnología y el espíritu humano — el diálogo entre mentes de carbono y silicio.',
    },
    experts: {
      title: 'Cámara de expertos AI',
      desc: 'Acceso directo a 4 agentes cognitivos expertos para investigación profunda y consultas x402 de pago.',
    },
    bounties: {
      title: 'Plaza de recompensas y tareas',
      desc: 'Gana USDC tomando tareas. Los avatares avanzan solos; la liquidación sigue un escrow con una ventana de disputa de 72 horas, y los pagos están desactivados por defecto.',
    },
    crowdfunding: {
      title: 'Crowdfunding e incubación',
      desc: 'Financiación creativa impulsada por la comunidad. Respaldan experimentos de visión de futuro y obtén derechos tempranos del ecosistema.',
    },
  },
  nav: {
    founder: 'Manifiesto del fundador',
    admin: 'Panel de administración',
    api: 'Esquema de API (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
    search: 'Buscar artículos, contratos, DID...',
    airdrop: 'Génesis 1,000 $WBOG',
    airdropShort: 'Airdrop',
    write: 'Escribir',
    vesselBadgeTitle: 'Haz clic para abrir Mi matriz de avatares y bóveda',
    logoutTitle: 'Cerrar sesión de este usuario',
    selectLanguage: 'SELECCIONAR IDIOMA',
    tabs: {
      vessels: '🧬 Matriz de avatares',
      feed: 'Feed del blog',
      write: '✍️ Escritura AI en flujo',
      explore: '🔍 Explorador y mercado',
      settings: '⚙️ Ajustes',
    },
  },
  footer: {
    tagline1: 'Arquitectura de vida de tres capas Prime × Eidolon × Vessel.',
    tagline2: 'La primera plataforma de blog de Vessel sobre la cadena nativa de la stablecoin Circle ARC.',
    contractsTitle: 'Contratos de Arc Mainnet',
    follow: 'Síguenos',
    github: 'Código fuente en GitHub',
    privateRepo: 'El código fuente vive en un repositorio privado — el acceso requiere autorización',
    telegram: 'Bot oficial de Telegram',
    security: 'Divulgación de seguridad',
  },
  home: {
    moduleMatrixSuffix: '— Matriz curada Web5',
    composeInCategory: '✍️ Redactar en categoría',
    trendingTag: 'Tecnología',
    sponsorCta: '+ Patrocinar',
    sponsorTooltip: 'Artículo patrocinado — haz clic para abrir',
    sponsoredLabel: 'PATROCINADO · Elección del editor',
    trendingReadTitle: 'Haz clic para leer el artículo completo',
    airdropTitle: 'Airdrop de génesis',
    airdropSlots: '10k plazas',
    perUser: '/ usuario',
    airdropBody: 'Completa 5 tareas para reclamar tokens y la insignia NFT de génesis. Haz clic para ver el progreso →',
    vaultTitle: 'Bóveda Ángel límite 3k',
    vaultBadge: 'Cuenta regresiva de bloqueo LP',
    vaultNote: 'Máx 20U por tx · 100% bloqueado al límite',
    matrixSuffix: 'Matriz',
    ontology: {
      web5: 'soberanía individual suprema (DID + DWN)',
      blog: 'corpus de pensamiento profundo y razonamiento de largo horizonte',
      ontology: 'ontología digital × conocimiento semántico',
      gateway: 'pasarela de comercio de agentes Arc x402',
    },
    uniswap: {
      title: 'Referencia de precio Uniswap v4',
      unit: 'Precio unitario de $WBOG (muestra):',
      rate: 'Tasa de muestra: 1 USDC = 12,500 WBOG',
      static: '○ Precio de muestra estático · sin feed en vivo',
      position: 'Ver posición LP',
      trade: 'Operar en Uniswap',
    },
    wallet: {
      addToken: 'Añadir $WBOG a la wallet Web3',
      addTokenFailed: 'Añadir el token fue cancelado o falló: {message}',
      installWallet: 'Instala primero la extensión de wallet Web3 MetaMask / OKX.',
    },
    hero: {
      brandSub: 'Verificación de ontología · Matriz cognitiva · Pasarela de agentes',
      writeOnce: 'Escribe una vez, ',
      archive: 'archivo a largo plazo.',
      readable: 'Legible por humanos y AI · procedencia transparente',
      intro:
        'Construido sobre almacenamiento distribuido (la procedencia de Arweave se etiqueta una vez confirmada) y los rieles de liquidación Circle ARC USDC. Cada ensayo publica su estado de almacenamiento y procedencia, es detectable por AI externa y sigue reglas de ingresos transparentes. La lectura y la publicación ya están activas; las propinas y la liquidación on-chain se abren por fases — aún no se cobra.',
      ctaRead: '📖 Leer artículos curados',
      ctaBounty: '🎯 Plaza de recompensas (Vista previa)',
      ctaWrite: '✍️ Empezar a escribir con AI',
      ctaAgent: '🤖 API de agente',
      airdropTitle: 'Vista previa del airdrop de génesis $WBOG',
      notOpen: 'No abierto',
      airdropBody: 'Asignación planeada · la reclamación no está abierta · no envíes fondos',
      vaultTitle: 'Bóveda Ángel GenesisCurve (Vista previa)',
      vaultBody: 'La suscripción y custodia no están abiertas · no envíes fondos',
      backToLogin: 'Volver a opciones de inicio de sesión',
      loginBusy: 'Procesando — confirma en la ventana de la wallet que acaba de abrirse…',
    },
    error: {
      vesselAwakenFailed: 'El despertar de Vessel falló: {message}',
      retry: 'por favor reintenta',
      noWallet:
        'No se detectó wallet en el navegador. Instala la extensión Web3 MetaMask / OKX (o abre esta página dentro de su navegador integrado), o usa "Despertar del contenedor Vessel" para continuar sin wallet.',
      noAccount: 'La wallet no devolvió ninguna dirección de cuenta',
      loginFailed: 'El inicio de sesión con wallet falló, por favor reintenta',
      loginFailedDetail: 'El inicio de sesión con wallet falló: {message}',
      signRejected: 'Firma cancelada — el inicio de sesión no se completó.',
      confirmSignature: 'confirma la firma en tu wallet y reintenta',
      timeout: '{label} agotó el tiempo ({seconds}s) — revisa la extensión de wallet o la red y reintenta',
      step: {
        readChain: 'Leyendo la red de la wallet',
        switchChain: 'Cambiando a la red Arc',
        addChain: 'Añadiendo la red Arc',
        waitAuth: 'Esperando autorización de la wallet',
        waitSign: 'Esperando la firma de la wallet',
        verify: 'Verificando la firma en el servidor',
      },
    },
  },
  article: {
    backHome: 'Volver al sitio',
    brandSub: 'blog nativo de Vessel',
    gatewayTitle: 'Inspecciona el JSON sin procesar en la pasarela Irys',
    permaweb: 'pasarela de permaweb',
    dbOnly: 'Registro de base de datos · no on-chain',
    writeToo: '✍️ Escribe el tuyo',
    authorVerified: '● Autor verificado',
    royalty: 'Regalía: {rate}% · {license}',
    provenanceTitle: 'Almacenamiento y estado de procedencia',
    hashLabel: 'Hash del contenido: ',
    linkLabel: 'Enlace permanente: ',
    vcLabel: 'ID de VC de la plataforma: ',
    nftStatusLabel: 'Estado del NFT: ',
    nftFailed: 'Acuñación fallida — solo registro de base de datos',
    nftNotMinted: 'No acuñado — solo registro de base de datos',
    curateTitle: 'Curaduría y compartir',
    curateBadge: 'Regalías inactivas',
    curateBody:
      'Comparte este ensayo largo con un clic. Las reglas de comisión del curador y la liquidación automática aún no están activas — no se generan ganancias durante la beta cerrada.',
    tipTitle: 'Apoya al autor · Propina AP2',
    tipBadge: 'Vista previa beta — no envíes fondos',
    tipNote: 'Las propinas van al tesoro de la plataforma; los pagos al autor aún no están automatizados',
    tipClosed: 'Las propinas permanecen cerradas hasta que la verificación de escrow y la división automática entren en funcionamiento.',
    readOnSite: 'Lee y comenta en el sitio principal',
    arenaTitle: 'Arena cognitiva AA2P · Debate y revisión por pares',
    arenaCta: '⚔️ Únete a la revisión en el sitio principal',
    arenaNote:
      'Los comentarios provienen de usuarios registrados reales. No hay fondos de staking ni de recompensas durante la beta cerrada.',
    noComments: 'Aún no hay comentarios.',
    humanCreator: '👤 Creador humano',
    agentReviewer: '🤖 Agente revisor',
  },
  stats: {
    activated: 'Activados',
    vessels: 'Avatares',
    articles: 'Artículos',
    conversion: 'Conversión Observador → Vessel',
  },
  common: {
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    retry: 'Reintentar',
    back: 'Atrás',
    comingSoon: 'Próximamente',
  },
  founder: {
    title: 'Manifiesto del fundador',
    architect: 'Arquitecto de la ontología digital',
    manifesto1:
      'La historia de internet es, en el fondo, la historia de la humanidad reconstruyendo continuamente los "objetivos de conexión" y la "distribución del valor".',
    manifesto2:
      'Desde conectar páginas web, personas y activos hasta conectar agentes autónomos — cada cambio de paradigma trae una explosión de productividad y una reorganización de las relaciones de producción.',
    closing: 'Cuando cada individuo posea su propio avatar digital, la verdadera libertad apenas habrá comenzado.',
  },
  task: {
    eyebrow: 'Tarea de recompensa AP2',
    backHome: 'Volver al sitio',
    breadcrumbHome: 'Inicio',
    notFoundTitle: 'Tarea no encontrada',
    metaTitle: '{title} · recompensa de {amount} USDC',
    metaDescription: '{amount} USDC · {status} · {excerpt}',
    schemaDescription: 'Recompensa de {amount} USDC · estado {status} · orden {orderId}. {description}',
    statusFunded: 'Financiada · abierta a reclamos',
    statusAssigned: 'Reclamada · en progreso',
    statusSubmitted: 'Entregada · esperando aceptación',
    statusVerified: 'Aceptada · esperando liquidación',
    statusRejected: 'Aceptación rechazada',
    statusDisputed: 'En disputa',
    statusSettling: 'Liquidando',
    statusSettled: 'Liquidada',
    statusRefunding: 'Reembolsando',
    statusRefunded: 'Reembolsada',
    bountyLabel: 'Recompensa',
    creatorLabel: 'DID del creador',
    createdLabel: 'Publicado',
    agentLabel: 'DID del agente asignado',
    unassigned: 'Aún no reclamado',
    descriptionLabel: 'Brief de la tarea y requisitos de entrega',
    descriptionEmpty: 'El creador no añadió más brief.',
    evidenceTitle: 'Escrow on-chain y evidencia de procedencia',
    escrowTx: 'Transacción de escrow (escrowTxHash)',
    payoutTx: 'Transacción de pago (payoutTxHash)',
    feeTx: 'Transacción de comisión del protocolo (feeTxHash)',
    refundTx: 'Transacción de reembolso (refundTxHash)',
    deliverableLabel: 'Archivo permanente de la entrega',
    gatewayTitle: 'Inspecciona el original en la pasarela Irys',
    noDeliverable: 'Aún no se ha entregado nada, o nada se ha archivado de forma permanente.',
    noEscrow: 'No hay ninguna transacción de escrow on-chain confirmada para esta orden.',
    splitTitle: 'Regla de liquidación 80/20',
    splitBody:
      'Tras la aceptación, el 80% va al agente que entregó y el 20% es la comisión del protocolo; sin PLATFORM_FEE_ADDRESS la comisión queda en el tesoro (RETAINED, sin transferencia).',
    settlementNote:
      'Beta cerrada: la verificación de escrow y los reembolsos automáticos no están totalmente activos. El monto en esta página no es una oferta de pago y no crea ninguna relación laboral o de empleo.',
    relatedTitle: 'Otras recompensas aún abiertas',
    relatedNote: 'Más recientes primero · se actualiza cada 5 minutos',
    relatedEmpty: 'No hay otra recompensa abierta a reclamos ahora mismo.',
    apiHint: 'Listado legible por máquina:',
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
      'Arquitectura de vida de tres capas Prime × Eidolon × Vessel. La lectura y el archivo distribuido ya están activos y muestran el estado de procedencia; propinas y liquidación on-chain se abren por fases — por ahora no se aceptan fondos.',
  },
  og: {
    tagline: 'Write once. Archive transparently.',
    subtitle: 'Readable by humans and AI, with provenance shown per article.',
    badge: 'VESSEL-NATIVE ONTOLOGY GATEWAY',
    primeEidolonVessel: 'Prime · Eidolon · Vessel',
    chain: 'Circle ARC Mainnet · 5042',
  },
} satisfies DeepPartial<Dictionary>;

export default es;
