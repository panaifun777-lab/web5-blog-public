// ════════════════════════════════════════════════════════════════
// src/components/web5/footer.tsx — 站底（合约地址、版权、社交）
// ════════════════════════════════════════════════════════════════

import { ExternalLink, Github, Twitter, Send } from 'lucide-react';
import Link from 'next/link';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

const ADDRS = {
  '$WBOG Token': ARC_MAINNET.addresses.WBOG,
  ContentNFT: ARC_MAINNET.addresses.ContentNFT,
  BudgetFence: ARC_MAINNET.addresses.BudgetFence,
  VesselAuth: ARC_MAINNET.addresses.VesselAuth,
};

const SOURCE_URL = process.env.NEXT_PUBLIC_SOURCE_URL || '';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.04] bg-[#050508] px-6 py-10 mt-24">
      <div className="max-w-[1440px] mx-auto">
        {/* Top row: links */}
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Web5 */}
          <div>
            <div className="font-bold text-sm text-white mb-3">Web5.blog</div>
            <div className="text-[11px] text-[#555] leading-relaxed">
              Prime × Eidolon × Vessel 三层生命架构。
              <br />
              Circle ARC 稳定币原生公链首个分身博客平台。
            </div>
          </div>

          {/* Contracts */}
          <div>
            <div className="font-bold text-sm text-white mb-3">Arc Mainnet 合约</div>
            <div className="space-y-1.5">
              {Object.entries(ADDRS).map(([name, addr]) => (
                <a
                  key={name}
                  href={`https://explorer.arc.io/address/${addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-mono text-[#555] hover:text-[#00FFCC] transition-colors"
                >
                  <span className="text-[#00FFCC]/60">{name}</span>
                  <span>{addr.slice(0, 8)}…{addr.slice(-6)}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="font-bold text-sm text-white mb-3">关注我们</div>
            <div className="flex gap-3">
              {SOURCE_URL ? (
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GitHub 源码"
                  className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#00FFCC]/30 hover:text-[#00FFCC] transition-all text-[#555]"
                >
                  <Github className="w-4 h-4" />
                </a>
              ) : (
                <div
                  title="源码位于私有仓库，需授权后访问"
                  aria-label="源码位于私有仓库，需授权后访问"
                  className="w-8 h-8 rounded-lg border border-white/[0.04] flex items-center justify-center text-[#333] cursor-not-allowed"
                >
                  <Github className="w-4 h-4" />
                </div>
              )}
              <a
                href="https://x.com/PiaoshuAgent"
                target="_blank"
                rel="noopener noreferrer"
                title="Twitter / X (@PiaoshuAgent)"
                className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#00FFCC]/30 hover:text-[#00FFCC] transition-all text-[#555]"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://farcaster.xyz/piaoshu"
                target="_blank"
                rel="noopener noreferrer"
                title="Farcaster (@piaoshu)"
                className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#8A63D2]/50 hover:text-[#8A63D2] transition-all text-[#555]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 1000 1000">
                  <path d="M257.778 155.556h484.444v688.889h-72.222V367.778H330v476.667h-72.222V155.556zm-102.222 212.222h72.222v476.667h-72.222V367.778zm688.889 0h72.222v476.667h-72.222V367.778zM155.556 257.778h688.889v72.222H155.556v-72.222z"/>
                </svg>
              </a>
              <a
                href="https://t.me/Web5blog_bot"
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram 官方机器人"
                className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#00FFCC]/30 hover:text-[#00FFCC] transition-all text-[#555]"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />

        {/* Bottom row: copyright */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-[#444]">
          <span>© 2026 Web5.blog. Built with Prime × Eidolon × Vessel.</span>
          <Link href="/security" className="hover:text-[#00CC99] transition-colors">
            安全披露
          </Link>
          <span className="font-mono text-[#333]">0xW5::piaoshu</span>
        </div>
      </div>
    </footer>
  );
}
