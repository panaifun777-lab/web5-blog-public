// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/ko.ts — 한국어（PARTIAL → 201 키 완성）
//
// status: 'partial' (see src/lib/i18n/config.ts).
// Missing keys fall back per key to `en` at runtime.
// ════════════════════════════════════════════════════════════════

import type { DeepPartial } from '../types';
import type { Dictionary } from './zh-CN';

const ko = {
  layout: {
    titleDefault: 'Web5.blog · Vessel 네이티브 블로그 플랫폼',
    description:
      'Vessel 네이티브 블로그 플랫폼 — Prime × Eidolon × Vessel 3계층 라이프 아키텍처. AP2/ARP/AA2P 프로토콜군 · ERC-4337 · 투명한 출처 상태를 갖춘 분산 아카이빙 · AI Vessel 스트림 집필.',
    ogTitle: 'Web5.blog · 개인의 디지털 해방을 프로토콜 수준에서 구현',
    ogDescription:
      'Prime × Eidolon × Vessel 3계층 라이프 아키텍처 — 세상에서 첫 Vessel 네이티브 블로그 플랫폼',
    twitterDescription: '세상에서 첫 Vessel 네이티브 블로그 플랫폼',
    siteDescription:
      '세상에서 첫 Vessel 네이티브 블로그 플랫폼 — Prime × Eidolon × Vessel 3계층 라이프 아키텍처',
    blogDescription:
      'Prime × Eidolon × Vessel 3계층 라이프 아키텍처 — AP2/ARP/AA2P 프로토콜군 · ERC-4337 · 투명한 출처 상태를 갖춘 분산 아카이빙 · AI Vessel 스트림 집필',
  },
  app: {
    title: 'W · B · O · G',
    subtitle: 'Web5 블로그 온톨로지 게이트웨이',
    tagline1: '당신의 디지털 아바타',
    tagline2: '이제 주권적 블로그를 소유',
    description:
      'Prime × Eidolon × Vessel 삼위일체 아키텍처 · AI 자율 추론 · Circle ARC x402 마이크로페이먼트',
  },
  login: {
    vessel: 'Vessel 컨테이너 각성',
    vesselDesc:
      'AP2/AA2P 프로토콜 — 4단계 핸드셰이크로 아바타를 깨우고 최초 사용 시 고유의 영구 DID를 발급합니다',
    wallet: 'Web3 지갑 연결',
    walletDesc:
      'MetaMask / OKX / Web3 지갑 — 온체인 서명으로 컨테이너를 바인딩하고 전체 집필 권한을 해제',
    twitter: 'Twitter / X 로그인',
    twitterDesc: '원클릭 소셜 신원 바인딩 — OAuth 2.0',
  },
  modules: {
    tech: '기술 프론티어',
    humanity: '인문학',
    experts: 'AI 전문가',
    bounty: '바운티 & 태스크',
    crowd: '크라우드펀딩',
    piaoshu: 'AI 전문가',
    outsourcer: '바운티 & 태스크',
  },
  moduleDescs: {
    tech: {
      title: '기술 프론티어',
      desc: '최첨단 AI 모델, Web5 프로토콜, 스마트 컨트랙트, 주권적 디지털 아바타.',
    },
    humanities: {
      title: '인문 탐구',
      desc: '기술과 인간 정신의 교차점 — 탄소와 실리콘 지성의 대화.',
    },
    experts: {
      title: 'AI 전문가 챔버',
      desc: '4명의 전문 인지 에이전트에 직접 액세스하여 심층 연구와 유료 x402 상담이 가능.',
    },
    bounties: {
      title: '바운티 & 태스크 광장',
      desc: '태스크를 수행해 USDC를 획득하세요. 아바타는 스스로 진화하고, 정산은 에스크로와 72시간 분쟁 창구를 따르며, 지급은 기본적으로 꺼져 있습니다.',
    },
    crowdfunding: {
      title: '크라우드펀딩 & 인큐베이션',
      desc: '커뮤니티 주도의 창조적 자금 조달. 선구적인 실험을 후원하고 조기 생태계 권리를 얻으세요.',
    },
  },
  nav: {
    founder: '창립자 선언문',
    admin: '관리자 대시보드',
    api: 'API 스키마 (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
    search: '기사, 컨트랙트, DID 검색...',
    airdrop: '제네시스 1,000 $WBOG',
    airdropShort: '에어드롭',
    write: '집필',
    vesselBadgeTitle: '클릭하여 내 아바타 매트릭스 & 볼트 열기',
    logoutTitle: '이 세션에서 로그아웃',
    selectLanguage: '언어 선택',
    tabs: {
      vessels: '🧬 아바타 매트릭스',
      feed: '블로그 스트림',
      write: '✍️ AI 스트림 집필',
      explore: '🔍 탐색기 & 마켓',
      settings: '⚙️ 설정',
    },
  },
  footer: {
    tagline1: 'Prime × Eidolon × Vessel 3계층 라이프 아키텍처.',
    tagline2: 'Circle ARC 스테이블코인 네이티브 체인 위의 첫 Vessel 블로그 플랫폼.',
    contractsTitle: 'Arc Mainnet 컨트랙트',
    follow: '팔로우',
    github: 'GitHub 소스',
    privateRepo: '소스는 비공개 저장소에 있음 — 접근하려면 인가가 필요합니다',
    telegram: '공식 Telegram 봇',
    security: '보안 공개',
  },
  home: {
    moduleMatrixSuffix: '— Web5 엄선 매트릭스',
    composeInCategory: '✍️ 카테고리로 집필',
    trendingTag: '기술',
    sponsorCta: '+ 스폰서',
    sponsorTooltip: '스폰서 기사 — 클릭하여 열기',
    sponsoredLabel: '제공 · 편집 picks',
    trendingReadTitle: '클릭하여 전문 읽기',
    airdropTitle: '제네시스 에어드롭',
    airdropSlots: '1만 슬롯',
    perUser: '/ 사용자',
    airdropBody: '태스크 5개를 완료하여 토큰과 제네시스 NFT 배지를 받으세요. 클릭하여 진행 상황 확인 →',
    vaultTitle: '엔젤 볼트 3k 한도',
    vaultBadge: 'LP 잠금 카운트다운',
    vaultNote: '거래당 최대 20U · 한도에서 100% 잠금',
    matrixSuffix: '매트릭스',
    ontology: {
      web5: '궁극의 개인 주권 (DID + DWN)',
      blog: '심층 사유 말뭉치와 장기 추론',
      ontology: '디지털 온톨로지 × 의미 지식',
      gateway: 'Arc x402 에이전트 상거래 게이트웨이',
    },
    uniswap: {
      title: 'Uniswap v4 가격 참고',
      unit: '$WBOG 단가(샘플):',
      rate: '샘플 레이트: 1 USDC = 12,500 WBOG',
      static: '○ 정적 샘플 가격 · 라이브 피드 없음',
      position: 'LP 포지션 보기',
      trade: 'Uniswap에서 거래',
    },
    wallet: {
      addToken: 'Web3 지갑에 $WBOG 추가',
      addTokenFailed: '토큰 추가가 취소되거나 실패했습니다: {message}',
      installWallet: '먼저 MetaMask / OKX Web3 지갑 확장을 설치하세요.',
    },
    hero: {
      brandSub: '온톨로지 검증 · 인지 매트릭스 · 에이전트 게이트웨이',
      writeOnce: '한 번 쓰면, ',
      archive: '장기 아카이브.',
      readable: '인간과 AI 모두 읽을 수 있음 · 투명한 출처',
      intro:
        '분산 스토리지(Arweave 출처는 확정 시 한 번 라벨링)와 Circle ARC USDC 정산 레일 위에 구축. 모든 에세이는 저장 및 출처 상태를 공개하고, 외부 AI가 발견할 수 있으며, 투명한 수익 규칙을 따릅니다. 실제 팁과 정산은 여전히 클로즈드 베타 — 아직 결제를 받지 않습니다.',
      ctaRead: '📖 엄선 기사 읽기',
      ctaBounty: '🎯 바운티 광장 (미리보기)',
      ctaWrite: '✍️ AI 집필 시작',
      ctaAgent: '🤖 Agent API',
      airdropTitle: '제네시스 $WBOG 에어드롭 미리보기',
      notOpen: '미개방',
      airdropBody: '예정 배분 · 청구는 미개방 · 자금을 보내지 마세요',
      vaultTitle: 'GenesisCurve 엔젤 볼트 (미리보기)',
      vaultBody: '구독과 커스디는 미개방 · 자금을 보내지 마세요',
      backToLogin: '로그인 방법으로 돌아가기',
      loginBusy: '처리 중 — 방금 열린 지갑 창에서 확인하세요…',
    },
    error: {
      vesselAwakenFailed: 'Vessel 각성 실패: {message}',
      retry: '다시 시도하세요',
      noWallet:
        '브라우저 지갑을 찾을 수 없습니다. MetaMask / OKX Web3 확장을 설치하거나(또는 그 내장 브라우저에서 이 페이지를 여세요), "Vessel 컨테이너 각성"을 사용해 지갑 없이 계속하세요.',
      noAccount: '지갑이 계정 주소를 반환하지 않았습니다',
      loginFailed: '지갑 로그인 실패, 다시 시도하세요',
      loginFailedDetail: '지갑 로그인 실패: {message}',
      signRejected: '서명이 취소되었습니다 — 로그인이 완료되지 않았습니다.',
      confirmSignature: '지갑에서 서명을 확인하고 다시 시도하세요',
      timeout: '{label} 시간 초과({seconds}초) — 지갑 확장 또는 네트워크를 확인하고 다시 시도하세요',
      step: {
        readChain: '지갑 네트워크 읽는 중',
        switchChain: 'Arc 네트워크로 전환 중',
        addChain: 'Arc 네트워크 추가 중',
        waitAuth: '지갑 인가 대기 중',
        waitSign: '지갑 서명 대기 중',
        verify: '서버에서 서명 검증 중',
      },
    },
  },
  article: {
    backHome: '사이트로 돌아가기',
    brandSub: 'Vessel 네이티브 블로그',
    gatewayTitle: 'Irys 게이트웨이에서 원시 JSON 확인',
    permaweb: '퍼마웹 게이트웨이',
    dbOnly: '데이터베이스 레코드 · 온체인 아님',
    writeToo: '✍️ 당신도 집필',
    authorVerified: '● 인증된 저자',
    royalty: '로열티: {rate}% · {license}',
    provenanceTitle: '저장 & 출처 상태',
    hashLabel: '콘텐츠 해시: ',
    linkLabel: '영구링크: ',
    vcLabel: '플랫폼 VC ID: ',
    nftStatusLabel: 'NFT 상태: ',
    nftFailed: '민팅 실패 — 데이터베이스 레코드만',
    nftNotMinted: '민팅 안 됨 — 데이터베이스 레코드만',
    curateTitle: '큐레이트 & 공유',
    curateBadge: '로열티 미가동',
    curateBody:
      '장문 에세이를 원클릭으로 공유하세요. 큐레이터 수수료 규칙과 자동 정산은 아직 가동되지 않았습니다 — 클로즈드 베타 중에는 수익이 발생하지 않습니다.',
    tipTitle: '저자 후원 · AP2 팁',
    tipBadge: '베타 미리보기 — 자금을 보내지 마세요',
    tipNote: '팁은 플랫폼 국고로 — 저자 지급은 아직 자동화되지 않았습니다',
    tipClosed: '에스크로 검증과 자동 분할이 본가동될 때까지 팁은 닫혀 있습니다.',
    readOnSite: '메인 사이트에서 읽고 댓글 달기',
    arenaTitle: 'AA2P 인지 아레나 · 토론 & 피어 리뷰',
    arenaCta: '⚔️ 메인 사이트에서 리뷰 참여',
    arenaNote:
      '댓글은 실제 등록 사용자에게서 옵니다. 클로즈드 베타 중에는 스테이킹이나 바운티 자금이 관여하지 않습니다.',
    noComments: '아직 댓글이 없습니다.',
    humanCreator: '👤 인간 창작자',
    agentReviewer: '🤖 리뷰 에이전트',
  },
  stats: {
    activated: '활성화됨',
    vessels: '아바타',
    articles: '기사',
    conversion: 'Observer → Vessel 전환율',
  },
  common: {
    loading: '불러오는 중...',
    error: '오류 발생',
    retry: '다시 시도',
    back: '뒤로',
    comingSoon: '곧 공개',
  },
  founder: {
    title: '창립자 선언문',
    architect: '디지털 온톨로지의 건축가',
    manifesto1: '인터넷의 역사는 본질적으로 인류가 "연결 대상"과 "가치 분배"를 끊임없이 재구성해 온 역사입니다.',
    manifesto2:
      '웹 페이지에서 사람으로, 자산으로, 자율 에이전트로 — 모든 패러다임 전환은 생산성의 폭발적 향상과 생산 관계의 재편을 가져왔습니다.',
    closing: '모든 개인이 자신의 디지털 아바타를 갖게 될 때, 진정한 자유는 막 시작된 것입니다.',
  },
  task: {
    eyebrow: 'AP2 바운티 태스크',
    backHome: '사이트로 돌아가기',
    breadcrumbHome: '홈',
    notFoundTitle: '태스크를 찾을 수 없음',
    metaTitle: '{title} · {amount} USDC 바운티',
    metaDescription: '{amount} USDC · {status} · {excerpt}',
    schemaDescription: '{amount} USDC 바운티 · 상태 {status} · 오더 {orderId}. {description}',
    statusFunded: '자금 투입됨 · 수락 대기',
    statusAssigned: '수락됨 · 진행 중',
    statusSubmitted: '납품됨 · 수령 대기',
    statusVerified: '수령됨 · 정산 대기',
    statusRejected: '수령 거부',
    statusDisputed: '분쟁 중',
    statusSettling: '정산 중',
    statusSettled: '정산됨',
    statusRefunding: '환불 중',
    statusRefunded: '환불됨',
    bountyLabel: '바운티',
    creatorLabel: '생성자 DID',
    createdLabel: '게시일',
    agentLabel: '할당 에이전트 DID',
    unassigned: '아직 수락되지 않음',
    descriptionLabel: '태스크 요강 & 납품 요건',
    descriptionEmpty: '생성자가 추가 요강을 달지 않았습니다.',
    evidenceTitle: '온체인 에스크로 & 출처 증거',
    escrowTx: '에스크로 트랜잭션 (escrowTxHash)',
    payoutTx: '지급 트랜잭션 (payoutTxHash)',
    feeTx: '프로토콜 수수료 트랜잭션 (feeTxHash)',
    refundTx: '환불 트랜잭션 (refundTxHash)',
    deliverableLabel: '납품 영구 아카이브',
    gatewayTitle: 'Irys 게이트웨이에서 원본 확인',
    noDeliverable: '아직 납품되지 않았거나 영구 아카이브되지 않았습니다.',
    noEscrow: '이 오더의 확인된 온체인 에스크로 트랜잭션이 없습니다.',
    splitTitle: '80/20 정산 규칙',
    splitBody:
      '수령 후 80%는 납품한 에이전트에게, 20%는 프로토콜 수수료로. PLATFORM_FEE_ADDRESS가 없으면 수수료는 국고에 유보됩니다(RETAINED, 이전 없음).',
    settlementNote:
      '클로즈드 베타: 에스크로 검증과 자동 환불은 완전히 가동되지 않았습니다. 이 페이지의 금액은 지불 제안이 아니며 고용이나 노동 관계를 생성하지 않습니다.',
    relatedTitle: '그 외 공개 중인 바운티',
    relatedNote: '최신순 · 5분마다 갱신',
    relatedEmpty: '현재 수락 가능한 바운티가 없습니다.',
    apiHint: '기계 판독 목록:',
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

export default ko;
