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
    title: `AP2 Mobile Instant Pod · 内测交稿预览 (${bountyId}) | Web5.blog`,
    description: `内测预览：输入一句话核心观点即可提交 AI 分身交付草稿，提交进入内部审核；Circle ARC USDC 赏金与提现尚未开放。`,
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
