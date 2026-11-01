'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/language-switcher.tsx
// 全球多语言切换器 — 切换到目标语言的同路径 URL（/en/...），整页加载
// 确保 <html lang> 与服务端渲染文案随之改变
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LOCALES, type LocaleCode } from '@/lib/i18n/index';
import { localizePath, parseLocalizedPath } from '@/lib/i18n/routing';

const locales = Object.values(LOCALES);

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const i18n = useI18n();

  const locale = i18n.locale;
  const t = i18n.t;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchLocale = (code: LocaleCode) => {
    setOpen(false);
    i18n.setLocale(code);
    if (typeof window === 'undefined') return;
    // The URL is the source of truth: move to the same page under the new
    // prefix. A full document load is intended — zh and the other locales
    // live in different root layouts, so the <html lang> must be re-rendered.
    const { pathname, search, hash } = window.location;
    const target = `${localizePath(parseLocalizedPath(pathname).path, code)}${search}${hash}`;
    if (target !== `${pathname}${search}${hash}`) window.location.assign(target);
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
            {t('nav.selectLanguage')}
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
