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
    icon: '/favicon.ico',
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
    site: '@piaoshu1112',
    creator: '@piaoshu1112',
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
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSerifSC.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
