// ════════════════════════════════════════════════════════════════
// src/components/web5/footer.tsx — 站底（合约地址、版权、社交）
// ════════════════════════════════════════════════════════════════

import { ExternalLink, Github, Twitter } from 'lucide-react';
import Link from 'next/link';

const ADDRS = {
  VesselAuth: '0xf17161a988d0ab6c98befde028856de9438bc23d',
  BudgetFence: '0x73ea340172572276357d2d5746270ef0296b4552',
  ContentNFT: '0x91e1d74af5bf714988b4eb9afd51e8354dec0879',
};

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
              全球首个分身原生博客平台。
            </div>
          </div>

          {/* Contracts */}
          <div>
            <div className="font-bold text-sm text-white mb-3">合约地址</div>
            <div className="space-y-1.5">
              {Object.entries(ADDRS).map(([name, addr]) => (
                <a
                  key={name}
                  href={`https://sepolia.basescan.org/address/${addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-mono text-[#555] hover:text-[#00FFCC] transition-colors"
                >
                  <span className="text-[#00FFCC]/60">{name}</span>
                  <span>{addr.slice(0, 10)}…{addr.slice(-6)}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="font-bold text-sm text-white mb-3">关注我们</div>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#00FFCC]/30 hover:text-[#00FFCC] transition-all text-[#555]"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center hover:border-[#00FFCC]/30 hover:text-[#00FFCC] transition-all text-[#555]"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />

        {/* Bottom row: copyright */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-[#444]">
          <span>© 2026 Web5.blog. Built with Prime × Eidolon × Vessel.</span>
          <span className="font-mono text-[#333]">0xW5::piaoshu</span>
        </div>
      </div>
    </footer>
  );
}
