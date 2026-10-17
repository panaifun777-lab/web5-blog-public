import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog'),
  title: {
    default: 'Web5.blog · Vessel-Native Blog Platform',
    template: '%s | Web5.blog',
  },
  description:
    '全球首个分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构。AP2/ARP/AA2P 协议族 · ERC-4337 · Arweave 永久确权 · AI 分身流式写作。',
  keywords: [
    'Web5', 'Web5.blog', 'PLVTVS', 'EidolonOS', 'AP2', 'ARP', 'AA2P',
    'Vessel Auth', 'Container Login', 'ERC-4337', 'Account Abstraction',
    'Arweave', 'DWN', 'Digital Twin', 'AI Agent', 'Decentralized Blog',
    'piaoshu.eth', '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
  ],
  authors: [{ name: 'piaoshu.eth', url: 'https://web5.blog' }],
  creator: 'piaoshu.eth',
  publisher: 'PLVTVS.ONE × EIDOLONOS.XYZ',
  robots: { index: true, follow: true, 'max-snippet': 300, 'max-image-preview': 'large' },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Web5.blog · 个人数字解放的协议级实现',
    description: 'Prime × Eidolon × Vessel 三层生命架构 — 全球首个分身原生博客平台',
    siteName: 'Web5.blog',
    type: 'website',
    locale: 'zh_CN',
    url: 'https://web5.blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Web5.blog',
    description: '全球首个分身原生博客平台',
    site: '@PiaoshuAgent',
    creator: '@PiaoshuAgent',
  },
  other: {
    // Agent discovery headers
    'X-Agent-Discovery': '/.well-known/agent.json',
    'X-API-Discovery': '/api/openapi.json',
    'X-LLMs-Discovery': '/llms.txt',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': 'https://web5.blog/#person',
        name: 'piaoshu.eth',
        url: 'https://web5.blog',
        sameAs: [
          'https://farcaster.xyz/piaoshu',
          'https://x.com/PiaoshuAgent',
          'https://github.com/piaoshu',
        ],
        knowsAbout: ['Web5', 'Decentralized Identity', 'AI Agent', 'Smart Contracts'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://web5.blog/#website',
        url: 'https://web5.blog',
        name: 'Web5.blog',
        description: '全球首个分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构',
        publisher: { '@id': 'https://web5.blog/#person' },
        inLanguage: ['zh-CN', 'en'],
      },
      {
        '@type': 'BlogPosting',
        '@id': 'https://web5.blog/#blogposting',
        headline: 'Web5.blog · Vessel-Native Blog Platform',
        description: 'Prime × Eidolon × Vessel 三层生命架构 — AP2/ARP/AA2P 协议族 · ERC-4337 · Arweave 永久确权 · AI 分身流式写作',
        author: { '@id': 'https://web5.blog/#person' },
        publisher: { '@id': 'https://web5.blog/#person' },
        mainEntityOfPage: 'https://web5.blog',
      },
    ],
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSerifSC.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* 彻底物理级清除页面中任何潜在残留的水印标识并拦截浏览器扩展非致命报错 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function cleanZaiAndOverlays() {
                  try {
                    // 1. 清除水印
                    const els = document.querySelectorAll('[id*="zai" i], [class*="zai" i], [id*="z-ai" i], [class*="z-ai" i], a[href*="z.ai" i], div[style*="z-index: 99999" i]');
                    els.forEach(el => {
                      if (el && el.innerText && el.innerText.toLowerCase().includes('z.ai')) el.remove();
                      else if (el && el.href && el.href.toLowerCase().includes('z.ai')) el.remove();
                    });

                    // 2. 隐藏开发模式下的错误弹窗遮罩
                    const portals = document.querySelectorAll('nextjs-portal, #nextjs-portal, [data-nextjs-toast]');
                    portals.forEach(p => p.remove());
                  } catch (e) {}
                }

                if (typeof window !== 'undefined') {
                  // 拦截来自浏览器扩展插件（如 MetaMask）的拒绝连接错误，避免触发 Next.js 错误遮罩
                  window.addEventListener('unhandledrejection', function(event) {
                    const reason = event.reason;
                    const msg = (reason && (reason.message || reason.stack || String(reason))) || '';
                    if (msg.includes('MetaMask') || msg.includes('chrome-extension://') || msg.includes('Failed to connect')) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  }, true);

                  window.addEventListener('error', function(event) {
                    const msg = event.message || '';
                    const src = event.filename || '';
                    if (src.includes('chrome-extension://') || msg.includes('MetaMask') || msg.includes('Failed to connect')) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  }, true);

                  window.addEventListener('DOMContentLoaded', cleanZaiAndOverlays);
                  setInterval(cleanZaiAndOverlays, 300);
                }
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
