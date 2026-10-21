// ════════════════════════════════════════════════════════════════
// src/app/pod/[bountyId]/page.tsx
// Mobile Instant Pod 页面路由：适配移动端/Telegram 视口的极速领赏微容器
// ════════════════════════════════════════════════════════════════

import { Metadata } from 'next';
import { MobileInstantPod } from '@/components/web5/commerce/mobile-instant-pod';

interface PageProps {
  params: Promise<{
    bountyId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bountyId } = await params;
  return {
    title: `AP2 Mobile Instant Pod · 极速领赏微容器 (${bountyId}) | Web5.blog`,
    description: `输入一句话核心观点，AI分身秒级交稿并领取 Circle ARC 原生 USDC 赏金！支持 Telegram TMA 与 EIP-712 主钱包一键提现。`,
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    },
  };
}

export default async function PodPage({ params }: PageProps) {
  const { bountyId } = await params;
  return <MobileInstantPod bountyId={bountyId} />;
}
