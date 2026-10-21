'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/share/curate-share-button.tsx
// 原生 Web Share 一键裂变与策展返佣（Curate-to-Earn）按钮组件
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Share2, Check, Sparkles, Copy, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentVesselSession } from '@/lib/web5/vessel-auth';
import { useI18n } from '@/lib/i18n';
import type { VesselSession } from '@/lib/web5/types';

interface CurateShareButtonProps {
  arweaveHash: string;
  title: string;
  excerpt?: string;
  session?: VesselSession | null;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showBadge?: boolean;
}

export function CurateShareButton({
  arweaveHash,
  title,
  excerpt = '',
  session: propSession,
  className = '',
  variant = 'outline',
  size = 'sm',
  showBadge = true,
}: CurateShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [curatorId, setCuratorId] = useState<string>('');
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  useEffect(() => {
    // 优先使用传入的 session，其次从本地读取
    const s = propSession || getCurrentVesselSession();
    if (s) {
      const id = s.primeDid || s.vesselDid || s.eidolonDid || '';
      setCuratorId(id);
    } else {
      // 检查是否有专用钱包或连接的钱包
      try {
        const pk = localStorage.getItem('web5_vessel_wallet_pk');
        if (pk) {
          // 如果有专用钱包，可以作为 fallback 或留空
        }
      } catch {}
    }
  }, [propSession]);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止在卡片点击时触发跳转

    // 优先获取有效身份
    const activeSession = propSession || getCurrentVesselSession();
    const curRef = curatorId || activeSession?.primeDid || activeSession?.vesselDid || '';
    
    // 生成专属策展邀请链接：https://web5.blog/p/${arweaveHash}?ref=${userDidOrWallet}
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://web5.blog';
    const shareUrl = curRef
      ? `${origin}/p/${arweaveHash}?ref=${encodeURIComponent(curRef)}`
      : `${origin}/p/${arweaveHash}`;

    // 分享文案：不承诺永久存证与返佣
    const cleanTitle = title.replace(/\n+/g, ' ').trim();
    const shareText = isEn
      ? `📖 I found a long-form essay on Web5.blog: "${cleanTitle}". Storage and provenance status is as marked on the article. Curator rebates are in closed beta and not yet available.`
      : `📖 我在 Web5.blog 发现了一篇深度思想长文《${cleanTitle}》。存储与确权状态以文章标注为准。策展返佣规则内测中，暂未开放。`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: cleanTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // 用户主动取消分享时不报错，仅在非取消错误时降级
        if (err?.name === 'AbortError') {
          return;
        }
        console.warn('[WebShare] Fallback to clipboard:', err);
      }
    }

    // 平滑降级为复制剪贴板
    try {
      const fullCopyContent = `${shareText}\n${shareUrl}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullCopyContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullCopyContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('[WebShare] Copy failed:', err);
    }
  };

  if (variant === 'gradient') {
    return (
      <Button
        onClick={handleShare}
        size={size}
        className={`bg-gradient-to-r from-[#00FFCC] via-[#0066FF] to-[#B080E8] text-black font-bold hover:opacity-90 shadow-lg shadow-[#00FFCC]/20 transition-all ${className}`}
        title={isEn ? 'Generate your curator link (rebate rules in closed beta)' : '生成专属策展链接（返佣规则内测中）'}
      >
        {copied ? (
          <span className="flex items-center gap-1.5 text-black">
            <Check className="w-3.5 h-3.5" />
            <span>专属策展链接已复制！</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'Share · rebates in beta' : '一键分享 · 返佣内测中'}</span>
            {showBadge && (
              <span className="bg-black/80 text-[#00FFCC] text-[9px] px-1.5 py-0.2 rounded font-mono ml-1">
                Preview
              </span>
            )}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={`border-[#00FFCC]/30 hover:border-[#00FFCC] bg-[#00FFCC]/05 hover:bg-[#00FFCC]/15 text-[#00FFCC] text-xs font-mono transition-all ${className}`}
      title={isEn ? 'Generate a curator invite link (rebate rules in closed beta)' : '生成专属策展邀请链接（返佣规则内测中）'}
    >
      {copied ? (
        <span className="flex items-center gap-1.5 text-[#10B981]">
          <Check className="w-3.5 h-3.5" />
          <span>策展文案已复制</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          <span>策展分享</span>
          {showBadge && (
            <span className="text-[9px] px-1 rounded bg-[#00FFCC]/20 text-[#00FFCC] font-bold">
              {isEn ? 'Beta' : '返佣内测'}
            </span>
          )}
        </span>
      )}
    </Button>
  );
}
