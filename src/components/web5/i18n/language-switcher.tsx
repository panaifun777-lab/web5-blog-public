'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/language-switcher.tsx
// 全球多语言切换器 — 点击直接强制执行 window.location.reload()
// 确保 Cookie 与 localStorage 立即穿透全局，页面 100% 刷新重载并应用新语言
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LOCALES, type LocaleCode } from '@/lib/i18n/index';

const locales = Object.values(LOCALES);

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const i18n = useI18n();

  const locale = i18n.locale;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchLocale = (code: LocaleCode) => {
    try {
      localStorage.setItem('web5_locale', code);
      document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    i18n.setLocale(code);
    setOpen(false);
    // 强制全局刷新，确保所有服务端组件、静态文本与 DOM 节点 100% 重载为目标语言
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const current = locales.find((l) => l.code === locale) || locales[0];

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#aaa] hover:text-[#00FFCC] bg-white/[0.02] border border-white/[0.06] hover:border-[#00FFCC]/30 hover:bg-[#00FFCC]/05 transition-all"
        title={current.nativeLabel}
      >
        <Globe className="w-3.5 h-3.5 text-[#00FFCC]" />
        <span className="hidden sm:inline font-medium">{current.flag} {current.nativeLabel}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl z-[100] min-w-[160px] p-1.5 backdrop-blur-2xl">
          <div className="px-2 py-1 text-[9px] text-[#555] font-mono border-b border-white/[0.04] mb-1">
            SELECT LANGUAGE / 选择语言
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                  locale === l.code
                    ? 'text-[#00FFCC] bg-[#00FFCC]/10 font-bold'
                    : 'text-[#bbb] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  <span>{l.nativeLabel}</span>
                </div>
                {locale === l.code && <Check className="w-3.5 h-3.5 text-[#00FFCC]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
