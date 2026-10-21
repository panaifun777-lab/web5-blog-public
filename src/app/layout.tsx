import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Rum } from "@/components/web5/observability/rum";
import { CloudflareAnalytics } from "@/components/web5/observability/cloudflare-analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Static pages are revalidated every 5 minutes so the feed and provenance
// status do not get pinned in edge caches indefinitely.
export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog'),
  title: {
    default: 'Web5.blog · Vessel-Native Blog Platform',
    template: '%s | Web5.blog',
  },
  description:
    '分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构。AP2/ARP/AA2P 协议族 · ERC-4337 · 分布式存档与内容存证状态透明 · AI 分身流式写作。',
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
        description: 'Prime × Eidolon × Vessel 三层生命架构 — AP2/ARP/AA2P 协议族 · ERC-4337 · 分布式存档与内容存证状态透明 · AI 分身流式写作',
        author: { '@id': 'https://web5.blog/#person' },
        publisher: { '@id': 'https://web5.blog/#person' },
        mainEntityOfPage: 'https://web5.blog',
      },
    ],
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
        <Toaster />
        <Rum />
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
