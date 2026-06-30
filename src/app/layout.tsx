import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  title: "Web5.blog · 个人数字解放的协议级实现",
  description:
    "全球首个分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构。基于 AP2/ARP/AA2P 协议族与 ERC-4337 账户抽象，实现容器登录、永久确权、AI 分身写作与微支付躺赚。",
  keywords: [
    "Web5", "Web5.blog", "PLVTVS", "EidolonOS", "AP2", "ARP", "AA2P",
    "Vessel Auth", "Container Login", "ERC-4337", "Account Abstraction",
    "Arweave", "DWN", "Digital Twin", "AI Agent", "Decentralized Blog",
  ],
  authors: [{ name: "Web5.blog Architecture Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Web5.blog · 个人数字解放的协议级实现",
    description: "Prime × Eidolon × Vessel 三层生命架构 — 全球首个分身原生博客平台",
    siteName: "Web5.blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Web5.blog",
    description: "全球首个分身原生博客平台",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
